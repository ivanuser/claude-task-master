import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { twoFactorService } from '@/lib/auth/two-factor-service';

// POST - Regenerate backup codes
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Regenerate backup codes
    const backupCodes = await twoFactorService.regenerateBackupCodes(
      session.user.id
    );

    return NextResponse.json({
      success: true,
      backupCodes,
      message: 'Backup codes have been regenerated. Please save them in a secure location.',
    });
  } catch (error: any) {
    console.error('Error regenerating backup codes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to regenerate backup codes' },
      { status: 500 }
    );
  }
}