import { TaskMasterParser, ParsedTask, ParsedConfig, SyncDiff } from './task-parser';
import { GitService, UnifiedRepository } from '../git/git-service';
import { prisma } from '../database';
import { cacheService } from '../redis';
import { addSyncJob } from '../jobs/sync-queue';

export interface SyncOptions {
  strategy: 'merge' | 'overwrite' | 'manual';
  conflictResolution: 'timestamp' | 'remote-wins' | 'local-wins' | 'manual';
  validateBeforeSync: boolean;
  createBackup: boolean;
  notifyClients: boolean;
}

export interface SyncResult {
  success: boolean;
  projectId: string;
  syncHistoryId?: string;
  changes: {
    tasksAdded: number;
    tasksUpdated: number;
    tasksRemoved: number;
    conflictsResolved: number;
  };
  metadata: {
    syncType: 'full' | 'incremental';
    duration: number;
    errors: string[];
    warnings: string[];
  };
}

export interface ConflictResolution {
  taskId: string;
  resolution: 'local' | 'remote' | 'merge' | 'skip';
  mergedTask?: ParsedTask;
  reason?: string;
}

export class SyncEngine {
  private static readonly SYNC_LOCK_TTL = 300; // 5 minutes
  private static readonly BATCH_SIZE = 100;
  private static readonly MAX_RETRIES = 3;

