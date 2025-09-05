import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    
    // Get pagination parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Get filter parameters
    const search = searchParams.get('search') || '';
    let sortBy = searchParams.get('sortBy') || 'updatedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    
    // Map frontend sortBy values to actual database fields
    if (sortBy === 'lastActivity') {
      sortBy = 'updatedAt';
    }
    const ownership = searchParams.get('ownership') || 'all';

    // Build where clause
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tag: { contains: search, mode: 'insensitive' } }
      ];
    }

    // If user is authenticated, filter by ownership
    if (session?.user && ownership !== 'all') {
      if (ownership === 'owned') {
        where.members = {
          some: {
            userId: (session.user as any).id,
            role: 'OWNER'
          }
        };
      } else if (ownership === 'member') {
        where.members = {
          some: {
            userId: (session.user as any).id
          }
        };
      }
    }

    // Get projects with related data
    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true
                }
              }
            }
          },
          tasks: {
            select: {
              id: true,
              status: true
            }
          },
          _count: {
            select: {
              tasks: true,
              members: true
            }
          }
        },
        orderBy: {
          [sortBy]: sortOrder
        },
        skip,
        take: limit
      }),
      prisma.project.count({ where })
    ]);

    // Transform the data to match frontend expectations
    const transformedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status.toLowerCase(),
      visibility: project.visibility.toLowerCase(),
      gitProvider: project.gitProvider?.toLowerCase() || null,
      gitUrl: project.gitUrl,
      gitBranch: project.gitBranch,
      tag: project.tag,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      lastSyncAt: project.lastSyncAt?.toISOString() || null,
      totalTasks: project._count.tasks,
      completedTasks: project.tasks.filter(t => t.status === 'DONE').length,
      inProgressTasks: project.tasks.filter(t => t.status === 'IN_PROGRESS').length,
      pendingTasks: project.tasks.filter(t => t.status === 'PENDING').length,
      memberCount: project._count.members,
      owner: project.members.find(m => m.role === 'OWNER')?.user || null,
      members: project.members.map(m => ({
        id: m.id,
        role: m.role.toLowerCase(),
        permissions: m.permissions,
        user: m.user
      })),
      isTaskMasterProject: true, // All projects in this system are Task Master projects
      hasCustomRules: project.settings ? Object.keys(project.settings as any).length > 0 : false,
      syncEnabled: true,
      tags: [], // TODO: Implement tags relationship
      lastActivity: project.updatedAt.toISOString(),
      settings: project.settings || {}
    }));

    return NextResponse.json({
      projects: transformedProjects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, gitUrl, gitProvider, gitBranch } = body;

    // Create project
    const project = await prisma.project.create({
      data: {
        name,
        description,
        gitUrl,
        gitProvider: gitProvider?.toUpperCase(),
        gitBranch: gitBranch || 'main',
        tag: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        settings: {
          notifications: true,
          autoSync: true
        },
        members: {
          create: {
            userId: (session.user as any).id,
            role: 'OWNER',
            permissions: {}
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status.toLowerCase(),
        tag: project.tag,
        createdAt: project.createdAt.toISOString(),
        owner: project.members[0]?.user || null
      }
    });

  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' }, 
      { status: 500 }
    );
  }
}