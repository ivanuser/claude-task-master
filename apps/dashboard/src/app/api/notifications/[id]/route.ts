import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceSimple as NotificationService } from '@/lib/services/notification.service.simple'

// PATCH /api/notifications/[id] - Mark notification as read or update
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'mark_read':
        await NotificationService.markAsRead(notificationId)
        return NextResponse.json({ message: 'Notification marked as read' })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating notification:', error)
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 })
  }
}

// DELETE /api/notifications/[id] - Delete notification
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id
    await NotificationService.deleteNotification(notificationId)
    
    return NextResponse.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    console.error('Error deleting notification:', error)
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 })
  }
}