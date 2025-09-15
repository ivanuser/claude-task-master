import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

// GET /api/user/notification-preferences - Get user's notification preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's notification preferences
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        notificationPreference: true,
        emailPreferences: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return combined preferences
    const preferences = {
      channels: {
        email: user.notificationPreference?.emailEnabled ?? true,
        push: user.notificationPreference?.pushEnabled ?? true,
        inApp: user.notificationPreference?.inAppEnabled ?? true,
      },
      types: {
        taskAssigned: user.emailPreferences?.taskAssigned ?? true,
        taskCompleted: user.emailPreferences?.taskUpdated ?? true,
        taskCommented: user.emailPreferences?.taskComment ?? true,
        taskDue: user.emailPreferences?.taskDue ?? true,
        teamInvite: user.emailPreferences?.teamUpdates ?? true,
        systemAlerts: user.notificationPreference?.enabled ?? true,
      },
      quietHours: {
        enabled: user.notificationPreference?.quietHoursEnabled ?? false,
        start: user.notificationPreference?.quietHoursStart ?? '22:00',
        end: user.notificationPreference?.quietHoursEnd ?? '08:00',
      },
      emailDigest: {
        enabled: user.emailPreferences?.weeklyReport ?? false,
        frequency: user.emailPreferences?.emailDigest ?? 'DAILY',
        time: '09:00',
      }
    };

    return NextResponse.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    );
  }
}

// PUT /api/user/notification-preferences - Update user's notification preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { channels, types, quietHours, emailDigest } = body;

    // Update notification preferences
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        notificationPreference: {
          upsert: {
            create: {
              enabled: true,
              emailEnabled: channels?.email ?? true,
              pushEnabled: channels?.push ?? true,
              inAppEnabled: channels?.inApp ?? true,
              smsEnabled: false,
              quietHoursEnabled: quietHours?.enabled ?? false,
              quietHoursStart: quietHours?.start ?? '22:00',
              quietHoursEnd: quietHours?.end ?? '08:00',
            },
            update: {
              emailEnabled: channels?.email ?? true,
              pushEnabled: channels?.push ?? true,
              inAppEnabled: channels?.inApp ?? true,
              quietHoursEnabled: quietHours?.enabled ?? false,
              quietHoursStart: quietHours?.start ?? '22:00',
              quietHoursEnd: quietHours?.end ?? '08:00',
            }
          }
        },
        emailPreferences: {
          upsert: {
            create: {
              taskAssigned: types?.taskAssigned ?? true,
              taskUpdated: types?.taskCompleted ?? true,
              taskComment: types?.taskCommented ?? true,
              taskDue: types?.taskDue ?? true,
              teamUpdates: types?.teamInvite ?? true,
              weeklyReport: emailDigest?.enabled ?? false,
              monthlyDigest: false,
              emailDigest: (emailDigest?.frequency ?? 'DAILY') as any,
              unsubscribeToken: generateUnsubscribeToken(),
            },
            update: {
              taskAssigned: types?.taskAssigned ?? true,
              taskUpdated: types?.taskCompleted ?? true,
              taskComment: types?.taskCommented ?? true,
              taskDue: types?.taskDue ?? true,
              teamUpdates: types?.teamInvite ?? true,
              weeklyReport: emailDigest?.enabled ?? false,
              emailDigest: (emailDigest?.frequency ?? 'DAILY') as any,
            }
          }
        }
      },
      include: {
        notificationPreference: true,
        emailPreferences: true,
      }
    });

    // Return updated preferences in the same format
    const preferences = {
      channels: {
        email: updatedUser.notificationPreference?.emailEnabled ?? true,
        push: updatedUser.notificationPreference?.pushEnabled ?? true,
        inApp: updatedUser.notificationPreference?.inAppEnabled ?? true,
      },
      types: {
        taskAssigned: updatedUser.emailPreferences?.taskAssigned ?? true,
        taskCompleted: updatedUser.emailPreferences?.taskUpdated ?? true,
        taskCommented: updatedUser.emailPreferences?.taskComment ?? true,
        taskDue: updatedUser.emailPreferences?.taskDue ?? true,
        teamInvite: updatedUser.emailPreferences?.teamUpdates ?? true,
        systemAlerts: updatedUser.notificationPreference?.enabled ?? true,
      },
      quietHours: {
        enabled: updatedUser.notificationPreference?.quietHoursEnabled ?? false,
        start: updatedUser.notificationPreference?.quietHoursStart ?? '22:00',
        end: updatedUser.notificationPreference?.quietHoursEnd ?? '08:00',
      },
      emailDigest: {
        enabled: updatedUser.emailPreferences?.weeklyReport ?? false,
        frequency: updatedUser.emailPreferences?.emailDigest ?? 'DAILY',
        time: '09:00',
      }
    };

    return NextResponse.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

// Helper function to generate unsubscribe token
function generateUnsubscribeToken(): string {
  return Buffer.from(
    Math.random().toString(36).substring(2) +
    Date.now().toString(36)
  ).toString('base64');
}