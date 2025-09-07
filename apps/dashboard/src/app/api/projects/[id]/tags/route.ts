import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// GET - Get all tags for a project from tasks.json
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

    const { id: projectId } = params;

    // Get project to find the server path
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        server: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Check if the tasks.json file exists
    const serverPath = project.server?.projectPath || '/home/ihoner/Devana';
    const tasksFilePath = join(serverPath, '.taskmaster', 'tasks', 'tasks.json');
    
    if (!existsSync(tasksFilePath)) {
      return NextResponse.json({
        tags: [],
        currentTag: null,
        message: 'No tasks file found',
      });
    }

    // Read and parse the tasks.json file
    const tasksContent = readFileSync(tasksFilePath, 'utf-8');
    const tasksData = JSON.parse(tasksContent);

    // Handle both legacy and tagged formats
    let tags = [];
    let currentTag = null;

    if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
      // Legacy format - single "master" tag
      const tasks = tasksData.tasks;
      const completedCount = tasks.filter((t: any) => t.status === 'done').length;
      
      tags = [{
        name: 'master',
        taskCount: tasks.length,
        completedCount,
        description: 'Default task list',
        isCurrent: true,
        created: new Date().toISOString(),
      }];
      currentTag = 'master';
    } else {
      // Tagged format - multiple tags
      const stateFilePath = join(serverPath, '.taskmaster', 'state.json');
      let currentTagName = 'master';
      
      if (existsSync(stateFilePath)) {
        const stateContent = readFileSync(stateFilePath, 'utf-8');
        const state = JSON.parse(stateContent);
        currentTagName = state.currentTag || 'master';
      }

      for (const [tagName, tagData] of Object.entries(tasksData)) {
        if (typeof tagData === 'object' && tagData !== null && 'tasks' in (tagData as any)) {
          const tasks = (tagData as any).tasks || [];
          const completedCount = tasks.filter((t: any) => 
            t.status === 'done' || t.status === 'completed'
          ).length;
          
          const metadata = (tagData as any).metadata || {};
          
          tags.push({
            name: tagName,
            taskCount: tasks.length,
            completedCount,
            description: metadata.description || `Tasks for ${tagName} context`,
            isCurrent: tagName === currentTagName,
            created: metadata.created || new Date().toISOString(),
          });
        }
      }
      
      currentTag = currentTagName;
    }

    // Sort tags with current tag first
    tags.sort((a, b) => {
      if (a.isCurrent) return -1;
      if (b.isCurrent) return 1;
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({
      tags,
      currentTag,
      projectPath: serverPath,
    });
  } catch (error: any) {
    console.error('Error fetching project tags:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch project tags' },
      { status: 500 }
    );
  }
}

// POST - Create a new tag
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

    const { id: projectId } = params;
    const body = await request.json();
    const { name, description, copyFromTag } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Get project to find the server path
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        server: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const serverPath = project.server?.projectPath || '/home/ihoner/Devana';
    const tasksFilePath = join(serverPath, '.taskmaster', 'tasks', 'tasks.json');
    
    if (!existsSync(tasksFilePath)) {
      // Create new tasks.json with the first tag
      const newTasksData = {
        [name]: {
          tasks: [],
          metadata: {
            description: description || `Tasks for ${name} context`,
            created: new Date().toISOString(),
          },
        },
      };
      
      const fs = await import('fs/promises');
      await fs.writeFile(tasksFilePath, JSON.stringify(newTasksData, null, 2));
      
      return NextResponse.json({
        success: true,
        tagName: name,
        message: `Tag "${name}" created successfully`,
      });
    }

    // Read existing tasks.json
    const tasksContent = readFileSync(tasksFilePath, 'utf-8');
    let tasksData = JSON.parse(tasksContent);

    // Convert legacy format if needed
    if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
      const legacyTasks = tasksData.tasks;
      tasksData = {
        master: {
          tasks: legacyTasks,
          metadata: {
            description: 'Default task list',
            created: new Date().toISOString(),
          },
        },
      };
    }

    // Check if tag already exists
    if (tasksData[name]) {
      return NextResponse.json(
        { error: `Tag "${name}" already exists` },
        { status: 400 }
      );
    }

    // Create new tag
    let newTasks = [];
    if (copyFromTag && tasksData[copyFromTag]) {
      // Copy tasks from another tag
      newTasks = JSON.parse(JSON.stringify(tasksData[copyFromTag].tasks || []));
    }

    tasksData[name] = {
      tasks: newTasks,
      metadata: {
        description: description || `Tasks for ${name} context`,
        created: new Date().toISOString(),
        copiedFrom: copyFromTag || null,
      },
    };

    // Write updated tasks.json
    const fs = await import('fs/promises');
    await fs.writeFile(tasksFilePath, JSON.stringify(tasksData, null, 2));

    return NextResponse.json({
      success: true,
      tagName: name,
      tasksCopied: newTasks.length,
      message: `Tag "${name}" created successfully`,
    });
  } catch (error: any) {
    console.error('Error creating tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create tag' },
      { status: 500 }
    );
  }
}

// PATCH - Switch to a different tag
export async function PATCH(
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

    const { id: projectId } = params;
    const body = await request.json();
    const { tagName } = body;

    if (!tagName) {
      return NextResponse.json(
        { error: 'Tag name is required' },
        { status: 400 }
      );
    }

    // Get project to find the server path
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        server: true,
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const serverPath = project.server?.projectPath || '/home/ihoner/Devana';
    const stateFilePath = join(serverPath, '.taskmaster', 'state.json');
    
    // Update state.json with current tag
    const fs = await import('fs/promises');
    const state = {
      currentTag: tagName,
      lastSwitched: new Date().toISOString(),
    };
    
    await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2));

    // Update project's tag field in database
    await prisma.project.update({
      where: { id: projectId },
      data: { tag: tagName },
    });

    return NextResponse.json({
      success: true,
      currentTag: tagName,
      message: `Switched to tag "${tagName}"`,
    });
  } catch (error: any) {
    console.error('Error switching tag:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to switch tag' },
      { status: 500 }
    );
  }
}