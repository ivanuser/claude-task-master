import { NextRequest, NextResponse } from 'next/server';
import { twoFactorService } from '@/lib/auth/two-factor-service';
import { RecoveryMethod } from '@prisma/client';

// POST - Initiate recovery process
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, method = 'EMAIL' } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Initiate recovery
    const token = await twoFactorService.initiateRecovery(
      email,
      method as RecoveryMethod
    );

    // In production, the token would be sent via email/SMS
    // For now, we'll return a success message
    return NextResponse.json({
      success: true,
      message: 'Recovery instructions have been sent to your registered email/phone',
      // Remove this in production - only for testing
      debugToken: process.env.NODE_ENV === 'development' ? token : undefined,
    });
  } catch (error: any) {
    console.error('Error initiating recovery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initiate recovery process' },
      { status: 500 }
    );
  }
}

// PUT - Complete recovery process
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, newPassword } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Recovery token is required' },
        { status: 400 }
      );
    }

    // Complete recovery
    const completed = await twoFactorService.completeRecovery(
      token,
      newPassword
    );

    if (!completed) {
      return NextResponse.json(
        { error: 'Invalid or expired recovery token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Recovery completed successfully. Two-factor authentication has been temporarily disabled.',
    });
  } catch (error: any) {
    console.error('Error completing recovery:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete recovery process' },
      { status: 500 }
    );
  }
}