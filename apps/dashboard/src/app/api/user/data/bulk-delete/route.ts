import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

// Store deleted data temporarily for undo functionality (in-memory for simplicity)
// In production, this should be stored in Redis or a similar cache
const deletionCache = new Map<string, any>();

// POST - Bulk delete selected items
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, ids, permanent = false } = body;

    if (!type || !ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request. Provide type and ids array' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const undoToken = `undo_${user.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const deletedData: any = {
      type,
      userId: user.id,
      timestamp: new Date(),
      items: [],
    };

    let deletedCount = 0;

    switch (type) {
      case 'tasks':
        // Verify ownership and store data for undo
        const tasksToDelete = await prisma.task.findMany({
          where: {
            id: { in: ids },
            project: {
              members: {
                some: {
                  userId: user.id,
                  role: { in: ['OWNER', 'ADMIN'] },
                },
              },
            },
          },
        });

        if (!permanent) {
          deletedData.items = tasksToDelete;
        }

        // Delete the tasks
        const deletedTasks = await prisma.task.deleteMany({
          where: {
            id: { in: tasksToDelete.map(t => t.id) },
          },
        });
        deletedCount = deletedTasks.count;
        break;

      case 'projects':
        // Verify ownership
        const projectsToDelete = await prisma.project.findMany({
          where: {
            id: { in: ids },
            members: {
              some: {
                userId: user.id,
                role: 'OWNER',
              },
            },
          },
          include: {
            tasks: true,
            members: true,
          },
        });

        if (!permanent) {
          deletedData.items = projectsToDelete;
        }

        // Delete projects and related data
        for (const project of projectsToDelete) {
          await prisma.task.deleteMany({ where: { projectId: project.id } });
          await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
          await prisma.syncHistory.deleteMany({ where: { projectId: project.id } });
          await prisma.project.delete({ where: { id: project.id } });
          deletedCount++;
        }
        break;

      case 'notifications':
        // Store notifications for undo
        const notificationsToDelete = await prisma.notification.findMany({
          where: {
            id: { in: ids },
            userId: user.id,
          },
        });

        if (!permanent) {
          deletedData.items = notificationsToDelete;
        }

        // Delete notifications
        const deletedNotifications = await prisma.notification.deleteMany({
          where: {
            id: { in: notificationsToDelete.map(n => n.id) },
          },
        });
        deletedCount = deletedNotifications.count;
        break;

      case 'apiKeys':
        // Store API keys for undo (without the actual key for security)
        const apiKeysToDelete = await prisma.apiKey.findMany({
          where: {
            id: { in: ids },
            userId: user.id,
          },
          select: {
            id: true,
            name: true,
            createdAt: true,
            expiresAt: true,
          },
        });

        if (!permanent) {
          deletedData.items = apiKeysToDelete;
        }

        // Delete API keys
        const deletedApiKeys = await prisma.apiKey.deleteMany({
          where: {
            id: { in: apiKeysToDelete.map(k => k.id) },
          },
        });
        deletedCount = deletedApiKeys.count;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Supported types: tasks, projects, notifications, apiKeys' },
          { status: 400 }
        );
    }

    // Store in cache for undo (expires after 5 minutes)
    if (!permanent && deletedCount > 0) {
      deletionCache.set(undoToken, deletedData);
      setTimeout(() => {
        deletionCache.delete(undoToken);
      }, 5 * 60 * 1000); // 5 minutes
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      undoToken: !permanent ? undoToken : null,
      undoExpiresAt: !permanent ? new Date(Date.now() + 5 * 60 * 1000) : null,
      message: `Successfully deleted ${deletedCount} ${type}`,
    });
  } catch (error: any) {
    console.error('Error in bulk delete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete items' },
      { status: 500 }
    );
  }
}

// PUT - Undo bulk deletion
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { undoToken } = body;

    if (!undoToken) {
      return NextResponse.json(
        { error: 'Undo token is required' },
        { status: 400 }
      );
    }

    const deletedData = deletionCache.get(undoToken);

    if (!deletedData) {
      return NextResponse.json(
        { error: 'Undo token expired or invalid' },
        { status: 404 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || user.id !== deletedData.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to undo this deletion' },
        { status: 403 }
      );
    }

    let restoredCount = 0;

    switch (deletedData.type) {
      case 'tasks':
        for (const task of deletedData.items) {
          try {
            await prisma.task.create({
              data: {
                ...task,
                createdAt: task.createdAt,
                updatedAt: new Date(),
              },
            });
            restoredCount++;
          } catch (error) {
            console.error(`Failed to restore task ${task.id}:`, error);
          }
        }
        break;

      case 'projects':
        for (const project of deletedData.items) {
          try {
            // Restore project
            const restoredProject = await prisma.project.create({
              data: {
                name: project.name,
                description: project.description,
                status: project.status,
                visibility: project.visibility,
                gitUrl: project.gitUrl,
                gitBranch: project.gitBranch,
                tag: project.tag,
                settings: project.settings,
                serverId: project.serverId,
                createdAt: project.createdAt,
                updatedAt: new Date(),
              },
            });

            // Restore members
            for (const member of project.members) {
              await prisma.projectMember.create({
                data: {
                  projectId: restoredProject.id,
                  userId: member.userId,
                  role: member.role,
                  permissions: member.permissions,
                },
              });
            }

            // Restore tasks
            for (const task of project.tasks) {
              await prisma.task.create({
                data: {
                  ...task,
                  projectId: restoredProject.id,
                  createdAt: task.createdAt,
                  updatedAt: new Date(),
                },
              });
            }

            restoredCount++;
          } catch (error) {
            console.error(`Failed to restore project ${project.id}:`, error);
          }
        }
        break;

      case 'notifications':
        for (const notification of deletedData.items) {
          try {
            await prisma.notification.create({
              data: {
                ...notification,
                createdAt: notification.createdAt,
              },
            });
            restoredCount++;
          } catch (error) {
            console.error(`Failed to restore notification ${notification.id}:`, error);
          }
        }
        break;

      case 'apiKeys':
        // Cannot restore API keys for security reasons
        return NextResponse.json(
          { error: 'API keys cannot be restored for security reasons. Please create new ones.' },
          { status: 400 }
        );

      default:
        return NextResponse.json(
          { error: 'Invalid type for undo' },
          { status: 400 }
        );
    }

    // Remove from cache after successful undo
    deletionCache.delete(undoToken);

    return NextResponse.json({
      success: true,
      restoredCount,
      message: `Successfully restored ${restoredCount} ${deletedData.type}`,
    });
  } catch (error: any) {
    console.error('Error in undo bulk delete:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to undo deletion' },
      { status: 500 }
    );
  }
}

// GET - Get pending undo operations
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get all pending undo operations for this user
    const pendingUndos: any[] = [];
    for (const [token, data] of deletionCache.entries()) {
      if (data.userId === user.id) {
        pendingUndos.push({
          token,
          type: data.type,
          itemCount: data.items.length,
          timestamp: data.timestamp,
          expiresAt: new Date(data.timestamp.getTime() + 5 * 60 * 1000),
        });
      }
    }

    return NextResponse.json({
      pendingUndos,
      total: pendingUndos.length,
    });
  } catch (error: any) {
    console.error('Error fetching pending undos:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending undos' },
      { status: 500 }
    );
  }
}