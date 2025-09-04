import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'lastActivity';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const ownership = searchParams.get('ownership') || 'all';
    const statusFilters = searchParams.getAll('status');
    const tagFilters = searchParams.getAll('tags');

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statusFilters.length > 0) {
      where.status = { in: statusFilters };
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
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(searchLower) || 
        p.description.toLowerCase().includes(searchLower)
      );
    }

    if (statusFilters.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        statusFilters.includes(p.status)
      );
    }

    if (tagFilters.length > 0) {
      filteredProjects = filteredProjects.filter(p => 
        p.tags.some(tag => tagFilters.includes(tag))
      );
    }

    // Sort
    filteredProjects.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
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

      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      } else {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
    });

    // Paginate
    const start = (page - 1) * limit;
    const paginatedProjects = filteredProjects.slice(start, start + limit);

    return NextResponse.json({
      projects: paginatedProjects,
      total: filteredProjects.length,
      page,
      limit,
      hasMore: start + limit < filteredProjects.length,
    });
  } catch (error) {
    console.error('Failed to fetch projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}