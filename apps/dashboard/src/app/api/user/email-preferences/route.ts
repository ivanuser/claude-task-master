import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { EmailFrequency } from '@prisma/client';

// GET - Retrieve user's email preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emailPreferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create default preferences if they don't exist
    let preferences = user.emailPreferences;
    if (!preferences) {
      preferences = await prisma.emailPreferences.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json({
      preferences: {
        taskAssigned: preferences.taskAssigned,
        taskUpdated: preferences.taskUpdated,
        taskComment: preferences.taskComment,
        taskDue: preferences.taskDue,
        teamUpdates: preferences.teamUpdates,
        weeklyReport: preferences.weeklyReport,
        monthlyDigest: preferences.monthlyDigest,
        emailDigest: preferences.emailDigest,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
        unsubscribed: preferences.unsubscribedAt !== null,
      },
    });
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update email preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      taskAssigned,
      taskUpdated,
      taskComment,
      taskDue,
      teamUpdates,
      weeklyReport,
      monthlyDigest,
      emailDigest,
      quietHoursEnabled,
      quietHoursStart,
      quietHoursEnd,
      timezone,
    } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        emailPreferences: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate email frequency
    if (emailDigest && !['INSTANT', 'DAILY', 'WEEKLY', 'NEVER'].includes(emailDigest)) {
      return NextResponse.json(
        { error: 'Invalid email frequency' },
        { status: 400 }
      );
    }

    // Validate quiet hours
    if (quietHoursEnabled && (!quietHoursStart || !quietHoursEnd)) {
      return NextResponse.json(
        { error: 'Quiet hours times are required when enabled' },
        { status: 400 }
      );
    }

    // Update or create preferences
    const preferences = await prisma.emailPreferences.upsert({
      where: { userId: user.id },
      update: {
        taskAssigned: taskAssigned ?? undefined,
        taskUpdated: taskUpdated ?? undefined,
        taskComment: taskComment ?? undefined,
        taskDue: taskDue ?? undefined,
        teamUpdates: teamUpdates ?? undefined,
        weeklyReport: weeklyReport ?? undefined,
        monthlyDigest: monthlyDigest ?? undefined,
        emailDigest: emailDigest as EmailFrequency ?? undefined,
        quietHoursEnabled: quietHoursEnabled ?? undefined,
        quietHoursStart: quietHoursStart ?? undefined,
        quietHoursEnd: quietHoursEnd ?? undefined,
        timezone: timezone ?? undefined,
        updatedAt: new Date(),
        // Clear unsubscribed status if re-enabling emails
        unsubscribedAt: emailDigest !== 'NEVER' ? null : undefined,
      },
      create: {
        userId: user.id,
        taskAssigned: taskAssigned ?? true,
        taskUpdated: taskUpdated ?? true,
        taskComment: taskComment ?? true,
        taskDue: taskDue ?? true,
        teamUpdates: teamUpdates ?? true,
        weeklyReport: weeklyReport ?? true,
        monthlyDigest: monthlyDigest ?? false,
        emailDigest: (emailDigest as EmailFrequency) ?? 'DAILY',
        quietHoursEnabled: quietHoursEnabled ?? false,
        quietHoursStart: quietHoursStart ?? null,
        quietHoursEnd: quietHoursEnd ?? null,
        timezone: timezone ?? 'America/Los_Angeles',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Email preferences updated successfully',
      preferences: {
        taskAssigned: preferences.taskAssigned,
        taskUpdated: preferences.taskUpdated,
        taskComment: preferences.taskComment,
        taskDue: preferences.taskDue,
        teamUpdates: preferences.teamUpdates,
        weeklyReport: preferences.weeklyReport,
        monthlyDigest: preferences.monthlyDigest,
        emailDigest: preferences.emailDigest,
        quietHoursEnabled: preferences.quietHoursEnabled,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        timezone: preferences.timezone,
      },
    });
  } catch (error: any) {
    console.error('Error updating email preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update email preferences' },
      { status: 500 }
    );
  }
}

// DELETE - Unsubscribe from all emails
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Update preferences to unsubscribe
    await prisma.emailPreferences.upsert({
      where: { userId: user.id },
      update: {
        emailDigest: 'NEVER',
        unsubscribedAt: new Date(),
      },
      create: {
        userId: user.id,
        emailDigest: 'NEVER',
        unsubscribedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from all emails',
    });
  } catch (error) {
    console.error('Error unsubscribing from emails:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}