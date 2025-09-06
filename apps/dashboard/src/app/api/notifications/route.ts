import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const unreadOnly = searchParams.get('unread') === 'true';

    if (unreadOnly) {
      const notifications = await notificationService.getUnreadNotifications(session.user.id);
      return NextResponse.json({
        notifications,
        total: notifications.length,
        pages: 1,
        currentPage: 1,
      });
    }

    const result = await notificationService.getUserNotifications(
      session.user.id,
      page,
      limit
    );

    return NextResponse.json({
      ...result,
      currentPage: page,
    });
  } catch (error: any) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' }, 
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json()
    const { type, title, message, priority = 'MEDIUM', metadata } = body

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: type, title, message' },
        { status: 400 }
      );
    }

    const notification = await notificationService.createNotification(
      session.user.id,
      type,
      title,
      message,
      priority,
      metadata
    );

    return NextResponse.json({ 
      success: true,
      notification 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating notification:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create notification' }, 
      { status: 500 }
    );
  }
}

// PUT /api/notifications - Bulk operations  
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'mark_all_read':
        await notificationService.markAllAsRead(session.user.id);
        return NextResponse.json({ 
          success: true,
          message: 'All notifications marked as read' 
        });

      case 'clear_all':
        await notificationService.clearAllNotifications(session.user.id);
        return NextResponse.json({ 
          success: true,
          message: 'All notifications cleared' 
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: mark_all_read, clear_all' }, 
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to perform operation' }, 
      { status: 500 }
    );
  }
}