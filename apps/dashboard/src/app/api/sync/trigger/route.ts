import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { connections } from '@/app/api/sse/route';

// POST /api/sync/trigger - Manually trigger synchronization for a project
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, syncType = 'manual' } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    const userId = (session.user as any).id;

    // Verify user has access to the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        members: {
          some: {
            userId,
          },
        },
      },
      include: {
        server: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      );
    }

    // Check if sync is already running
    const existingSync = await prisma.syncState.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    if (existingSync?.status === 'SYNCING') {
      return NextResponse.json(
        { error: 'Sync is already in progress for this project' },
        { status: 409 }
      );
    }

    // Update sync state to SYNCING
    const syncState = await prisma.syncState.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      update: {
        status: 'SYNCING',
        errorMessage: null,
        progress: 0,
        syncData: {
          syncType,
          startedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      create: {
        projectId,
        userId,
        status: 'SYNCING',
        progress: 0,
        syncData: {
          syncType,
          startedAt: new Date(),
        },
      },
    });

    // Log sync started event
    await prisma.eventLog.create({
      data: {
        projectId,
        userId,
        eventType: 'sync-started',
        eventData: {
          syncStateId: syncState.id,
          syncType,
          projectName: project.name,
          serverId: project.serverId,
        },
        severity: 'INFO',
        source: 'sync-trigger-api',
        processed: false,
      },
    });

    // Broadcast sync started event via SSE
    const sseMessage = JSON.stringify({
      type: 'sync-started',
      projectId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        syncType,
        projectName: project.name,
      },
    });

    // Send to all connections
    connections.forEach((writer) => {
      try {
        writer.write(`data: ${sseMessage}\n\n`);
      } catch (error) {
        console.error('Failed to send SSE message:', error);
      }
    });

    // If this is a server-based project, initiate actual sync
    if (project.serverId && project.server) {
      // Create a sync history record
      const syncHistory = await prisma.syncHistory.create({
        data: {
          projectId,
          serverId: project.serverId,
          userId,
          syncType: syncType === 'manual' ? 'MANUAL' : 'AUTOMATIC',
          status: 'RUNNING',
        },
      });

      // Here you would trigger the actual sync process
      // For now, we'll simulate it with a delayed status update
      setTimeout(async () => {
        try {
          // Simulate sync completion
          await prisma.syncState.update({
            where: {
              projectId_userId: {
                projectId,
                userId,
              },
            },
            data: {
              status: 'SYNCED',
              progress: 100,
              lastSyncAt: new Date(),
              syncData: {
                syncType,
                startedAt: syncState.createdAt,
                completedAt: new Date(),
                tasksUpdated: Math.floor(Math.random() * 10),
              },
            },
          });

          // Update sync history
          await prisma.syncHistory.update({
            where: { id: syncHistory.id },
            data: {
              status: 'COMPLETED',
              completedAt: new Date(),
              tasksAdded: Math.floor(Math.random() * 5),
              tasksUpdated: Math.floor(Math.random() * 10),
              tasksRemoved: 0,
            },
          });

          // Log sync completed event
          await prisma.eventLog.create({
            data: {
              projectId,
              userId,
              eventType: 'sync-completed',
              eventData: {
                syncStateId: syncState.id,
                syncType,
                duration: Date.now() - syncState.createdAt.getTime(),
              },
              severity: 'INFO',
              source: 'sync-trigger-api',
              processed: false,
            },
          });

          // Broadcast sync completed event
          const completedMessage = JSON.stringify({
            type: 'sync-completed',
            projectId,
            userId,
            timestamp: new Date().toISOString(),
            data: {
              syncType,
              projectName: project.name,
            },
          });

          connections.forEach((writer) => {
            try {
              writer.write(`data: ${completedMessage}\n\n`);
            } catch (error) {
              console.error('Failed to send SSE message:', error);
            }
          });
        } catch (error) {
          console.error('Error completing sync:', error);
        }
      }, 5000); // Simulate 5 second sync duration
    }

    return NextResponse.json({
      success: true,
      message: 'Sync triggered successfully',
      syncState,
      projectId,
    });

  } catch (error) {
    console.error('Error triggering sync:', error);
    return NextResponse.json(
      { error: 'Failed to trigger sync' },
      { status: 500 }
    );
  }
}