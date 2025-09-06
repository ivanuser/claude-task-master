import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications/notification-service';

// GET /api/notifications/stats - Get notification statistics
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const stats = await notificationService.getNotificationStats(session.user.id);

    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('Error fetching notification stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notification stats' }, 
      { status: 500 }
    );
  }
}