import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    // Get servers with project counts
    const [servers, total] = await Promise.all([
      prisma.server.findMany({
        include: {
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              tag: true
            }
          },
          _count: {
            select: {
              projects: true,
              syncHistory: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.server.count()
    ]);

    // Transform the data for the frontend
    const transformedServers = servers.map(server => ({
      id: server.id,
      name: server.name,
      description: server.description,
      host: server.host,
      port: server.port,
      username: server.username,
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
        tag: p.tag
      }))
    }));

    return NextResponse.json({
      servers: transformedServers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching servers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch servers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      port = 22,
      username,
      privateKey,
      projectPath,
      settings = {}
    } = body;

    // Basic validation
    if (!name || !host || !username || !projectPath) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, username, projectPath' },
        { status: 400 }
      );
    }

    // Create server
    const server = await prisma.server.create({
      data: {
        name,
        description,
        host,
        port,
        username,
        privateKey, // Note: In production, encrypt this!
        projectPath,
        status: 'ACTIVE',
        settings
      }
    });

    return NextResponse.json({
      success: true,
      server: {
        id: server.id,
        name: server.name,
        description: server.description,
        host: server.host,
        port: server.port,
        username: server.username,
        projectPath: server.projectPath,
        status: server.status.toLowerCase(),
        createdAt: server.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error('Error creating server:', error);
    return NextResponse.json(
      { error: 'Failed to create server' },
      { status: 500 }
    );
  }
}