import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

// POST /api/notifications/test-push - Send a test push notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    // Create a test notification
    const notification = await notificationService.createNotification(
      userId,
      'SYSTEM_NOTIFICATION',
      'Test Push Notification',
      'This is a test push notification from Task Master. If you received this, push notifications are working correctly!',
      'LOW',
      {
        testNotification: true,
        timestamp: new Date().toISOString()
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Test notification sent',
      notificationId: notification.id
    });

  } catch (error) {
    console.error('Error sending test push notification:', error);
    return NextResponse.json({ 
      error: 'Failed to send test notification',
      details: (error as Error).message 
    }, { status: 500 });
  }
}