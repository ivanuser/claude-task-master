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

    const rawPreferences = await request.json();

    // Map frontend preferences to database schema - ONLY include valid DB fields
    const preferences = {
      enabled: rawPreferences.enabled ?? true,
      emailEnabled: rawPreferences.email ?? rawPreferences.emailEnabled ?? false,
      pushEnabled: rawPreferences.push ?? rawPreferences.pushEnabled ?? false,
      inAppEnabled: rawPreferences.inApp ?? rawPreferences.inAppEnabled ?? true,
      smsEnabled: rawPreferences.sms ?? rawPreferences.smsEnabled ?? false,
      taskAssigned: rawPreferences.notificationTypes?.TASK_ASSIGNED ?? rawPreferences.taskAssigned ?? true,
      taskStatusChanged: rawPreferences.notificationTypes?.TASK_UPDATED ?? rawPreferences.taskStatusChanged ?? true,
      taskCommented: rawPreferences.taskCommented ?? true,
      taskMentioned: rawPreferences.taskMentioned ?? true,
      taskDeadlines: rawPreferences.taskDeadlines ?? true,
      projectUpdates: rawPreferences.projectUpdates ?? true,
      syncNotifications: rawPreferences.notificationTypes?.SYNC_COMPLETED ?? rawPreferences.syncNotifications ?? true,
      systemAnnouncements: rawPreferences.notificationTypes?.SYSTEM_NOTIFICATION ?? rawPreferences.systemAnnouncements ?? true,
      securityAlerts: rawPreferences.securityAlerts ?? true,
      quietHoursEnabled: rawPreferences.quietHoursEnabled ?? false,
      quietHoursStart: rawPreferences.quietHoursStart,
      quietHoursEnd: rawPreferences.quietHoursEnd,
      quietHoursTimezone: rawPreferences.quietHoursTimezone || 'UTC',
      soundEnabled: rawPreferences.soundEnabled ?? true,
      soundVolume: rawPreferences.soundVolume || 50,
      vibrationEnabled: rawPreferences.vibrationEnabled ?? true,
      desktopBadge: rawPreferences.desktopBadge ?? true,
      batchingEnabled: rawPreferences.batchingEnabled ?? false,
      batchingInterval: rawPreferences.batchingInterval || 300,
    };

    // Filter out any undefined values
    const cleanPreferences = Object.fromEntries(
      Object.entries(preferences).filter(([_, value]) => value !== undefined)
    );

    // Direct Prisma upsert to avoid dependency issues
    const updatedPreferences = await prisma.notificationPreference.upsert({
      where: { userId: session.user.id },
      update: cleanPreferences,
      create: {
        userId: session.user.id,
        ...cleanPreferences
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