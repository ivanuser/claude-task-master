import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

// PATCH /api/notifications/[id] - Mark notification as read or update
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notificationId = params.id
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'mark_read':
        const notification = await notificationService.markAsRead(notificationId);
        return NextResponse.json({ 
          success: true,
          message: 'Notification marked as read',
          notification
        });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Error updating notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update notification' }, 
      { status: 500 }
    );
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const notificationId = params.id
    await notificationService.deleteNotification(notificationId);
    
    return NextResponse.json({ 
      success: true,
      message: 'Notification deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to delete notification' }, 
      { status: 500 }
    );
  }
}