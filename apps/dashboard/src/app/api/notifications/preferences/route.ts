import { NextRequest, NextResponse } from 'next/server'
import { NotificationPreferences } from '@/types/team'

// Mock notification preferences data - in a real app, this would come from database
const mockPreferences: Record<string, NotificationPreferences> = {
  '1': {
    taskAssigned: true,
    taskUpdated: true,
    taskComment: true,
    taskDue: true,
    teamUpdates: true,
    weeklyReport: true,
    emailDigest: 'daily',
    pushEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
    },
  },
}

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    // In a real app, get userId from auth
    const userId = '1' // Mock user ID

    const preferences = mockPreferences[userId] || {
      taskAssigned: true,
      taskUpdated: true,
      taskComment: true,
      taskDue: true,
      teamUpdates: true,
      weeklyReport: true,
      emailDigest: 'daily' as const,
      pushEnabled: true,
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    // In a real app, get userId from auth
    const userId = '1' // Mock user ID
    const preferences: NotificationPreferences = await request.json()

    // Validate preferences
    const validDigestOptions = ['instant', 'daily', 'weekly', 'never']
    if (!validDigestOptions.includes(preferences.emailDigest)) {
      return NextResponse.json(
        { error: 'Invalid emailDigest value' },
        { status: 400 }
      )
    }

    // Save preferences (in a real app, save to database)
    mockPreferences[userId] = preferences

    return NextResponse.json({ 
      preferences,
      message: 'Preferences updated successfully'
    })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })
  }
}