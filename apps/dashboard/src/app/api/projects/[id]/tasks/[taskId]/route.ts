import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateTaskSchema } from '@/lib/validations/task';

// Mock task getter
const getMockTask = (projectId: string, taskId: string) => ({
  id: taskId,
  projectId,
  title: 'Sample Task',
  description: 'This is a sample task',
  status: 'pending',
  priority: 'medium',
  dependencies: [],
  subtasks: [],
  details: 'Task implementation details',
  testStrategy: 'Unit and integration tests',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  complexity: 5,
});

// GET /api/projects/[id]/tasks/[taskId] - Get a single task
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const task = getMockTask(params.id, params.taskId);
    
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error('Failed to fetch task:', error);
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/tasks/[taskId] - Update a task
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateTaskSchema.parse(body);

    const existingTask = getMockTask(params.id, params.taskId);
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const updatedTask = {
      ...existingTask,
      ...validatedData,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedTask);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to update task:', error);
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/tasks/[taskId] - Delete a task
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; taskId: string } }
) {
  try {
    const existingTask = getMockTask(params.id, params.taskId);
    
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete task:', error);
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    );
  }
}