import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { emailService } from '@/lib/email/email-service';

// POST - Process unsubscribe request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      );
    }

    // Find email preferences by unsubscribe token
    const preferences = await prisma.emailPreferences.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!preferences) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      );
    }

    // Update preferences to unsubscribe
    await prisma.emailPreferences.update({
      where: { id: preferences.id },
      data: {
        emailDigest: 'NEVER',
        unsubscribedAt: new Date(),
        taskAssigned: false,
        taskUpdated: false,
        taskComment: false,
        taskDue: false,
        teamUpdates: false,
        weeklyReport: false,
        monthlyDigest: false,
      },
    });

    // Log the unsubscribe event
    console.log(`User unsubscribed: ${preferences.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from email notifications',
    });
  } catch (error: any) {
    console.error('Error processing unsubscribe:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process unsubscribe request' },
      { status: 500 }
    );
  }
}

// GET - Verify unsubscribe token (optional)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Unsubscribe token is required' },
        { status: 400 }
      );
    }

    // Verify token exists
    const preferences = await prisma.emailPreferences.findUnique({
      where: { unsubscribeToken: token },
      select: {
        id: true,
        unsubscribedAt: true,
      },
    });

    if (!preferences) {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      valid: true,
      alreadyUnsubscribed: preferences.unsubscribedAt !== null,
    });
  } catch (error) {
    console.error('Error verifying unsubscribe token:', error);
    return NextResponse.json(
      { error: 'Failed to verify token' },
      { status: 500 }
    );
  }
}