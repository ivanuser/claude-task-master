import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { themeService } from '@/lib/theme/theme-service';

// GET - Get user's theme preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const preferences = await themeService.getUserTheme(session.user.id);

    return NextResponse.json(preferences);
  } catch (error: any) {
    console.error('Error getting theme preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get theme preferences' },
      { status: 500 }
    );
  }
}

// PUT - Update user's theme preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const preferences = await themeService.saveUserTheme(
      session.user.id,
      body
    );

    if (!preferences) {
      return NextResponse.json(
        { error: 'Failed to save theme preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error('Error saving theme preferences:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save theme preferences' },
      { status: 500 }
    );
  }
}