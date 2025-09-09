import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { broadcastSSEEvent } from '@/app/api/sse/route';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SyncFetchRequest {
  projectId: string;
  remoteServerUrl?: string;
  force?: boolean;
}

export interface TaskData {
  id: number | string;
  title: string;
  description: string;
  status: string;
  dependencies: (number | string)[];
  priority: string;
  details?: string;
  testStrategy?: string;
  subtasks?: any[];
  updatedAt?: string;
  version?: number;
}

export interface TasksFile {
  master?: {
    tasks: TaskData[];
  };
  [key: string]: {
    tasks: TaskData[];
  } | undefined;
}

// Fetch task data from remote server or local file
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: SyncFetchRequest = await request.json();
    const { projectId, remoteServerUrl, force } = body;

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        server: true,
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access
    if (project.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if sync is already in progress (unless forced)
    if (!force) {
      const existingSync = await prisma.syncState.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: session.user.id
          }
        }
      });

      if (existingSync?.status === 'IN_PROGRESS') {
        return NextResponse.json({ 
          error: 'Sync already in progress',
          syncId: existingSync.id 
        }, { status: 409 });
      }
    }

    // Create or update sync state
    const syncState = await prisma.syncState.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id
        }
      },
      update: {
        status: 'IN_PROGRESS',
        progress: 0,
        errorMessage: null,
        syncData: null
      },
      create: {
        projectId,
        userId: session.user.id,
        status: 'IN_PROGRESS',
        progress: 0
      }
    });

    // Broadcast sync start event
    broadcastSSEEvent({
      type: 'sync-started',
      projectId,
      data: {
        syncId: syncState.id,
        projectId,
        timestamp: new Date().toISOString()
      }
    });

    let taskData: TasksFile | null = null;
    let source: 'local' | 'remote' = 'local';

    try {
      if (remoteServerUrl && project.server) {
        // Fetch from remote server
        source = 'remote';
        
        // Update progress
        await updateSyncProgress(syncState.id, 20, 'Connecting to remote server...');
        
        const response = await fetch(`${remoteServerUrl}/api/tasks`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${project.server.authToken || ''}`,
            'Content-Type': 'application/json'
          },
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!response.ok) {
          throw new Error(`Remote server returned ${response.status}: ${response.statusText}`);
        }

        await updateSyncProgress(syncState.id, 50, 'Parsing remote data...');
        taskData = await response.json();
        
      } else {
        // Fetch from local file
        source = 'local';
        
        await updateSyncProgress(syncState.id, 20, 'Reading local tasks file...');
        
        const projectRoot = process.env.PROJECT_ROOT || '/home/ihoner/claude-task-master';
        let tasksFilePath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
        
        // Check with project tag if the default path doesn't exist
        try {
          await fs.access(tasksFilePath);
        } catch {
          if (project.tag) {
            tasksFilePath = path.join(projectRoot, `.taskmaster-${project.tag}`, 'tasks', 'tasks.json');
          }
        }

        const fileContent = await fs.readFile(tasksFilePath, 'utf-8');
        
        await updateSyncProgress(syncState.id, 50, 'Parsing local data...');
        taskData = JSON.parse(fileContent);
      }

      // Extract tasks based on project tag
      const tag = project.tag || 'master';
      const tasks = taskData?.[tag]?.tasks || taskData?.master?.tasks || [];

      await updateSyncProgress(syncState.id, 70, 'Processing task data...');

      // Store fetched data in sync state
      await prisma.syncState.update({
        where: { id: syncState.id },
        data: {
          status: 'COMPLETED',
          progress: 100,
          lastSyncAt: new Date(),
          syncData: {
            source,
            taskCount: tasks.length,
            tag,
            fetchedAt: new Date().toISOString(),
            tasks: tasks
          }
        }
      });

      // Broadcast sync completion
      broadcastSSEEvent({
        type: 'sync-completed',
        projectId,
        data: {
          syncId: syncState.id,
          source,
          taskCount: tasks.length,
          tag,
          timestamp: new Date().toISOString()
        }
      });

      // Create sync history record
      await prisma.syncHistory.create({
        data: {
          projectId,
          syncType: 'MANUAL',
          status: 'COMPLETED',
          tasksAdded: 0,
          tasksUpdated: tasks.length,
          tasksRemoved: 0,
          syncData: {
            source,
            tag,
            taskCount: tasks.length
          },
          completedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        syncId: syncState.id,
        source,
        tag,
        taskCount: tasks.length,
        tasks,
        message: `Successfully fetched ${tasks.length} tasks from ${source} source`
      });

    } catch (fetchError) {
      // Update sync state with error
      await prisma.syncState.update({
        where: { id: syncState.id },
        data: {
          status: 'FAILED',
          errorMessage: fetchError instanceof Error ? fetchError.message : 'Unknown error occurred',
          progress: 0
        }
      });

      // Broadcast sync failure
      broadcastSSEEvent({
        type: 'sync-failed',
        projectId,
        data: {
          syncId: syncState.id,
          error: fetchError instanceof Error ? fetchError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      });

      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Sync fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch task data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Helper function to update sync progress
async function updateSyncProgress(syncId: string, progress: number, message?: string) {
  await prisma.syncState.update({
    where: { id: syncId },
    data: {
      progress,
      syncData: {
        currentStep: message,
        updatedAt: new Date().toISOString()
      }
    }
  });
}

// Get sync status
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  try {
    const syncState = await prisma.syncState.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id
        }
      }
    });

    if (!syncState) {
      return NextResponse.json({
        status: 'IDLE',
        progress: 0,
        lastSyncAt: null
      });
    }

    return NextResponse.json({
      id: syncState.id,
      status: syncState.status,
      progress: syncState.progress,
      lastSyncAt: syncState.lastSyncAt,
      errorMessage: syncState.errorMessage,
      syncData: syncState.syncData
    });

  } catch (error) {
    console.error('❌ Error fetching sync status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sync status' },
      { status: 500 }
    );
  }
}