import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

interface RouteParams {
  id: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const server = await prisma.server.findUnique({
      where: { id: params.id },
      include: {
        projects: {
          include: {
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
          }
        },
        syncHistory: {
          orderBy: { startedAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            projects: true,
            syncHistory: true
          }
        }
      }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Transform the data
    const transformedServer = {
      id: server.id,
      name: server.name,
      description: server.description,
      host: server.host,
      port: server.port,
      username: server.username,
      hasPrivateKey: !!server.privateKey,
      projectPath: server.projectPath,
      status: server.status.toLowerCase(),
      lastPingAt: server.lastPingAt?.toISOString() || null,
      isReachable: server.isReachable,
      settings: server.settings,
      createdAt: server.createdAt.toISOString(),
      updatedAt: server.updatedAt.toISOString(),
      projectCount: server._count.projects,
      syncCount: server._count.syncHistory,
      projects: server.projects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status.toLowerCase(),
        tag: p.tag,
        totalTasks: p._count.tasks,
        completedTasks: p.tasks.filter(t => t.status === 'DONE').length,
        memberCount: p._count.members
      })),
      recentSync: server.syncHistory.map(s => ({
        id: s.id,
        status: s.status.toLowerCase(),
        syncType: s.syncType.toLowerCase(),
        tasksAdded: s.tasksAdded,
        tasksUpdated: s.tasksUpdated,
        startedAt: s.startedAt.toISOString(),
        completedAt: s.completedAt?.toISOString() || null,
        errorMessage: s.errorMessage
      }))
    };

    return NextResponse.json({ server: transformedServer });

  } catch (error) {
    console.error('Error fetching server details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch server details' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      host,
      port,
      username,
      authMethod,
      privateKey,
      password,
      projectPath,
      status,
      settings
    } = body;

    // Validate required fields
    if (!name || !host || !username || !projectPath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (host !== undefined) updateData.host = host;
    if (port !== undefined) updateData.port = parseInt(port) || 22;
    if (username !== undefined) updateData.username = username;
    if (projectPath !== undefined) updateData.projectPath = projectPath;
    if (status !== undefined) updateData.status = status.toUpperCase();
    if (settings !== undefined) updateData.settings = settings;

    // Handle authentication method updates
    if (privateKey) {
      updateData.privateKey = privateKey;
      updateData.password = null; // Clear password if using key
    } else if (password) {
      updateData.password = password;
      updateData.privateKey = null; // Clear key if using password
    }

    const server = await prisma.server.update({
      where: { id: params.id },
      data: updateData
    });

    return NextResponse.json({
      success: true,
      server: {
        id: server.id,
        name: server.name,
        status: server.status.toLowerCase(),
        updatedAt: server.updatedAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error updating server:', error);
    return NextResponse.json(
      { error: 'Failed to update server' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if server has projects
    const projectCount = await prisma.project.count({
      where: { serverId: params.id }
    });

    if (projectCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete server with ${projectCount} projects. Remove projects first.` },
        { status: 400 }
      );
    }

    await prisma.server.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting server:', error);
    return NextResponse.json(
      { error: 'Failed to delete server' },
      { status: 500 }
    );
  }
}