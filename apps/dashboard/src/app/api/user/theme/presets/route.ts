import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { themeService } from '@/lib/theme/theme-service';

// POST - Save a theme preset
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
    const { presetName } = body;

    if (!presetName) {
      return NextResponse.json(
        { error: 'Preset name is required' },
        { status: 400 }
      );
    }

    const success = await themeService.saveThemePreset(
      session.user.id,
      presetName
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to save theme preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Theme preset saved successfully',
    });
  } catch (error: any) {
    console.error('Error saving theme preset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save theme preset' },
      { status: 500 }
    );
  }
}

// PUT - Load a theme preset
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
    const { presetName } = body;

    if (!presetName) {
      return NextResponse.json(
        { error: 'Preset name is required' },
        { status: 400 }
      );
    }

    const success = await themeService.loadThemePreset(
      session.user.id,
      presetName
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to load theme preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Theme preset loaded successfully',
    });
  } catch (error: any) {
    console.error('Error loading theme preset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load theme preset' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a theme preset
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const presetName = searchParams.get('name');

    if (!presetName) {
      return NextResponse.json(
        { error: 'Preset name is required' },
        { status: 400 }
      );
    }

    const success = await themeService.deleteThemePreset(
      session.user.id,
      presetName
    );

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete theme preset' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Theme preset deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting theme preset:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete theme preset' },
      { status: 500 }
    );
  }
}