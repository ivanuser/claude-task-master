import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { themeService } from '@/lib/theme/theme-service';

// GET - Export theme as JSON
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const themeJson = await themeService.exportTheme(session.user.id);

    if (!themeJson) {
      return NextResponse.json(
        { error: 'Failed to export theme' },
        { status: 500 }
      );
    }

    // Return as downloadable JSON file
    return new NextResponse(themeJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="taskmaster-theme-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export theme' },
      { status: 500 }
    );
  }
}