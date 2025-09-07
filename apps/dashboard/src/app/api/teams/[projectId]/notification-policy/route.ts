import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { teamNotificationService } from '@/lib/notifications/team-notification-service';
import { prisma } from '@/lib/database';

// GET - Get team notification policy
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

    // Get notification policy
    const policy = await teamNotificationService.getTeamNotificationPolicy(projectId);

    return NextResponse.json(policy);
  } catch (error: any) {
    console.error('Error fetching notification policy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notification policy' },
      { status: 500 }
    );
  }
}

// PUT - Update team notification policy
export async function PUT(
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

    // Get user and check permissions
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

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to update notification policy' },
        { status: 403 }
      );
    }

    // Update policy
    const updatedPolicy = await teamNotificationService.updateTeamNotificationPolicy(
      projectId,
      body
    );

    return NextResponse.json(updatedPolicy);
  } catch (error: any) {
    console.error('Error updating notification policy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notification policy' },
      { status: 500 }
    );
  }
}

// DELETE - Clear old notifications (admin only)
export async function DELETE(
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
    const searchParams = request.nextUrl.searchParams;
    const olderThanDays = parseInt(searchParams.get('olderThanDays') || '30');

    // Get user and check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete old notifications
    await teamNotificationService.deleteTeamNotifications(
      projectId,
      user.id,
      olderThanDays
    );

    return NextResponse.json({
      success: true,
      message: `Deleted notifications older than ${olderThanDays} days`,
    });
  } catch (error: any) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}