import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { teamNotificationService } from '@/lib/notifications/team-notification-service';
import { ProjectRole } from '../../../../../types/prisma-enums';

// GET - Get project members
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = params;

    // Check if user is a member of the project
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get all project members
    const members = await prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: [
        { role: 'asc' },
        { joinedAt: 'asc' },
      ],
    });

    return NextResponse.json(members);
  } catch (error: any) {
    console.error('Error fetching project members:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project members' },
      { status: 500 }
    );
  }
}

// POST - Add new member to project
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = params;
    const body = await request.json();
    const { email, role = 'MEMBER' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: currentUser.id,
          projectId,
        },
      },
    });

    if (!currentMember || !['OWNER', 'ADMIN'].includes(currentMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to add members' },
        { status: 403 }
      );
    }

    // Find or create the user to add
    let newUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!newUser) {
      // Create a placeholder user if they don't exist
      newUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0],
        },
      });
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: newUser.id,
          projectId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: 'User is already a member of this project' },
        { status: 400 }
      );
    }

    // Add member
    const newMember = await prisma.projectMember.create({
      data: {
        userId: newUser.id,
        projectId,
        role: role as ProjectRole,
        joinedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Send notifications
    await teamNotificationService.notifyMemberAdded(
      projectId,
      newUser.id,
      currentUser.id
    );

    return NextResponse.json(newMember);
  } catch (error: any) {
    console.error('Error adding project member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to add project member' },
      { status: 500 }
    );
  }
}