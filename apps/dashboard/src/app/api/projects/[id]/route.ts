import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tasks: true,
            members: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if project exists
    const project = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete all related data in order
    // 1. Delete all team notifications
    await prisma.teamNotification.deleteMany({
      where: { projectId: params.id },
    });

    // 2. Delete all tasks
    await prisma.task.deleteMany({
      where: { projectId: params.id },
    });

    // 3. Delete all project members
    await prisma.projectMember.deleteMany({
      where: { projectId: params.id },
    });

    // 4. Delete all sync history
    await prisma.syncHistory.deleteMany({
      where: { projectId: params.id },
    });

    // 5. Finally, delete the project
    await prisma.project.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ 
      success: true,
      message: 'Project deleted successfully',
      deletedItems: {
        tasks: project._count.tasks,
        members: project._count.members,
      }
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}