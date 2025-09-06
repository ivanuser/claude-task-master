import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const unreadNotifications = await notificationService.getUnreadNotifications(session.user.id);
    const unreadCount = unreadNotifications.length;

    return NextResponse.json({ unreadCount });
  } catch (error: any) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch unread count' }, 
      { status: 500 }
    );
  }
}