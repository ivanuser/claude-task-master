import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateProjectSchema } from '@/lib/validations/project';

// Mock data store
const getMockProject = (id: string) => ({
  id,
  name: 'Task Master Dashboard',
  description: 'Web dashboard for Task Master projects',
  status: 'active',
  gitProvider: 'github',
  gitUrl: 'https://github.com/user/task-master-dashboard',
  gitBranch: 'main',
  totalTasks: 25,
  completedTasks: 16,
  tags: ['dashboard', 'web', 'react'],
  memberCount: 2,
  lastActivity: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  owner: {
    id: '1',
    name: 'John Doe',
    email: 'john@example.com',
  },
  isTaskMasterProject: true,
  hasCustomRules: true,
  syncEnabled: true,
});

// GET /api/projects/[id] - Get a single project
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const project = getMockProject(params.id);
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Failed to fetch project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id] - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const validatedData = updateProjectSchema.parse(body);

    const existingProject = getMockProject(params.id);
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const updatedProject = {
      ...existingProject,
      ...validatedData,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to update project:', error);
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id] - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const existingProject = getMockProject(params.id);
    
    if (!existingProject) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Mock deletion
    return NextResponse.json(
      { message: 'Project deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Failed to delete project:', error);
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    );
  }
}