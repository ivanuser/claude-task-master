import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { twoFactorService } from '@/lib/auth/two-factor-service';

// POST - Setup 2FA for the current user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Setup TOTP
    const result = await twoFactorService.setupTOTP(
      session.user.id,
      'Task Master'
    );

    return NextResponse.json({
      success: true,
      qrCode: result.qrCode,
      secret: result.secret,
      backupCodes: result.backupCodes,
    });
  } catch (error: any) {
    console.error('Error setting up 2FA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup two-factor authentication' },
      { status: 500 }
    );
  }
}