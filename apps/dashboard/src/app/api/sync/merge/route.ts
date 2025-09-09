import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { broadcastSSEEvent } from '@/app/api/sse/route';
import { SyncMerger, MergeOptions } from '@/lib/services/syncMerger';
import { TaskData, TasksFile } from '../fetch/route';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MergeRequest {
  projectId: string;
  remoteTasks?: TaskData[];
  options?: Partial<MergeOptions>;
  useCachedRemote?: boolean;
}

// Merge remote tasks with local tasks
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: MergeRequest = await request.json();
    const { projectId, remoteTasks, options, useCachedRemote } = body;

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Check if user has access
    if (project.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get remote tasks from cache or request
    let remoteTaskData: TaskData[] = remoteTasks || [];
    
    if (useCachedRemote && !remoteTasks) {
      // Try to get from last sync state
      const syncState = await prisma.syncState.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: session.user.id
          }
        }
      });

      if (syncState?.syncData && typeof syncState.syncData === 'object') {
        const data = syncState.syncData as any;
        remoteTaskData = data.tasks || [];
      }
    }

    if (remoteTaskData.length === 0 && !options?.dryRun) {
      return NextResponse.json(
        { error: 'No remote tasks provided for merge' },
        { status: 400 }
      );
    }

    // Read local tasks
    const projectRoot = process.env.PROJECT_ROOT || '/home/ihoner/claude-task-master';
    let tasksFilePath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    
    // Check with project tag if the default path doesn't exist
    try {
      await fs.access(tasksFilePath);
    } catch {
      if (project.tag) {
        tasksFilePath = path.join(projectRoot, `.taskmaster-${project.tag}`, 'tasks', 'tasks.json');
      }
    }

    const fileContent = await fs.readFile(tasksFilePath, 'utf-8');
    const tasksFile: TasksFile = JSON.parse(fileContent);
    
    const tag = project.tag || 'master';
    const localTasks = tasksFile[tag]?.tasks || tasksFile.master?.tasks || [];

    // Perform merge
    const merger = new SyncMerger(options);
    const mergeResult = merger.mergeTasks(localTasks, remoteTaskData, options);

    // If not a dry run, save the merged tasks
    if (!options?.dryRun) {
      // Create backup of current file
      const backupPath = tasksFilePath.replace('.json', `.backup-${Date.now()}.json`);
      await fs.copyFile(tasksFilePath, backupPath);

      try {
        // Update the tasks file with merged data
        if (tasksFile[tag]) {
          tasksFile[tag].tasks = mergeResult.tasks;
        } else if (tasksFile.master) {
          tasksFile.master.tasks = mergeResult.tasks;
        } else {
          // Create new structure
          tasksFile[tag] = { tasks: mergeResult.tasks };
        }

        // Write the merged file
        await fs.writeFile(
          tasksFilePath,
          JSON.stringify(tasksFile, null, 2),
          'utf-8'
        );

        // Update sync state
        await prisma.syncState.upsert({
          where: {
            projectId_userId: {
              projectId,
              userId: session.user.id
            }
          },
          update: {
            status: 'COMPLETED',
            lastSyncAt: new Date(),
            errorMessage: null,
            syncData: {
              mergeResult: {
                added: mergeResult.added,
                updated: mergeResult.updated,
                removed: mergeResult.removed,
                unchanged: mergeResult.unchanged,
                conflicts: mergeResult.conflicts.length
              },
              backupPath,
              mergedAt: new Date().toISOString()
            }
          },
          create: {
            projectId,
            userId: session.user.id,
            status: 'COMPLETED',
            lastSyncAt: new Date(),
            syncData: {
              mergeResult: {
                added: mergeResult.added,
                updated: mergeResult.updated,
                removed: mergeResult.removed,
                unchanged: mergeResult.unchanged,
                conflicts: mergeResult.conflicts.length
              },
              backupPath,
              mergedAt: new Date().toISOString()
            }
          }
        });

        // Create sync history record
        await prisma.syncHistory.create({
          data: {
            projectId,
            syncType: 'MERGE',
            status: 'COMPLETED',
            tasksAdded: mergeResult.added,
            tasksUpdated: mergeResult.updated,
            tasksRemoved: mergeResult.removed,
            syncData: {
              conflicts: mergeResult.conflicts,
              backupPath,
              options
            },
            completedAt: new Date()
          }
        });

        // Broadcast merge completion
        broadcastSSEEvent({
          type: 'merge-completed',
          projectId,
          data: {
            added: mergeResult.added,
            updated: mergeResult.updated,
            removed: mergeResult.removed,
            unchanged: mergeResult.unchanged,
            conflicts: mergeResult.conflicts.length,
            timestamp: new Date().toISOString()
          }
        });

        // Also broadcast task update since tasks have changed
        broadcastSSEEvent({
          type: 'task-update',
          projectId,
          data: {
            changeType: 'merged',
            tasks: mergeResult.tasks,
            timestamp: new Date().toISOString()
          }
        });

      } catch (writeError) {
        // Restore from backup if write failed
        await fs.copyFile(backupPath, tasksFilePath);
        
        // Update sync state with error
        await prisma.syncState.update({
          where: {
            projectId_userId: {
              projectId,
              userId: session.user.id
            }
          },
          data: {
            status: 'FAILED',
            errorMessage: writeError instanceof Error ? writeError.message : 'Failed to write merged file'
          }
        });

        throw writeError;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun: options?.dryRun || false,
      result: {
        tasks: mergeResult.tasks,
        added: mergeResult.added,
        updated: mergeResult.updated,
        removed: mergeResult.removed,
        unchanged: mergeResult.unchanged,
        conflicts: mergeResult.conflicts
      },
      message: options?.dryRun 
        ? `Dry run completed: ${mergeResult.added} additions, ${mergeResult.updated} updates, ${mergeResult.removed} removals`
        : `Merge completed: ${mergeResult.added} additions, ${mergeResult.updated} updates, ${mergeResult.removed} removals`
    });

  } catch (error) {
    console.error('❌ Merge error:', error);
    
    // Broadcast merge failure
    broadcastSSEEvent({
      type: 'merge-failed',
      projectId: request.nextUrl.searchParams.get('projectId') || '',
      data: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json(
      { 
        error: 'Failed to merge task data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Rollback to a previous backup
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const backupPath = searchParams.get('backupPath');

  if (!projectId || !backupPath) {
    return NextResponse.json(
      { error: 'Project ID and backup path required' },
      { status: 400 }
    );
  }

  try {
    // Verify user has access to project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!project || project.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Restore from backup
    const projectRoot = process.env.PROJECT_ROOT || '/home/ihoner/claude-task-master';
    let tasksFilePath = path.join(projectRoot, '.taskmaster', 'tasks', 'tasks.json');
    
    if (project.tag) {
      const altPath = path.join(projectRoot, `.taskmaster-${project.tag}`, 'tasks', 'tasks.json');
      try {
        await fs.access(altPath);
        tasksFilePath = altPath;
      } catch {
        // Use default path
      }
    }

    // Verify backup exists
    await fs.access(backupPath);
    
    // Restore the backup
    await fs.copyFile(backupPath, tasksFilePath);

    // Update sync state
    await prisma.syncState.update({
      where: {
        projectId_userId: {
          projectId,
          userId: session.user.id
        }
      },
      data: {
        status: 'IDLE',
        syncData: {
          rolledBackAt: new Date().toISOString(),
          rolledBackFrom: backupPath
        }
      }
    });

    // Create history record
    await prisma.syncHistory.create({
      data: {
        projectId,
        syncType: 'ROLLBACK',
        status: 'COMPLETED',
        tasksAdded: 0,
        tasksUpdated: 0,
        tasksRemoved: 0,
        syncData: {
          backupPath,
          restoredAt: new Date().toISOString()
        },
        completedAt: new Date()
      }
    });

    // Broadcast rollback event
    broadcastSSEEvent({
      type: 'merge-rollback',
      projectId,
      data: {
        backupPath,
        timestamp: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Successfully rolled back to backup',
      backupPath
    });

  } catch (error) {
    console.error('❌ Rollback error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to rollback',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}