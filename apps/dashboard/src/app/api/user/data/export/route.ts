import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { Parser } from 'json2csv';

// GET - Export user data in JSON or CSV format
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json';
    const dataTypes = searchParams.get('types')?.split(',') || ['all'];

    // Get user data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        projects: {
          include: {
            tasks: true,
            members: {
              include: {
                user: {
                  select: {
                    email: true,
                    name: true,
                  },
                },
              },
            },
            server: true,
          },
        },
        projectMembers: {
          include: {
            project: true,
          },
        },
        notifications: true,
        notificationPreferences: true,
        themePreferences: true,
        emailPreferences: true,
        apiKeys: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            lastUsedAt: true,
            expiresAt: true,
            // Don't include the actual key for security
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare export data based on requested types
    let exportData: any = {
      exportDate: new Date().toISOString(),
      format,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt,
      },
    };

    if (dataTypes.includes('all') || dataTypes.includes('projects')) {
      exportData.projects = user.projects.map(project => ({
        id: project.id,
        name: project.name,
        description: project.description,
        status: project.status,
        visibility: project.visibility,
        gitUrl: project.gitUrl,
        gitBranch: project.gitBranch,
        tag: project.tag,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        taskCount: project.tasks.length,
        memberCount: project.members.length,
      }));
    }

    if (dataTypes.includes('all') || dataTypes.includes('tasks')) {
      exportData.tasks = user.projects.flatMap(project => 
        project.tasks.map(task => ({
          id: task.id,
          projectId: task.projectId,
          projectName: project.name,
          taskId: task.taskId,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          complexity: task.complexity,
          details: task.details,
          testStrategy: task.testStrategy,
          createdAt: task.createdAt,
          updatedAt: task.updatedAt,
        }))
      );
    }

    if (dataTypes.includes('all') || dataTypes.includes('notifications')) {
      exportData.notifications = user.notifications.map(notif => ({
        id: notif.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        isRead: notif.isRead,
        metadata: notif.metadata,
        createdAt: notif.createdAt,
      }));

      exportData.notificationPreferences = user.notificationPreferences;
    }

    if (dataTypes.includes('all') || dataTypes.includes('settings')) {
      exportData.settings = {
        theme: user.themePreferences,
        email: user.emailPreferences,
      };
    }

    if (dataTypes.includes('all') || dataTypes.includes('apiKeys')) {
      exportData.apiKeys = user.apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
      }));
    }

    // Format response based on requested format
    if (format === 'csv') {
      // Flatten data for CSV export
      const flattenedData: any[] = [];
      
      // Export projects as CSV
      if (exportData.projects) {
        flattenedData.push(...exportData.projects.map((p: any) => ({
          type: 'project',
          ...p,
        })));
      }
      
      // Export tasks as CSV
      if (exportData.tasks) {
        flattenedData.push(...exportData.tasks.map((t: any) => ({
          type: 'task',
          ...t,
        })));
      }

      // Export notifications as CSV
      if (exportData.notifications) {
        flattenedData.push(...exportData.notifications.map((n: any) => ({
          type: 'notification',
          ...n,
        })));
      }

      if (flattenedData.length === 0) {
        return NextResponse.json(
          { error: 'No data to export' },
          { status: 400 }
        );
      }

      const parser = new Parser();
      const csv = parser.parse(flattenedData);
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="taskmaster-export-${Date.now()}.csv"`,
        },
      });
    } else {
      // JSON export
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="taskmaster-export-${Date.now()}.json"`,
        },
      });
    }
  } catch (error: any) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export user data' },
      { status: 500 }
    );
  }
}