import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twoFactorService } from '@/lib/auth/two-factor-service';

// POST - Verify and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { token, trustDevice, deviceId } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Verify and enable TOTP
    const verified = await twoFactorService.verifyAndEnableTOTP({
      userId: session.user.id,
      token,
      trustDevice,
      deviceId,
    });

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been enabled',
    });
  } catch (error: any) {
    console.error('Error verifying 2FA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify two-factor authentication' },
      { status: 500 }
    );
  }
}