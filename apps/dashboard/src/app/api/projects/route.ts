import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database';
import { projectQuerySchema, createProjectSchema } from '@/lib/validations/project';
import { withRateLimit } from '@/lib/middleware/rate-limit';

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
    // Parse and validate query parameters
    const searchParams = Object.fromEntries(request.nextUrl.searchParams);
    const query = projectQuerySchema.parse({
      ...searchParams,
      status: request.nextUrl.searchParams.getAll('status'),
      tags: request.nextUrl.searchParams.getAll('tags'),
    });

    // Build where clause
    const where: any = {};
    
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.status && query.status.length > 0) {
      where.status = { in: query.status };
    }

    if (query.tags && query.tags.length > 0) {
      where.tags = { hasSome: query.tags };
    }

    // For now, return mock data until the database is properly set up
    const mockProjects = [
      {
        id: '1',
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
      },
      {
        id: '2',
        name: 'Task Master CLI',
        description: 'Command-line interface for Task Master',
        status: 'active',
        gitProvider: 'github',
        gitUrl: 'https://github.com/user/task-master-cli',
        gitBranch: 'develop',
        totalTasks: 42,
        completedTasks: 38,
        tags: ['cli', 'nodejs', 'typescript'],
        memberCount: 3,
        lastActivity: new Date(Date.now() - 86400000).toISOString(),
        createdAt: new Date(Date.now() - 604800000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        owner: {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        isTaskMasterProject: true,
        hasCustomRules: false,
        syncEnabled: true,
      },
      {
        id: '3',
        name: 'Mobile App',
        description: 'React Native mobile application',
        status: 'paused',
        gitProvider: 'gitlab',
        gitUrl: 'https://gitlab.com/user/mobile-app',
        gitBranch: 'main',
        totalTasks: 15,
        completedTasks: 8,
        tags: ['mobile', 'react-native', 'typescript'],
        memberCount: 2,
        lastActivity: new Date(Date.now() - 604800000 * 2).toISOString(),
        createdAt: new Date(Date.now() - 604800000 * 4).toISOString(),
        updatedAt: new Date(Date.now() - 604800000 * 2).toISOString(),
        owner: {
          id: '2',
          name: 'Jane Smith',
          email: 'jane@example.com',
        },
        isTaskMasterProject: true,
        hasCustomRules: true,
        syncEnabled: false,
      },
    ];

    // Apply filters
    let filteredProjects = mockProjects;
    
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (query.status && query.status.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        query.status!.includes(p.status as any)
      );
    }

    if (query.tags && query.tags.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        p.tags.some(tag => query.tags!.includes(tag))
      );
    }

    // Sort
    filteredProjects.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (query.sortBy) {
        case 'name':
          aVal = a.name;
          bVal = b.name;
          break;
        case 'lastActivity':
          aVal = new Date(a.lastActivity).getTime();
          bVal = new Date(b.lastActivity).getTime();
          break;
        case 'taskCount':
          aVal = a.totalTasks;
          bVal = b.totalTasks;
          break;
        case 'completion':
          aVal = a.completedTasks / (a.totalTasks || 1);
          bVal = b.completedTasks / (b.totalTasks || 1);
          break;
        default:
          aVal = a.lastActivity;
          bVal = b.lastActivity;
      }

      if (query.sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    // Paginate
    const start = (query.page - 1) * query.limit;
    const paginatedProjects = filteredProjects.slice(start, start + query.limit);

    return NextResponse.json({
      projects: paginatedProjects,
      total: filteredProjects.length,
      page: query.page,
      limit: query.limit,
      hasMore: start + query.limit < filteredProjects.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request parameters', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
  });
}

// POST /api/projects - Create a new project
export async function POST(request: NextRequest) {
  return withRateLimit(request, async () => {
    try {
    const body = await request.json();
    const validatedData = createProjectSchema.parse(body);

    // Mock project creation
    const newProject = {
      id: Date.now().toString(),
      ...validatedData,
      totalTasks: 0,
      completedTasks: 0,
      memberCount: 1,
      lastActivity: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: {
        id: '1',
        name: 'Current User',
        email: 'user@example.com',
      },
      isTaskMasterProject: true,
      hasCustomRules: false,
    };

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request body', details: error.errors },
        { status: 400 }
      );
    }
    
    console.error('Failed to create project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
  });
}