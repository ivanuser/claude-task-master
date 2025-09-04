import { NextRequest, NextResponse } from 'next/server'
import { NotificationServiceSimple as NotificationService } from '@/lib/services/notification.service.simple'

// GET /api/notifications/stats - Get notification statistics
export async function GET(request: NextRequest) {
  try {
    // In a real app, get userId from auth
    const userId = '1' // Mock user ID

    const stats = await NotificationService.getNotificationStats(userId)

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json({ error: 'Failed to fetch notification stats' }, { status: 500 })
  }
}