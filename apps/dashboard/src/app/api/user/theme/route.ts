import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { themeService } from '@/lib/theme/theme-service';
import { prisma } from '@/lib/database';

// GET - Get user's theme preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Theme API - Session:', {
      exists: !!session,
      user: session?.user,
      email: session?.user?.email,
    });
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const preferences = await themeService.getUserTheme(user.id);

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
    
    console.log('Theme API PUT - Session:', {
      exists: !!session,
      user: session?.user,
      email: session?.user?.email,
    });
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user ID from email
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    
    const preferences = await themeService.saveUserTheme(
      user.id,
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