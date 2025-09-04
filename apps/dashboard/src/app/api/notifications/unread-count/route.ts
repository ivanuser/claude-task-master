import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceSimple as NotificationService } from '@/lib/services/notification.service.simple'

// GET /api/notifications/unread-count - Get unread notification count
export async function GET(request: NextRequest) {
  try {
    // In a real app, get userId from auth
    const userId = '1' // Mock user ID

    const unreadCount = await NotificationService.getUnreadCount(userId)

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Failed to fetch unread count' }, { status: 500 })
  }
}