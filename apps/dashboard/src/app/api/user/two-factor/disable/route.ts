import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twoFactorService } from '@/lib/auth/two-factor-service';

// POST - Disable 2FA for the current user
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
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required to disable 2FA' },
        { status: 400 }
      );
    }

    // Disable 2FA
    const disabled = await twoFactorService.disable(
      session.user.id,
      password
    );

    if (!disabled) {
      return NextResponse.json(
        { error: 'Invalid password or failed to disable 2FA' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled',
    });
  } catch (error: any) {
    console.error('Error disabling 2FA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to disable two-factor authentication' },
      { status: 500 }
    );
  }
}