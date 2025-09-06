import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications/preferences - Get user notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await notificationService.getUserPreferences(session.user.id);

    return NextResponse.json({ 
      preferences: preferences || {
        enabled: true,
        inApp: true,
        email: false,
        push: false,
        sms: false,
        slack: false,
        discord: false,
        mobileApp: false,
        quietHoursEnabled: false,
        notificationTypes: {},
        soundEnabled: true,
        vibrationEnabled: true,
      }
    });
  } catch (error: any) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch preferences' }, 
      { status: 500 }
    );
  }
}

// PUT /api/notifications/preferences - Update user notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await request.json()

    const updatedPreferences = await notificationService.updatePreferences(
      session.user.id,
      preferences
    );

    return NextResponse.json({ 
      success: true,
      preferences: updatedPreferences,
      message: 'Preferences updated successfully'
    });
  } catch (error: any) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update preferences' }, 
      { status: 500 }
    );
  }
}