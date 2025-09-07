import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { teamNotificationService } from '@/lib/notifications/team-notification-service';
import { prisma } from '@/lib/database';

// GET - Get project activity feed
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Check if user is a member of the project
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Get project activity feed
    const activities = await teamNotificationService.getProjectActivityFeed(
      projectId,
      limit,
      offset
    );

    return NextResponse.json({ activities });
  } catch (error: any) {
    console.error('Error fetching project activities:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project activities' },
      { status: 500 }
    );
  }
}

// POST - Send team announcement
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id } = params;
    const body = await request.json();
    const { title, message, priority = 'HIGH' } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Get user and check permissions
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId,
        },
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to send announcements' },
        { status: 403 }
      );
    }

    // Send announcement
    await teamNotificationService.sendTeamAnnouncement(
      projectId,
      title,
      message,
      user.id,
      priority
    );

    return NextResponse.json({
      success: true,
      message: 'Announcement sent successfully',
    });
  } catch (error: any) {
    console.error('Error sending announcement:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send announcement' },
      { status: 500 }
    );
  }
}