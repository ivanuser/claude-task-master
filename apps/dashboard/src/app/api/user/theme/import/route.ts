import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { themeService } from '@/lib/theme/theme-service';

// POST - Import theme from JSON
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
    const { themeData } = body;

    if (!themeData) {
      return NextResponse.json(
        { error: 'Theme data is required' },
        { status: 400 }
      );
    }

    const success = await themeService.importTheme(
      session.user.id,
      typeof themeData === 'string' ? themeData : JSON.stringify(themeData)
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to import theme' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Theme imported successfully',
    });
  } catch (error: any) {
    console.error('Error importing theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import theme' },
      { status: 500 }
    );
  }
}