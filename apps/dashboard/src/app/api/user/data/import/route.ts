import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

// POST - Import user data from JSON file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const strategy = formData.get('strategy') as string || 'merge'; // merge, replace, skip

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.name.endsWith('.json')) {
      return NextResponse.json(
        { error: 'Only JSON files are supported' },
        { status: 400 }
      );
    }

    // Read and parse file
    const text = await file.text();
    let importData: any;
    
    try {
      importData = JSON.parse(text);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON format' },
        { status: 400 }
      );
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const results = {
      projectsImported: 0,
      tasksImported: 0,
      settingsUpdated: false,
      conflicts: [] as any[],
      errors: [] as any[],
    };

    // Import projects if present
    if (importData.projects && Array.isArray(importData.projects)) {
      for (const projectData of importData.projects) {
        try {
          // Check for existing project
          const existingProject = await prisma.project.findFirst({
            where: {
              name: projectData.name,
              members: {
                some: {
                  userId: user.id,
                },
              },
            },
          });

          if (existingProject) {
            if (strategy === 'skip') {
              results.conflicts.push({
                type: 'project',
                name: projectData.name,
                action: 'skipped',
              });
              continue;
            } else if (strategy === 'replace') {
              // Delete existing project and its data
              await prisma.task.deleteMany({
                where: { projectId: existingProject.id },
              });
              await prisma.projectMember.deleteMany({
                where: { projectId: existingProject.id },
              });
              await prisma.project.delete({
                where: { id: existingProject.id },
              });
            } else {
              // merge - skip this project but continue with tasks
              results.conflicts.push({
                type: 'project',
                name: projectData.name,
                action: 'merged',
              });
              continue;
            }
          }

          // Create new project
          const newProject = await prisma.project.create({
            data: {
              name: projectData.name,
              description: projectData.description,
              status: projectData.status || 'ACTIVE',
              visibility: projectData.visibility || 'PRIVATE',
              gitUrl: projectData.gitUrl,
              gitBranch: projectData.gitBranch || 'main',
              tag: projectData.tag,
              settings: projectData.settings || {},
              members: {
                create: {
                  userId: user.id,
                  role: 'OWNER',
                  permissions: {},
                },
              },
            },
          });

          results.projectsImported++;

          // Import tasks for this project if they exist in the data
          if (importData.tasks && Array.isArray(importData.tasks)) {
            const projectTasks = importData.tasks.filter(
              (t: any) => t.projectName === projectData.name
            );

            for (const taskData of projectTasks) {
              try {
                await prisma.task.create({
                  data: {
                    projectId: newProject.id,
                    taskId: taskData.taskId,
                    title: taskData.title,
                    description: taskData.description,
                    status: taskData.status || 'PENDING',
                    priority: taskData.priority || 'MEDIUM',
                    complexity: taskData.complexity,
                    details: taskData.details,
                    testStrategy: taskData.testStrategy,
                    data: taskData.data || {},
                  },
                });
                results.tasksImported++;
              } catch (error: any) {
                results.errors.push({
                  type: 'task',
                  id: taskData.taskId,
                  error: error.message,
                });
              }
            }
          }
        } catch (error: any) {
          results.errors.push({
            type: 'project',
            name: projectData.name,
            error: error.message,
          });
        }
      }
    }

    // Import settings if present
    if (importData.settings) {
      try {
        // Update theme preferences
        if (importData.settings.theme) {
          await prisma.themePreference.upsert({
            where: { userId: user.id },
            update: importData.settings.theme,
            create: {
              userId: user.id,
              ...importData.settings.theme,
            },
          });
        }

        // Update email preferences
        if (importData.settings.email) {
          await prisma.emailPreference.upsert({
            where: { userId: user.id },
            update: importData.settings.email,
            create: {
              userId: user.id,
              ...importData.settings.email,
            },
          });
        }

        results.settingsUpdated = true;
      } catch (error: any) {
        results.errors.push({
          type: 'settings',
          error: error.message,
        });
      }
    }

    // Import notification preferences if present
    if (importData.notificationPreferences && Array.isArray(importData.notificationPreferences)) {
      for (const pref of importData.notificationPreferences) {
        try {
          await prisma.notificationPreference.upsert({
            where: {
              userId_type: {
                userId: user.id,
                type: pref.type,
              },
            },
            update: {
              enabled: pref.enabled,
              channels: pref.channels,
            },
            create: {
              userId: user.id,
              type: pref.type,
              enabled: pref.enabled,
              channels: pref.channels,
            },
          });
        } catch (error: any) {
          results.errors.push({
            type: 'notificationPreference',
            error: error.message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      results,
      message: `Import completed. Projects: ${results.projectsImported}, Tasks: ${results.tasksImported}`,
    });
  } catch (error: any) {
    console.error('Error importing user data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import user data' },
      { status: 500 }
    );
  }
}

// POST - Validate import file without actually importing
export async function OPTIONS(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read and parse file
    const text = await file.text();
    let importData: any;
    
    try {
      importData = JSON.parse(text);
    } catch (error) {
      return NextResponse.json({
        valid: false,
        error: 'Invalid JSON format',
      });
    }

    // Validate structure
    const validation = {
      valid: true,
      stats: {
        projects: 0,
        tasks: 0,
        notifications: 0,
        settings: false,
        apiKeys: 0,
      },
      warnings: [] as string[],
    };

    if (importData.projects && Array.isArray(importData.projects)) {
      validation.stats.projects = importData.projects.length;
    }

    if (importData.tasks && Array.isArray(importData.tasks)) {
      validation.stats.tasks = importData.tasks.length;
    }

    if (importData.notifications && Array.isArray(importData.notifications)) {
      validation.stats.notifications = importData.notifications.length;
    }

    if (importData.settings) {
      validation.stats.settings = true;
    }

    if (importData.apiKeys && Array.isArray(importData.apiKeys)) {
      validation.stats.apiKeys = importData.apiKeys.length;
      validation.warnings.push('API keys will not be imported for security reasons');
    }

    // Check for potential conflicts
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        projects: {
          include: {
            members: true,
          },
        },
      },
    });

    if (user && importData.projects) {
      const existingProjectNames = user.projects.map(p => p.name);
      const conflictingProjects = importData.projects.filter((p: any) =>
        existingProjectNames.includes(p.name)
      );
      
      if (conflictingProjects.length > 0) {
        validation.warnings.push(
          `${conflictingProjects.length} project(s) already exist with the same name`
        );
      }
    }

    return NextResponse.json(validation);
  } catch (error: any) {
    console.error('Error validating import file:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to validate import file' },
      { status: 500 }
    );
  }
}