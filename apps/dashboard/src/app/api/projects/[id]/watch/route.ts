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

// Helper function to import tasks from file system to database
async function importTasksToDatabase(projectId: string, tasksData: any) {
  // Get project details to determine the correct tag
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  });

  if (!project) {
    console.error(`❌ Project ${projectId} not found`);
    return 0;
  }

  // Extract tasks from the tagged structure
  const tag = project.tag || 'master';
  let tasks: any[] = [];
  
  if (tasksData && typeof tasksData === 'object') {
    // Handle tagged task file format
    if (tasksData[tag]?.tasks) {
      tasks = tasksData[tag].tasks;
    } else if (tasksData.master?.tasks) {
      tasks = tasksData.master.tasks;
    } else if (Array.isArray(tasksData)) {
      // Legacy format - array of tasks
      tasks = tasksData;
    } else if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
      // Legacy format - object with tasks array
      tasks = tasksData.tasks;
    }
  }

  if (!tasks || tasks.length === 0) {
    console.log(`⚠️ No tasks found for project ${projectId} (tag: ${tag})`);
    return 0;
  }

  console.log(`📥 Importing ${tasks.length} tasks for project ${projectId} (tag: ${tag})`);

  // Delete existing tasks for this project
  await prisma.task.deleteMany({
    where: { projectId }
  });

  // Import tasks into database
  let importedCount = 0;

  for (const task of tasks) {
    try {
      // Map task status to database enum
      const dbStatus = mapTaskStatus(task.status);
      
      await prisma.task.create({
        data: {
          projectId,
          taskId: String(task.id),
          title: task.title,
          description: task.description || '',
          status: dbStatus,
          priority: mapPriority(task.priority),
          details: task.details || null,
          dependencies: task.dependencies || [],
          parentId: null, // Handle subtasks separately if needed
          metadata: {
            testStrategy: task.testStrategy,
            subtasks: task.subtasks || [],
            originalStatus: task.status
          },
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      importedCount++;
    } catch (error) {
      console.error(`Failed to import task ${task.id}:`, error);
    }
  }

  // Update project's last sync time
  await prisma.project.update({
    where: { id: projectId },
    data: {
      lastSyncAt: new Date()
    }
  });

  console.log(`✅ Successfully imported ${importedCount}/${tasks.length} tasks to database`);
  return importedCount;
}

// Helper function to map task status to database enum
function mapTaskStatus(status: string): 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED' {
  const statusMap: Record<string, 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED' | 'CANCELLED'> = {
    'pending': 'PENDING',
    'in-progress': 'IN_PROGRESS',
    'in_progress': 'IN_PROGRESS',
    'done': 'DONE',
    'completed': 'DONE',
    'blocked': 'BLOCKED',
    'cancelled': 'CANCELLED',
    'deferred': 'BLOCKED',
    'review': 'IN_PROGRESS'
  };
  
  return statusMap[status.toLowerCase()] || 'PENDING';
}

// Helper function to map priority
function mapPriority(priority?: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (!priority) return 'MEDIUM';
  
  const priorityMap: Record<string, 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'> = {
    'low': 'LOW',
    'medium': 'MEDIUM',
    'high': 'HIGH',
    'critical': 'CRITICAL',
    'urgent': 'CRITICAL'
  };
  
  return priorityMap[priority.toLowerCase()] || 'MEDIUM';
}

function initializeFileWatcher() {
  if (fileWatcherInitialized) return;
  
  const fileWatcher = getFileWatcher();
  
  // Listen for task change events
  fileWatcher.on('task-change', async (event) => {
    console.log('📝 Task change detected:', event);
    
    try {
      // Import tasks from file system to database
      const importedCount = await importTasksToDatabase(event.projectId, event.tasks);
      
      // Get project details for proper task extraction for SSE
      const project = await prisma.project.findUnique({
        where: { id: event.projectId }
      });
      
      // Extract tasks for SSE broadcast (same logic as import)
      const tag = project?.tag || 'master';
      let tasksForBroadcast = [];
      
      if (event.tasks && typeof event.tasks === 'object') {
        if (event.tasks[tag]?.tasks) {
          tasksForBroadcast = event.tasks[tag].tasks;
        } else if (event.tasks.master?.tasks) {
          tasksForBroadcast = event.tasks.master.tasks;
        } else if (Array.isArray(event.tasks)) {
          tasksForBroadcast = event.tasks;
        } else if (event.tasks.tasks && Array.isArray(event.tasks.tasks)) {
          tasksForBroadcast = event.tasks.tasks;
        }
      }
      
      // Broadcast the change via SSE
      broadcastSSEEvent({
        type: 'task-update',
        projectId: event.projectId,
        data: {
          changeType: event.type,
          tasks: tasksForBroadcast,
          serverPath: event.serverPath,
          timestamp: event.timestamp,
          importedCount
        }
      });
      
      // Update database with sync status
      await prisma.syncHistory.create({
        data: {
          projectId: event.projectId,
          syncType: 'AUTOMATIC',
          status: 'COMPLETED',
          tasksAdded: event.type === 'added' ? 1 : 0,
          tasksUpdated: event.type === 'changed' ? event.tasks?.length || 0 : 0,
          tasksRemoved: event.type === 'removed' ? 1 : 0,
          syncData: {
            changeType: event.type,
            serverPath: event.serverPath,
            timestamp: event.timestamp,
            importedToDatabase: true
          },
          completedAt: new Date()
        }
      });
      
      console.log(`✅ Successfully imported ${event.tasks?.length || 0} tasks to database`);
      
    } catch (error) {
      console.error('❌ Failed to import tasks to database:', error);
      
      // Still broadcast the SSE event even if database import fails
      broadcastSSEEvent({
        type: 'task-update',
        projectId: event.projectId,
        data: {
          changeType: event.type,
          tasks: event.tasks,
          serverPath: event.serverPath,
          timestamp: event.timestamp,
          error: 'Failed to import to database'
        }
      });
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