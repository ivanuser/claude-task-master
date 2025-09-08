import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

// GET /api/sync/status - Query sync status by project and/or user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const userId = searchParams.get('userId') || (session.user as any).id;
    const includeEvents = searchParams.get('includeEvents') === 'true';

    // Build query conditions
    const whereConditions: any = {};
    if (projectId) {
      whereConditions.projectId = projectId;
    }
    if (userId) {
      whereConditions.userId = userId;
    }

    // Fetch sync status(es)
    const syncStates = await prisma.syncState.findMany({
      where: whereConditions,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            tag: true,
            status: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Optionally include recent events
    let events = [];
    if (includeEvents) {
      const eventWhereConditions: any = {
        eventType: {
          in: ['sync-started', 'sync-completed', 'sync-failed', 'task-updated', 'project-updated'],
        },
      };
      
      if (projectId) {
        eventWhereConditions.projectId = projectId;
      }
      if (userId) {
        eventWhereConditions.userId = userId;
      }

      events = await prisma.eventLog.findMany({
        where: eventWhereConditions,
        orderBy: {
          timestamp: 'desc',
        },
        take: 50, // Limit to recent 50 events
        select: {
          id: true,
          eventType: true,
          eventData: true,
          timestamp: true,
          severity: true,
          source: true,
          projectId: true,
          userId: true,
        },
      });
    }

    // If querying for a specific project and user, return single status
    if (projectId && syncStates.length === 1) {
      return NextResponse.json({
        syncState: syncStates[0],
        events,
      });
    }

    // Return all matching sync states
    return NextResponse.json({
      syncStates,
      events,
      count: syncStates.length,
    });

  } catch (error) {
    console.error('Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}

// POST /api/sync/status - Create or update sync status
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      projectId,
      status,
      errorMessage,
      syncData,
      progress,
    } = body;

    if (!projectId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId and status' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // Upsert sync status
    const syncState = await prisma.syncState.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      update: {
        status,
        errorMessage,
        syncData,
        progress: progress || 0,
        lastSyncAt: status === 'SYNCED' ? new Date() : undefined,
        updatedAt: new Date(),
      },
      create: {
        projectId,
        userId,
        status,
        errorMessage,
        syncData,
        progress: progress || 0,
        lastSyncAt: status === 'SYNCED' ? new Date() : null,
      },
    });

    // Log the event
    await prisma.eventLog.create({
      data: {
        projectId,
        userId,
        eventType: `sync-${status.toLowerCase()}`,
        eventData: {
          syncStateId: syncState.id,
          status,
          errorMessage,
          progress,
        },
        severity: errorMessage ? 'ERROR' : 'INFO',
        source: 'sync-status-api',
        processed: false,
      },
    });

    return NextResponse.json({
      success: true,
      syncState,
    });

  } catch (error) {
    console.error('Error updating sync status:', error);
    return NextResponse.json(
      { error: 'Failed to update sync status' },
      { status: 500 }
    );
  }
}

// DELETE /api/sync/status - Clear sync status
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get('projectId');
    const userId = (session.user as any).id;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    // Delete sync status
    await prisma.syncState.deleteMany({
      where: {
        projectId,
        userId,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Sync status cleared',
    });

  } catch (error) {
    console.error('Error deleting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to delete sync status' },
      { status: 500 }
    );
  }
}