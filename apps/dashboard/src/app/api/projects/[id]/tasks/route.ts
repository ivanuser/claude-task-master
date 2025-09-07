import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const tag = searchParams.get('tag');

    // If a tag is specified, fetch tasks from tasks.json for that specific tag
    if (tag && tag !== 'all') {
      // Get project to find the server path
      const project = await prisma.project.findUnique({
        where: { id: params.id },
        include: { server: true },
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
        return NextResponse.json({
          tasks: [],
          stats: [],
          total: 0,
        });
      }

      // Read and parse the tasks.json file
      const tasksContent = readFileSync(tasksFilePath, 'utf-8');
      const tasksData = JSON.parse(tasksContent);

      let tagTasks = [];
      
      // Handle both legacy and tagged formats
      if (tasksData.tasks && Array.isArray(tasksData.tasks)) {
        // Legacy format - only return if tag is 'master'
        if (tag === 'master') {
          tagTasks = tasksData.tasks;
        }
      } else if (tasksData[tag]) {
        // Tagged format - get tasks for specific tag
        tagTasks = tasksData[tag].tasks || [];
      }

      // Get existing tasks from database for this project
      const dbTasks = await prisma.task.findMany({
        where: { projectId: params.id },
      });

      // Map tasks from tasks.json format to match database format
      // and merge with database tasks for any additional fields
      const tasks = tagTasks.map((task: any) => {
        const dbTask = dbTasks.find((t) => t.taskId === String(task.id));
        return {
          id: dbTask?.id || `task-${task.id}`,
          taskId: String(task.id),
          title: task.title,
          description: task.description,
          status: (task.status || 'pending').toUpperCase().replace('-', '_'),
          priority: (task.priority || 'medium').toUpperCase(),
          complexity: task.complexity,
          details: task.details,
          testStrategy: task.testStrategy,
          data: task,
          projectId: params.id,
          createdAt: dbTask?.createdAt || new Date(),
          updatedAt: dbTask?.updatedAt || new Date(),
        };
      });

      // Apply status and priority filters if provided
      let filteredTasks = tasks;
      if (status) {
        filteredTasks = filteredTasks.filter((t: any) => 
          t.status === status.toUpperCase()
        );
      }
      if (priority) {
        filteredTasks = filteredTasks.filter((t: any) => 
          t.priority === priority.toUpperCase()
        );
      }

      // Calculate stats
      const statusCounts: { [key: string]: number } = {};
      tasks.forEach((task: any) => {
        const status = task.status;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      const taskStats = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        _count: count,
      }));

      return NextResponse.json({
        tasks: filteredTasks,
        stats: taskStats,
        total: filteredTasks.length,
      });
    }

    // Default behavior - fetch all tasks from database
    const where: any = {
      projectId: params.id
    };

    if (status) {
      where.status = status.toUpperCase();
    }

    if (priority) {
      where.priority = priority.toUpperCase();
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { taskId: 'asc' }
      ]
    });

    // Get task count by status
    const taskStats = await prisma.task.groupBy({
      by: ['status'],
      where: { projectId: params.id },
      _count: true
    });

    return NextResponse.json({
      tasks,
      stats: taskStats,
      total: tasks.length
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}