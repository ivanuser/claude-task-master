import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import * as fs from 'fs/promises';
import * as path from 'path';
import { TaskData, TasksFile } from '../fetch/route';
import { broadcastSSEEvent } from '@/app/api/sse/route';

// Import tasks from file system to database
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId } = await request.json();

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
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

    // Read tasks from file system
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
    const tasksFile: TasksFile = JSON.parse(fileContent);
    
    const tag = project.tag || 'master';
    const tasks = tasksFile[tag]?.tasks || tasksFile.master?.tasks || [];

    console.log(`📥 Importing ${tasks.length} tasks for project ${project.name} (tag: ${tag})`);

    // Delete existing tasks for this project
    await prisma.task.deleteMany({
      where: { projectId }
    });

    // Import tasks into database
    let importedCount = 0;
    let errorCount = 0;

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
        errorCount++;
      }
    }

    // Update project's last sync time
    await prisma.project.update({
      where: { id: projectId },
      data: {
        lastSyncAt: new Date()
      }
    });

    // Create sync history record
    await prisma.syncHistory.create({
      data: {
        projectId,
        syncType: 'MANUAL',
        status: 'COMPLETED',
        tasksAdded: importedCount,
        tasksUpdated: 0,
        tasksRemoved: 0,
        syncData: {
          source: 'file_import',
          tag,
          importedCount,
          errorCount,
          totalTasks: tasks.length
        },
        completedAt: new Date()
      }
    });

    // Broadcast import completion
    broadcastSSEEvent({
      type: 'tasks-imported',
      projectId,
      data: {
        importedCount,
        errorCount,
        totalTasks: tasks.length,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      importedCount,
      errorCount,
      totalTasks: tasks.length,
      message: `Successfully imported ${importedCount} tasks`
    });

  } catch (error) {
    console.error('❌ Import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to import tasks',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
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