import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceSimple as NotificationService } from '@/lib/services/notification.service.simple'
import { NotificationType } from '@/types/team'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    const type = searchParams.get('type') as NotificationType | null

    // In a real app, get userId from auth
    const userId = '1' // Mock user ID

    const notifications = await NotificationService.getUserNotifications(userId, {
      unreadOnly,
      limit,
      offset,
      type: type || undefined,
    })

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// POST /api/notifications - Create a new notification (admin/system use)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, teamId, type, title, message, data, actionUrl, actionLabel, expiresIn } = body

    const notification = await NotificationService.createNotification({
      userId,
      teamId,
      type,
      title,
      message,
      data,
      actionUrl,
      actionLabel,
      expiresIn,
    })

    // WebSocket notifications would be implemented here in production
    // Skipping due to Node.js module import issues in development

    return NextResponse.json({ notification }, { status: 201 })
  } catch (error) {
    console.error('Error creating notification:', error)
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
  }
}

// PATCH /api/notifications - Bulk operations
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, userId } = body

    // In a real app, get userId from auth
    const currentUserId = '1' // Mock user ID

    switch (action) {
      case 'mark_all_read':
        await NotificationService.markAllAsRead(currentUserId)
        return NextResponse.json({ message: 'All notifications marked as read' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error performing bulk operation:', error)
    return NextResponse.json({ error: 'Failed to perform operation' }, { status: 500 })
  }
}