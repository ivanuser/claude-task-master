import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { teamNotificationService } from '@/lib/notifications/team-notification-service';
import { prisma } from '@/lib/database';

// PATCH - Bulk update notifications (mark as read)
export async function PATCH(
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

    const { id } = params;
    const body = await request.json();
    const { action } = body;

    if (action !== 'mark-read') {
      return NextResponse.json(
        { error: 'Invalid action. Only "mark-read" is supported' },
        { status: 400 }
      );
    }

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

    // Mark all team notifications as read
    await teamNotificationService.markTeamNotificationsAsRead(
      projectId,
      user.id
    );

    return NextResponse.json({
      success: true,
      message: 'All team notifications marked as read',
    });
  } catch (error: any) {
    console.error('Error in bulk notification update:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}