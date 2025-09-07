import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

// GET - Get current data retention settings
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
      select: {
        id: true,
        dataRetentionDays: true,
        lastDataCleanup: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get data statistics
    const [notificationCount, oldTaskCount, completedProjectCount] = await Promise.all([
      prisma.notification.count({
        where: {
          userId: user.id,
          createdAt: {
            lt: new Date(Date.now() - (user.dataRetentionDays || 90) * 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.task.count({
        where: {
          project: {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
          status: 'DONE',
          updatedAt: {
            lt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months
          },
        },
      }),
      prisma.project.count({
        where: {
          members: {
            some: {
              userId: user.id,
            },
          },
          status: 'ARCHIVED',
          updatedAt: {
            lt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year
          },
        },
      }),
    ]);

    return NextResponse.json({
      retentionDays: user.dataRetentionDays || 90,
      lastCleanup: user.lastDataCleanup,
      dataToClean: {
        notifications: notificationCount,
        completedTasks: oldTaskCount,
        archivedProjects: completedProjectCount,
      },
    });
  } catch (error: any) {
    console.error('Error fetching retention settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch retention settings' },
      { status: 500 }
    );
  }
}

// PUT - Update data retention settings
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
    const { retentionDays, autoCleanup } = body;

    if (retentionDays && (retentionDays < 7 || retentionDays > 3650)) {
      return NextResponse.json(
        { error: 'Retention days must be between 7 and 3650' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: {
        dataRetentionDays: retentionDays,
        autoDataCleanup: autoCleanup !== undefined ? autoCleanup : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      retentionDays: user.dataRetentionDays,
      autoCleanup: user.autoDataCleanup,
    });
  } catch (error: any) {
    console.error('Error updating retention settings:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update retention settings' },
      { status: 500 }
    );
  }
}

// DELETE - Execute data cleanup based on retention policy
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const dryRun = searchParams.get('dryRun') === 'true';

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const retentionDays = user.dataRetentionDays || 90;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    if (dryRun) {
      // Just return what would be deleted
      const [notifications, tasks, projects] = await Promise.all([
        prisma.notification.count({
          where: {
            userId: user.id,
            createdAt: { lt: cutoffDate },
          },
        }),
        prisma.task.count({
          where: {
            project: {
              members: {
                some: {
                  userId: user.id,
                  role: 'OWNER',
                },
              },
            },
            status: 'DONE',
            updatedAt: { lt: cutoffDate },
          },
        }),
        prisma.project.count({
          where: {
            members: {
              some: {
                userId: user.id,
                role: 'OWNER',
              },
            },
            status: 'ARCHIVED',
            updatedAt: { lt: cutoffDate },
          },
        }),
      ]);

      return NextResponse.json({
        dryRun: true,
        wouldDelete: {
          notifications,
          tasks,
          projects,
        },
      });
    }

    // Perform actual deletion
    const results = {
      deletedNotifications: 0,
      deletedTasks: 0,
      deletedProjects: 0,
    };

    // Delete old notifications
    const deletedNotifications = await prisma.notification.deleteMany({
      where: {
        userId: user.id,
        createdAt: { lt: cutoffDate },
      },
    });
    results.deletedNotifications = deletedNotifications.count;

    // Delete old completed tasks (only if user is owner)
    const deletedTasks = await prisma.task.deleteMany({
      where: {
        project: {
          members: {
            some: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
        status: 'DONE',
        updatedAt: { lt: cutoffDate },
      },
    });
    results.deletedTasks = deletedTasks.count;

    // Delete old archived projects (only if user is owner)
    const projectsToDelete = await prisma.project.findMany({
      where: {
        members: {
          some: {
            userId: user.id,
            role: 'OWNER',
          },
        },
        status: 'ARCHIVED',
        updatedAt: { lt: cutoffDate },
      },
      select: { id: true },
    });

    for (const project of projectsToDelete) {
      // Delete all related data first
      await prisma.task.deleteMany({ where: { projectId: project.id } });
      await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
      await prisma.syncHistory.deleteMany({ where: { projectId: project.id } });
      await prisma.project.delete({ where: { id: project.id } });
      results.deletedProjects++;
    }

    // Update last cleanup date
    await prisma.user.update({
      where: { id: user.id },
      data: { lastDataCleanup: new Date() },
    });

    return NextResponse.json({
      success: true,
      results,
      message: `Cleaned up ${results.deletedNotifications} notifications, ${results.deletedTasks} tasks, and ${results.deletedProjects} projects`,
    });
  } catch (error: any) {
    console.error('Error executing data cleanup:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to execute data cleanup' },
      { status: 500 }
    );
  }
}