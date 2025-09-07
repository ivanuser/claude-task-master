import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { twoFactorService } from '@/lib/auth/two-factor-service';

// GET - Get 2FA status for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const status = await twoFactorService.getStatus(session.user.id);

    return NextResponse.json(status);
  } catch (error: any) {
    console.error('Error getting 2FA status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get two-factor authentication status' },
      { status: 500 }
    );
  }
}