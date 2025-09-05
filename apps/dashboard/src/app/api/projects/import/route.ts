import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import fs from 'fs/promises';
import path from 'path';

interface ImportRequest {
  tasksFilePath?: string;
  tagName?: string;
  projectName?: string;
  projectDescription?: string;
  gitUrl?: string;
  gitBranch?: string;
}

async function mapTaskStatus(status: string): Promise<string> {
  switch (status?.toLowerCase()) {
    case 'done':
    case 'completed':
      return 'DONE';
    case 'in-progress':
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'blocked':
      return 'BLOCKED';
    case 'review':
      return 'REVIEW';
    case 'cancelled':
      return 'CANCELLED';
    case 'deferred':
      return 'DEFERRED';
    default:
      return 'PENDING';
  }
}

async function mapTaskPriority(priority: string): Promise<string> {
  switch (priority?.toLowerCase()) {
    case 'high':
    case 'critical':
      return 'HIGH';
    case 'low':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ImportRequest = await request.json();
    const {
      tasksFilePath = '/home/ihoner/claude-task-master/.taskmaster/tasks/tasks.json',
      tagName,
      projectName,
      projectDescription,
      gitUrl = 'https://github.com/ihoner/claude-task-master',
      gitBranch = 'main'
    } = body;

    // Read the tasks.json file
    let tasksData: string;
    try {
      tasksData = await fs.readFile(tasksFilePath, 'utf-8');
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to read tasks file: ${tasksFilePath}` },
        { status: 400 }
      );
    }

    const tasksJson = JSON.parse(tasksData);

    // Get available tags
    const availableTags = Object.keys(tasksJson).filter(key => 
      typeof tasksJson[key] === 'object' && 
      tasksJson[key].tasks && 
      Array.isArray(tasksJson[key].tasks)
    );

    // If no tagName specified, return available tags
    if (!tagName) {
      return NextResponse.json({
        availableTags,
        message: 'Please specify a tagName to import'
      });
    }

    // Get tasks for the specified tag
    const tasks = tasksJson[tagName]?.tasks || [];
    if (tasks.length === 0) {
      return NextResponse.json(
        { error: `No tasks found for tag: ${tagName}` },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email! }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create or update project
    const finalProjectName = projectName || `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} Project`;
    const finalProjectDescription = projectDescription || `Imported from Task Master tag: ${tagName}`;

    const project = await prisma.project.upsert({
      where: { tag: tagName },
      update: {
        name: finalProjectName,
        description: finalProjectDescription,
        gitUrl,
        gitBranch,
        updatedAt: new Date()
      },
      create: {
        name: finalProjectName,
        description: finalProjectDescription,
        tag: tagName,
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        gitUrl,
        gitProvider: gitUrl.includes('github.com') ? 'GITHUB' : 'OTHER',
        gitBranch,
        settings: {
          notifications: true,
          autoSync: true
        },
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
            permissions: {}
          }
        }
      }
    });

    // Clear existing tasks for clean import
    await prisma.task.deleteMany({
      where: { projectId: project.id }
    });

    // Import tasks
    let importedCount = 0;
    const taskStats: Record<string, number> = {};

    for (const task of tasks) {
      try {
        const status = await mapTaskStatus(task.status);
        const priority = await mapTaskPriority(task.priority);

        taskStats[status] = (taskStats[status] || 0) + 1;

        await prisma.task.create({
          data: {
            projectId: project.id,
            taskId: String(task.id),
            title: task.title || `Task ${task.id}`,
            description: task.description || '',
            status: status as any,
            priority: priority as any,
            complexity: task.complexity || null,
            details: task.details || null,
            testStrategy: task.testStrategy || null,
            data: task
          }
        });

        importedCount++;
      } catch (error) {
        console.error(`Failed to import task ${task.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        id: project.id,
        name: project.name,
        tag: project.tag
      },
      imported: {
        total: importedCount,
        stats: taskStats
      }
    });

  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: 'Failed to import project' },
      { status: 500 }
    );
  }
}