  // Main sync method - syncs repository with database
  static async syncRepository(
    repository: UnifiedRepository,
    options: Partial<SyncOptions> = {}
  ): Promise<SyncResult> {
    const defaultOptions: SyncOptions = {
      strategy: 'merge',
      conflictResolution: 'timestamp',
      validateBeforeSync: true,
      createBackup: false,
      notifyClients: true,
    };

    const finalOptions = { ...defaultOptions, ...options };
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Acquire sync lock to prevent concurrent syncs
      const lockKey = `sync:${repository.id}`;
      const lockAcquired = await this.acquireSyncLock(lockKey);
      
      if (!lockAcquired) {
        throw new Error('Sync already in progress for this repository');
      }

      let syncHistoryId: string;
      let project: any;

      try {
        // Find or create project
        project = await this.findOrCreateProject(repository);
        
        // Create sync history entry
        const syncHistory = await prisma.syncHistory.create({
          data: {
            projectId: project.id,
            syncType: 'MANUAL',
            status: 'RUNNING',
            syncData: {
              repository: repository.fullName,
              provider: repository.provider,
              options: finalOptions,
            },
          },
        });
        syncHistoryId = syncHistory.id;

        // Get Task Master data from repository
        const gitService = await GitService.createFromUser(project.members[0]?.userId || 'system');
        const { config, tasks } = await gitService.getTaskMasterProjectData(repository);

        if (!tasks) {
          warnings.push('No tasks.json file found in repository');
        }

        // Parse tasks
        const parsingResult = TaskMasterParser.parseTasksFile(
          JSON.stringify(tasks || []),
          config?.tag
        );

        if (parsingResult.metadata.parsingErrors.length > 0) {
          warnings.push(...parsingResult.metadata.parsingErrors);
        }

        // Get current tasks from database
        const currentDbTasks = await this.getProjectTasks(project.id);
        
        // Generate diff
        const diff = TaskMasterParser.generateDiff(
          currentDbTasks,
          parsingResult.tasks,
          {
            conflictStrategy: finalOptions.conflictResolution,
            deepCompare: true,
          }
        );

        // Apply sync based on strategy
        const changes = await this.applySyncChanges(
          project.id,
          diff,
          finalOptions,
          errors,
          warnings
        );

        // Update sync history
        await prisma.syncHistory.update({
          where: { id: syncHistoryId },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
            tasksAdded: changes.tasksAdded,
            tasksUpdated: changes.tasksUpdated,
            tasksRemoved: changes.tasksRemoved,
            syncData: {
              ...syncHistory.syncData,
              changes,
              diff: {
                totalChanges: diff.metadata.totalChanges,
                requiresFullSync: diff.metadata.requiresFullSync,
              },
            },
          },
        });

        // Invalidate cache
        await this.invalidateProjectCache(project.id);

        // Notify connected clients
        if (finalOptions.notifyClients) {
          await this.notifyClients(project.id, 'sync-completed', { changes, projectId: project.id });
        }

        return {
          success: true,
          projectId: project.id,
          syncHistoryId,
          changes,
          metadata: {
            syncType: diff.metadata.requiresFullSync ? 'full' : 'incremental',
            duration: Date.now() - startTime,
            errors,
            warnings,
          },
        };

      } finally {
        await this.releaseSyncLock(lockKey);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(errorMessage);

      // Update sync history if it exists
      if (syncHistoryId!) {
        await prisma.syncHistory.update({
          where: { id: syncHistoryId },
          data: {
            status: 'FAILED',
            completedAt: new Date(),
            errorMessage,
          },
        }).catch(() => {}); // Ignore update errors
      }

      return {
        success: false,
        projectId: project?.id || 'unknown',
        changes: {
          tasksAdded: 0,
          tasksUpdated: 0,
          tasksRemoved: 0,
          conflictsResolved: 0,
        },
        metadata: {
          syncType: 'full',
          duration: Date.now() - startTime,
          errors,
          warnings,
        },
      };
    }
  }

  // Process webhook-triggered sync
  static async processWebhookSync(
    projectId: string,
    webhookData: any,
    modifiedFiles: string[]
  ): Promise<SyncResult> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Check if Task Master files were modified
    const taskMasterFilesModified = modifiedFiles.some(file =>
      file.startsWith('.taskmaster/')
    );

    if (!taskMasterFilesModified) {
      return {
        success: true,
        projectId,
        changes: {
          tasksAdded: 0,
          tasksUpdated: 0,
          tasksRemoved: 0,
          conflictsResolved: 0,
        },
        metadata: {
          syncType: 'incremental',
          duration: 0,
          errors: [],
          warnings: ['No Task Master files modified'],
        },
      };
    }

    // Create unified repository object
    const repository = {
      id: `${project.gitProvider}_${webhookData.repository?.id || 'unknown'}`,
      name: project.name,
      fullName: webhookData.repository?.full_name || project.name,
      description: project.description,
      isPrivate: true,
      webUrl: project.gitUrl || '',
      cloneUrl: project.gitUrl || '',
      sshUrl: project.gitUrl || '',
      defaultBranch: project.gitBranch || 'main',
      lastActivity: new Date().toISOString(),
      provider: project.gitProvider as 'github' | 'gitlab',
      owner: {
        login: 'unknown',
        id: 'unknown',
        type: 'unknown',
      },
    };

    // Use automatic sync with webhook-friendly options
    return this.syncRepository(repository, {
      strategy: 'merge',
      conflictResolution: 'remote-wins', // Prefer remote changes for webhooks
      validateBeforeSync: true,
      createBackup: true,
      notifyClients: true,
    });
  }

  // Resolve conflicts between local and remote tasks
  static async resolveConflicts(
    conflicts: Array<{ taskId: string; local: ParsedTask; remote: ParsedTask }>,
    resolutions: ConflictResolution[]
  ): Promise<ParsedTask[]> {
    const resolvedTasks: ParsedTask[] = [];

    for (const conflict of conflicts) {
      const resolution = resolutions.find(r => r.taskId === conflict.taskId);
      
      if (!resolution) {
        // Default to remote wins if no resolution provided
        resolvedTasks.push(conflict.remote);
        continue;
      }

      switch (resolution.resolution) {
        case 'local':
          resolvedTasks.push(conflict.local);
          break;
        case 'remote':
          resolvedTasks.push(conflict.remote);
          break;
        case 'merge':
          if (resolution.mergedTask) {
            resolvedTasks.push(resolution.mergedTask);
          } else {
            // Auto-merge strategy
            const merged = this.autoMergeTasks(conflict.local, conflict.remote);
            resolvedTasks.push(merged);
          }
          break;
        case 'skip':
          // Keep local version unchanged
          resolvedTasks.push(conflict.local);
          break;
      }
    }

    return resolvedTasks;
  }

  // Private helper methods

  private static async acquireSyncLock(lockKey: string): Promise<boolean> {
    try {
      const result = await cacheService.set(
        lockKey,
        { locked: true, timestamp: Date.now() },
        this.SYNC_LOCK_TTL
      );
      return result;
    } catch (error) {
      return false;
    }
  }

  private static async releaseSyncLock(lockKey: string): Promise<void> {
    try {
      await cacheService.del(lockKey);
    } catch (error) {
      console.error('Failed to release sync lock:', error);
    }
  }

  private static async findOrCreateProject(repository: UnifiedRepository) {
    let project = await prisma.project.findFirst({
      where: {
        gitUrl: repository.webUrl,
        gitProvider: repository.provider,
      },
      include: { members: true },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          name: repository.name,
          description: repository.description,
          tag: repository.fullName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          gitUrl: repository.webUrl,
          gitBranch: repository.defaultBranch,
          gitProvider: repository.provider,
          status: 'ACTIVE',
        },
        include: { members: true },
      });
    }

    return project;
  }

  private static async getProjectTasks(projectId: string): Promise<ParsedTask[]> {
    const dbTasks = await prisma.task.findMany({
      where: { projectId },
      orderBy: { taskId: 'asc' },
    });

    return dbTasks.map(task => ({
      id: task.taskId,
      title: task.title,
      description: task.description,
      status: task.status.toLowerCase() as any,
      priority: task.priority.toLowerCase() as any,
      complexity: task.complexity || undefined,
      dependencies: [],
      subtasks: [],
      details: task.details || undefined,
      testStrategy: task.testStrategy || undefined,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    }));
  }

  private static async applySyncChanges(
    projectId: string,
    diff: SyncDiff,
    options: SyncOptions,
    errors: string[],
    warnings: string[]
  ) {
    let tasksAdded = 0;
    let tasksUpdated = 0;
    let tasksRemoved = 0;
    let conflictsResolved = 0;

    // Process in batches to avoid overwhelming the database
    const batchSize = this.BATCH_SIZE;

    // Add new tasks
    for (let i = 0; i < diff.added.length; i += batchSize) {
      const batch = diff.added.slice(i, i + batchSize);
      
      for (const task of batch) {
        try {
          await prisma.task.create({
            data: {
              projectId,
              taskId: task.id,
              title: task.title,
              description: task.description,
              status: task.status.toUpperCase() as any,
              priority: task.priority.toUpperCase() as any,
              complexity: task.complexity,
              data: task,
              details: task.details,
              testStrategy: task.testStrategy,
            },
          });
          tasksAdded++;
        } catch (error) {
          errors.push(`Failed to add task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }

    // Update modified tasks
    for (const modification of diff.modified) {
      try {
        await prisma.task.update({
          where: {
            projectId_taskId: {
              projectId,
              taskId: modification.id,
            },
          },
          data: {
            title: modification.after.title,
            description: modification.after.description,
            status: modification.after.status.toUpperCase() as any,
            priority: modification.after.priority.toUpperCase() as any,
            complexity: modification.after.complexity,
            data: modification.after,
            details: modification.after.details,
            testStrategy: modification.after.testStrategy,
            updatedAt: new Date(),
          },
        });
        tasksUpdated++;
        if (modification.changes.length > 3) {
          conflictsResolved++;
        }
      } catch (error) {
        errors.push(`Failed to update task ${modification.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Remove deleted tasks
    for (const task of diff.deleted) {
      try {
        await prisma.task.delete({
          where: {
            projectId_taskId: {
              projectId,
              taskId: task.id,
            },
          },
        });
        tasksRemoved++;
      } catch (error) {
        errors.push(`Failed to remove task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      tasksAdded,
      tasksUpdated,
      tasksRemoved,
      conflictsResolved,
    };
  }

  private static async invalidateProjectCache(projectId: string): Promise<void> {
    try {
      const cacheKeys = [
        `project:${projectId}`,
        `project:${projectId}:tasks`,
        `project:${projectId}:stats`,
      ];
      
      for (const key of cacheKeys) {
        await cacheService.del(key);
      }
    } catch (error) {
      console.error('Failed to invalidate cache:', error);
    }
  }

  private static async notifyClients(projectId: string, event: string, data: any): Promise<void> {
    try {
      const { broadcastSyncEvent } = await import('../websockets/socket-server');
      
      // Map generic events to sync events
      if (event === 'sync-completed') {
        broadcastSyncEvent({
          type: 'sync-completed',
          projectId,
          data,
          timestamp: new Date().toISOString(),
        });
      } else if (event === 'sync-failed') {
        broadcastSyncEvent({
          type: 'sync-failed',
          projectId,
          data,
          timestamp: new Date().toISOString(),
        });
      } else if (event === 'sync-started') {
        broadcastSyncEvent({
          type: 'sync-started',
          projectId,
          data,
          timestamp: new Date().toISOString(),
        });
      }
      
      console.log(`🔔 Notified clients: ${event} for project ${projectId}`);
    } catch (error) {
      console.error('Failed to notify clients via WebSocket:', error);
      // Fallback to console logging
      console.log(`🔔 Notify clients: ${event} for project ${projectId}`, data);
    }
  }

  private static autoMergeTasks(local: ParsedTask, remote: ParsedTask): ParsedTask {
    // Simple auto-merge strategy - prefer remote for content, local for metadata
    return {
      ...remote,
      id: local.id,
      createdAt: local.createdAt,
      updatedAt: remote.updatedAt || local.updatedAt,
      // Merge dependencies
      dependencies: [...new Set([...local.dependencies, ...remote.dependencies])],
    };
  }
}