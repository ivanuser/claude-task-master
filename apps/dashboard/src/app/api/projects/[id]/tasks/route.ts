import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { taskQuerySchema, createTaskSchema, bulkUpdateTasksSchema } from '@/lib/validations/task';

// Mock task data
const getMockTasks = (projectId: string) => [
  {
    id: '1',
    projectId,
    title: 'Setup authentication',
    description: 'Implement JWT-based authentication system',
    status: 'done',
    priority: 'high',
    dependencies: [],
    subtasks: [
      {
        id: '1.1',
        title: 'Create auth middleware',
        description: 'Middleware for protecting routes',
        status: 'done',
        priority: 'high',
        dependencies: [],
      },
      {
        id: '1.2',
        title: 'Setup JWT tokens',
        description: 'Configure JWT token generation',
        status: 'done',
        priority: 'high',
        dependencies: ['1.1'],
      },
    ],
    details: 'Use bcrypt for password hashing and JWT for token generation',
    testStrategy: 'Unit tests for auth functions, integration tests for auth flow',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    complexity: 8,
  },
  {
    id: '2',
    projectId,
    title: 'Create dashboard layout',
    description: 'Build responsive dashboard layout with sidebar',
    status: 'in-progress',
    priority: 'medium',
    dependencies: ['1'],
    subtasks: [],
    details: 'Use Tailwind CSS for styling',
    testStrategy: 'Visual regression tests, responsive design tests',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    complexity: 5,
  },
  {
    id: '3',
    projectId,
    title: 'Implement real-time sync',
    description: 'Add WebSocket support for real-time updates',
    status: 'pending',
    priority: 'low',
    dependencies: ['2'],
    subtasks: [],
    details: 'Use Socket.IO for WebSocket implementation',
    testStrategy: 'Load testing for concurrent connections',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    complexity: 7,
  },
];

// GET /api/projects/[id]/tasks - Get tasks for a project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = taskQuerySchema.parse({
      ...searchParams,
      status: request.nextUrl.searchParams.getAll('status'),
      priority: request.nextUrl.searchParams.getAll('priority'),
    });

    let tasks = getMockTasks(params.id);

    // Apply filters
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      tasks = tasks.filter(t =>
        t.title.toLowerCase().includes(searchLower) ||
        t.description.toLowerCase().includes(searchLower)
      );
    }

    if (query.status && query.status.length > 0) {
      tasks = tasks.filter(t => query.status!.includes(t.status as any));
    }

    if (query.priority && query.priority.length > 0) {
      tasks = tasks.filter(t => query.priority!.includes(t.priority as any));
    }

    if (query.hasSubtasks !== undefined) {
      tasks = tasks.filter(t => 
        query.hasSubtasks ? t.subtasks && t.subtasks.length > 0 : !t.subtasks || t.subtasks.length === 0
      );
    }

    // Sort
    tasks.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (query.sortBy) {
        case 'title':
          aVal = a.title;
          bVal = b.title;
          break;
        case 'priority':
          const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          aVal = priorityOrder[a.priority as keyof typeof priorityOrder];
          bVal = priorityOrder[b.priority as keyof typeof priorityOrder];
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = a.id;
          bVal = b.id;
      }

      if (query.sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    // Paginate
    const start = (query.page - 1) * query.limit;
    const paginatedTasks = tasks.slice(start, start + query.limit);

    return NextResponse.json({
      tasks: paginatedTasks,
      total: tasks.length,
      page: query.page,
      limit: query.limit,
      hasMore: start + query.limit < tasks.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to fetch tasks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/tasks - Create a new task
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = createTaskSchema.parse(body);

    const newTask = {
      id: Date.now().toString(),
      projectId: params.id,
      ...validatedData,
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to create task:', error);
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PATCH /api/projects/[id]/tasks - Bulk update tasks
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = bulkUpdateTasksSchema.parse(body);

    // Mock bulk update
    const updatedTasks = validatedData.taskIds.map(taskId => ({
      id: taskId,
      projectId: params.id,
      ...validatedData.updates,
      updatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({
      message: `Updated ${updatedTasks.length} tasks`,
      updatedTasks,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to bulk update tasks:', error);
    return NextResponse.json(
      { error: 'Failed to bulk update tasks' },
      { status: 500 }
    );
  }
}