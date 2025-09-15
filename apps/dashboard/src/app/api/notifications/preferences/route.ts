import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

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

    // Direct Prisma query to avoid dependency issues
    const preferences = await prisma.notificationPreference.findUnique({
      where: { userId: session.user.id },
    }).catch(() => null);

    return NextResponse.json({
      preferences: preferences || {
        enabled: true,
        emailEnabled: true,
        pushEnabled: false,
        inAppEnabled: true,
        smsEnabled: false,
        taskAssigned: true,
        taskStatusChanged: true,
        taskCommented: true,
        taskMentioned: true,
        taskDeadlines: true,
        projectUpdates: true,
        syncNotifications: true,
        systemAnnouncements: true,
        securityAlerts: true,
        quietHoursEnabled: false,
        quietHoursStart: null,
        quietHoursEnd: null,
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

    const preferences = await request.json();

    // Direct Prisma upsert to avoid dependency issues
    const updatedPreferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: preferences,
      create: {
        userId: session.user.id,
        ...preferences
      }
    });

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