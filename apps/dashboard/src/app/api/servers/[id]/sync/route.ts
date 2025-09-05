import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { NodeSSH } from 'node-ssh';
import fs from 'fs/promises';

interface RouteParams {
  id: string;
}

async function mapTaskStatus(status: string): Promise<string> {
  switch (status?.toLowerCase()) {
    case 'done':
    case 'completed':
      return 'DONE';
    case 'in-progress':
    case 'in_progress':
      return 'IN_PROGRESS';
    case 'blocked':
      return 'BLOCKED';
    case 'review':
      return 'REVIEW';
    case 'cancelled':
      return 'CANCELLED';
    case 'deferred':
      return 'DEFERRED';
    default:
      return 'PENDING';
  }
}

async function mapTaskPriority(priority: string): Promise<string> {
  switch (priority?.toLowerCase()) {
    case 'high':
    case 'critical':
      return 'HIGH';
    case 'low':
      return 'LOW';
    default:
      return 'MEDIUM';
  }
}

async function mapComplexity(complexity: string | number | null): Promise<number | null> {
  if (!complexity) return null;
  
  if (typeof complexity === 'number') return complexity;
  
  if (typeof complexity === 'string') {
    switch (complexity.toLowerCase()) {
      case 'low':
      case 'simple':
        return 1;
      case 'medium':
      case 'moderate':
        return 5;
      case 'high':
      case 'complex':
        return 8;
      default:
        // Try to parse as number
        const parsed = parseInt(complexity);
        return isNaN(parsed) ? null : parsed;
    }
  }
  
  return null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: RouteParams }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get server details
    const server = await prisma.server.findUnique({
      where: { id: params.id }
    });

    if (!server) {
      return NextResponse.json({ error: 'Server not found' }, { status: 404 });
    }

    // Create sync history record
    const syncRecord = await prisma.syncHistory.create({
      data: {
        serverId: server.id,
        userId: (session.user as any).id,
        syncType: 'MANUAL',
        status: 'RUNNING'
      }
    });

    try {
      // Connect to remote server via SSH
      const ssh = new NodeSSH();
      
      const connectionOptions: any = {
        host: server.host,
        port: server.port,
        username: server.username,
      };

      if (server.privateKey) {
        connectionOptions.privateKey = server.privateKey;
      } else if (server.password) {
        connectionOptions.password = server.password;
      } else {
        throw new Error('No authentication method configured (missing both private key and password)');
      }

      await ssh.connect(connectionOptions);

      // Check if .taskmaster directory exists
      const tasksFilePath = `${server.projectPath}/.taskmaster/tasks/tasks.json`;
      console.log('Looking for tasks file at:', tasksFilePath);
      const { stdout: fileExists } = await ssh.execCommand(`test -f ${tasksFilePath} && echo "exists" || echo "missing"`);

      if (fileExists.trim() !== 'exists') {
        throw new Error(`Task Master not found at ${server.projectPath}/.taskmaster/`);
      }

      // Read the remote tasks.json file
      const { stdout: tasksData } = await ssh.execCommand(`cat ${tasksFilePath}`);
      
      if (!tasksData) {
        throw new Error('Failed to read tasks.json file');
      }

      const tasksJson = JSON.parse(tasksData);
      console.log('Raw tasks JSON structure:', Object.keys(tasksJson));
      console.log('Full JSON preview:', JSON.stringify(tasksJson, null, 2).substring(0, 1000));

      // Get available tags
      const availableTags = Object.keys(tasksJson).filter(key => 
        typeof tasksJson[key] === 'object' && 
        tasksJson[key].tasks && 
        Array.isArray(tasksJson[key].tasks)
      );
      console.log('Available tags found:', availableTags);

      let totalTasksImported = 0;
      let totalProjectsCreated = 0;
      let totalProjectsUpdated = 0;

      // Import projects from each tag
      for (const tagName of availableTags) {
        const tasks = tasksJson[tagName]?.tasks || [];
        console.log(`Processing tag "${tagName}" with ${tasks.length} tasks`);
        
        if (tasks.length === 0) {
          console.log(`Skipping tag "${tagName}" - no tasks found`);
          continue;
        }

        // Create or update project for this tag
        const project = await prisma.project.upsert({
          where: {
            serverId_tag: {
              serverId: server.id,
              tag: tagName
            }
          },
          update: {
            updatedAt: new Date(),
            lastSyncAt: new Date()
          },
          create: {
            name: `${tagName.charAt(0).toUpperCase() + tagName.slice(1)} (${server.name})`,
            description: `Remote Task Master project from ${server.name}`,
            tag: tagName,
            serverId: server.id,
            status: 'ACTIVE',
            visibility: 'PRIVATE',
            gitUrl: null,
            gitProvider: null,
            gitBranch: 'main',
            settings: {
              notifications: true,
              autoSync: true,
              remoteSync: true
            },
            members: {
              create: {
                userId: (session.user as any).id,
                role: 'OWNER',
                permissions: {}
              }
            }
          }
        });

        const isNewProject = !project.updatedAt || project.createdAt.getTime() === project.updatedAt.getTime();
        if (isNewProject) {
          totalProjectsCreated++;
        } else {
          totalProjectsUpdated++;
        }

        // Clear existing tasks for clean import
        await prisma.task.deleteMany({
          where: { projectId: project.id }
        });

        // Import tasks
        let taskCount = 0;
        for (const task of tasks) {
          try {
            const status = await mapTaskStatus(task.status);
            const priority = await mapTaskPriority(task.priority);
            const complexity = await mapComplexity(task.complexity);

            await prisma.task.create({
              data: {
                projectId: project.id,
                taskId: String(task.id),
                title: task.title || `Task ${task.id}`,
                description: task.description || '',
                status: status as any,
                priority: priority as any,
                complexity: complexity,
                details: task.details || null,
                testStrategy: task.testStrategy || null,
                data: task
              }
            });

            taskCount++;
          } catch (error) {
            console.error(`Failed to import task ${task.id}:`, error);
          }
        }

        totalTasksImported += taskCount;
      }

      // Disconnect SSH
      ssh.dispose();

      // Update sync record as completed
      await prisma.syncHistory.update({
        where: { id: syncRecord.id },
        data: {
          status: 'COMPLETED',
          tasksAdded: totalTasksImported,
          tasksUpdated: 0,
          tasksRemoved: 0,
          completedAt: new Date(),
          syncData: {
            projectsCreated: totalProjectsCreated,
            projectsUpdated: totalProjectsUpdated,
            tagsProcessed: availableTags.length
          }
        }
      });

      // Update server last ping
      await prisma.server.update({
        where: { id: server.id },
        data: {
          lastPingAt: new Date(),
          isReachable: true,
          status: 'ACTIVE'
        }
      });

      return NextResponse.json({
        success: true,
        result: {
          projectsCreated: totalProjectsCreated,
          projectsUpdated: totalProjectsUpdated,
          tasksImported: totalTasksImported,
          tagsProcessed: availableTags.length,
          syncId: syncRecord.id
        }
      });

    } catch (error) {
      // Update sync record as failed
      await prisma.syncHistory.update({
        where: { id: syncRecord.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      // Update server status
      await prisma.server.update({
        where: { id: server.id },
        data: {
          isReachable: false,
          lastPingAt: new Date()
        }
      });

      throw error;
    }

  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to sync server' },
      { status: 500 }
    );
  }
}