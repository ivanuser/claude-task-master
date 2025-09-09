import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { getFileWatcher } from '@/lib/services/file-watcher';
import { broadcastSSEEvent } from '@/app/api/sse/route';
import * as path from 'path';
import * as fs from 'fs/promises';

// Initialize file watcher and set up event handlers
let fileWatcherInitialized = false;

function initializeFileWatcher() {
  if (fileWatcherInitialized) return;
  
  const fileWatcher = getFileWatcher();
  
  // Listen for task change events
  fileWatcher.on('task-change', async (event) => {
    console.log('📝 Task change detected:', event);
    
    // Broadcast the change via SSE
    broadcastSSEEvent({
      type: 'task-update',
      projectId: event.projectId,
      data: {
        changeType: event.type,
        tasks: event.tasks,
        serverPath: event.serverPath,
        timestamp: event.timestamp
      }
    });
    
    // Update database with sync status
    try {
      await prisma.syncHistory.create({
        data: {
          projectId: event.projectId,
          syncType: 'AUTO',
          status: 'COMPLETED',
          tasksAdded: event.type === 'added' ? 1 : 0,
          tasksUpdated: event.type === 'changed' ? 1 : 0,
          tasksRemoved: event.type === 'removed' ? 1 : 0,
          syncData: {
            changeType: event.type,
            serverPath: event.serverPath,
            timestamp: event.timestamp
          },
          completedAt: new Date()
        }
      });
      
      // Trigger automatic sync if project has a remote server configured
      const project = await prisma.project.findUnique({
        where: { id: event.projectId },
        include: { server: true }
      });
      
      if (project?.server && project.server.syncEnabled) {
        console.log('🔄 Triggering automatic sync for project:', event.projectId);
        
        // Broadcast sync start event
        broadcastSSEEvent({
          type: 'auto-sync-triggered',
          projectId: event.projectId,
          data: {
            trigger: 'file-change',
            changeType: event.type,
            timestamp: new Date().toISOString()
          }
        });
        
        // Note: Actual sync would be handled by a background job or the client
        // This just notifies that a sync should occur
      }
    } catch (error) {
      console.error('❌ Failed to record sync history:', error);
    }
  });
  
  fileWatcherInitialized = true;
  console.log('✅ File watcher event handlers initialized');
}

// Start watching a project's task file
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = params.id;

  try {
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

    // Initialize the file watcher if not already done
    initializeFileWatcher();

    // Determine the path to the tasks.json file
    let tasksFilePath: string;
    
    if (project.server) {
      // For remote servers, we'd need SSH file watching (not implemented yet)
      return NextResponse.json({ 
        error: 'Remote server file watching not yet implemented' 
      }, { status: 501 });
    } else {
      // For local projects, construct the path
      // Assuming the project path is stored in project settings or we use a default
      const projectRoot = process.env.PROJECT_ROOT || '/home/ihoner/claude-task-master';
      tasksFilePath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
      
      // Verify the file exists
      try {
        await fs.access(tasksFilePath);
      } catch {
        // Try alternative path with project tag
        if (project.tag) {
          tasksFilePath = path.join(projectRoot, `.taskmaster-${project.tag}`, 'tasks', 'tasks.json');
          try {
            await fs.access(tasksFilePath);
          } catch {
            return NextResponse.json({ 
              error: 'Tasks file not found',
              path: tasksFilePath 
            }, { status: 404 });
          }
        } else {
          return NextResponse.json({ 
            error: 'Tasks file not found',
            path: tasksFilePath 
          }, { status: 404 });
        }
      }
    }

    // Start watching the file
    const fileWatcher = getFileWatcher();
    await fileWatcher.watchTaskFile(projectId, tasksFilePath);

    return NextResponse.json({
      success: true,
      message: `Started watching tasks for project ${project.name}`,
      projectId,
      filePath: tasksFilePath
    });

  } catch (error) {
    console.error('❌ Error starting file watcher:', error);
    return NextResponse.json(
      { error: 'Failed to start file watcher' },
      { status: 500 }
    );
  }
}

// Stop watching a project's task file
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = params.id;

  try {
    const fileWatcher = getFileWatcher();
    await fileWatcher.stopWatching(projectId);

    return NextResponse.json({
      success: true,
      message: `Stopped watching tasks for project ${projectId}`
    });

  } catch (error) {
    console.error('❌ Error stopping file watcher:', error);
    return NextResponse.json(
      { error: 'Failed to stop file watcher' },
      { status: 500 }
    );
  }
}

// Get watching status
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const projectId = params.id;
  const fileWatcher = getFileWatcher();
  const isWatching = fileWatcher.isWatching(projectId);

  return NextResponse.json({
    projectId,
    isWatching,
    watchedProjects: fileWatcher.getWatchedProjects()
  });
}