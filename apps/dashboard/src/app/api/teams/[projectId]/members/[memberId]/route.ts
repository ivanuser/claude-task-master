import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { teamNotificationService } from '@/lib/notifications/team-notification-service';
import { ProjectRole } from '../../../../../../types/prisma-enums';

// PATCH - Update member role
export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId, memberId } = params;
    const body = await request.json();
    const { role } = body;

    if (!role) {
      return NextResponse.json(
        { error: 'Role is required' },
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
        { error: 'Insufficient permissions to update member roles' },
        { status: 403 }
      );
    }

    // Get the member to update
    const memberToUpdate = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId,
        },
      },
    });

    if (!memberToUpdate) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Can't change owner role unless you're the owner
    if (memberToUpdate.role === 'OWNER' && currentMember.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the owner can change the owner role' },
        { status: 403 }
      );
    }

    // Can't demote yourself if you're the only admin/owner
    if (memberToUpdate.userId === currentUser.id) {
      const adminCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (adminCount === 1 && role === 'MEMBER') {
        return NextResponse.json(
          { error: 'Cannot demote the last admin/owner' },
          { status: 400 }
        );
      }
    }

    const oldRole = memberToUpdate.role;

    // Update member role
    const updatedMember = await prisma.projectMember.update({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId,
        },
      },
      data: {
        role: role as ProjectRole,
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
    await teamNotificationService.notifyRoleChanged(
      projectId,
      memberId,
      oldRole as ProjectRole,
      role as ProjectRole,
      currentUser.id
    );

    return NextResponse.json(updatedMember);
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update member role' },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; memberId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId, memberId } = params;

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

    if (!currentMember) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Users can remove themselves, or admins/owners can remove others
    const canRemove = memberId === currentUser.id || 
                     ['OWNER', 'ADMIN'].includes(currentMember.role);

    if (!canRemove) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove member' },
        { status: 403 }
      );
    }

    // Get the member to remove
    const memberToRemove = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId,
        },
      },
    });

    if (!memberToRemove) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    // Can't remove the owner unless they're removing themselves
    if (memberToRemove.role === 'OWNER' && memberId !== currentUser.id) {
      return NextResponse.json(
        { error: 'Cannot remove the project owner' },
        { status: 403 }
      );
    }

    // Can't remove yourself if you're the last admin/owner
    if (memberId === currentUser.id && ['OWNER', 'ADMIN'].includes(currentMember.role)) {
      const adminCount = await prisma.projectMember.count({
        where: {
          projectId,
          role: { in: ['OWNER', 'ADMIN'] },
        },
      });

      if (adminCount === 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last admin/owner' },
          { status: 400 }
        );
      }
    }

    // Remove member
    await prisma.projectMember.delete({
      where: {
        userId_projectId: {
          userId: memberId,
          projectId,
        },
      },
    });

    // Send notifications
    await teamNotificationService.notifyMemberRemoved(
      projectId,
      memberId,
      currentUser.id
    );

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing member:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove member' },
      { status: 500 }
    );
  }
}