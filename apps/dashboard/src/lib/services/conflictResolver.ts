import { TaskData } from '@/app/api/sync/fetch/route';
import { createHash } from 'crypto';

export interface ConflictItem {
  id: string;
  projectId: string;
  taskId: string | number;
  conflictType: ConflictType;
  localVersion: TaskData;
  remoteVersion: TaskData;
  baseVersion?: TaskData;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: ConflictResolution;
  resolvedBy?: string;
}

export enum ConflictType {
  CONCURRENT_EDIT = 'concurrent_edit',
  DEPENDENCY_CONFLICT = 'dependency_conflict',
  STATUS_CONFLICT = 'status_conflict',
  DELETE_EDIT = 'delete_edit',
  VERSION_MISMATCH = 'version_mismatch'
}

export interface ConflictResolution {
  strategy: ResolutionStrategy;
  mergedVersion?: TaskData;
  selectedVersion?: 'local' | 'remote';
  customFields?: Record<string, any>;
  notes?: string;
}

export enum ResolutionStrategy {
  ACCEPT_LOCAL = 'accept_local',
  ACCEPT_REMOTE = 'accept_remote',
  MERGE_FIELDS = 'merge_fields',
  CUSTOM_MERGE = 'custom_merge',
  DEFER = 'defer'
}

export interface ConflictDetectionOptions {
  useVersionNumbers: boolean;
  useTimestamps: boolean;
  useContentHash: boolean;
  strictMode: boolean;
}

const DEFAULT_DETECTION_OPTIONS: ConflictDetectionOptions = {
  useVersionNumbers: true,
  useTimestamps: true,
  useContentHash: true,
  strictMode: false
};

export class ConflictResolver {
  private conflictQueue: Map<string, ConflictItem> = new Map();
  private resolutionHistory: ConflictItem[] = [];
  private options: ConflictDetectionOptions;

  constructor(options: Partial<ConflictDetectionOptions> = {}) {
    this.options = { ...DEFAULT_DETECTION_OPTIONS, ...options };
  }

  /**
   * Detect conflicts between local and remote task versions
   */
  public detectConflicts(
    localTasks: TaskData[],
    remoteTasks: TaskData[],
    projectId: string
  ): ConflictItem[] {
    const conflicts: ConflictItem[] = [];
    const localMap = new Map(localTasks.map(t => [String(t.id), t]));
    const remoteMap = new Map(remoteTasks.map(t => [String(t.id), t]));

    // Check for conflicts in tasks that exist in both
    for (const [taskId, localTask] of localMap) {
      const remoteTask = remoteMap.get(taskId);
      
      if (remoteTask) {
        const conflict = this.detectTaskConflict(
          localTask, 
          remoteTask, 
          projectId
        );
        
        if (conflict) {
          conflicts.push(conflict);
        }
      }
    }

    // Check for delete-edit conflicts
    for (const [taskId, localTask] of localMap) {
      if (!remoteMap.has(taskId)) {
        // Local has task but remote doesn't - potential delete conflict
        if (this.wasRecentlyModified(localTask)) {
          conflicts.push(this.createConflict(
            projectId,
            taskId,
            ConflictType.DELETE_EDIT,
            localTask,
            { ...localTask, status: 'deleted' } as TaskData
          ));
        }
      }
    }

    return conflicts;
  }

  /**
   * Detect conflict between two task versions
   */
  private detectTaskConflict(
    localTask: TaskData,
    remoteTask: TaskData,
    projectId: string
  ): ConflictItem | null {
    const taskId = String(localTask.id);

    // Version number check
    if (this.options.useVersionNumbers) {
      if (localTask.version && remoteTask.version) {
        if (localTask.version !== remoteTask.version) {
          // Both have been modified since base version
          if (!this.areTasksEquivalent(localTask, remoteTask)) {
            return this.createConflict(
              projectId,
              taskId,
              ConflictType.VERSION_MISMATCH,
              localTask,
              remoteTask
            );
          }
        }
      }
    }

    // Content hash check
    if (this.options.useContentHash) {
      const localHash = this.generateTaskHash(localTask);
      const remoteHash = this.generateTaskHash(remoteTask);
      
      if (localHash !== remoteHash) {
        // Check specific conflict types
        if (localTask.status !== remoteTask.status) {
          // Special handling for status conflicts
          if (this.isStatusConflict(localTask.status, remoteTask.status)) {
            return this.createConflict(
              projectId,
              taskId,
              ConflictType.STATUS_CONFLICT,
              localTask,
              remoteTask
            );
          }
        }

        // Dependency conflict check
        if (this.hasDependencyConflict(localTask, remoteTask)) {
          return this.createConflict(
            projectId,
            taskId,
            ConflictType.DEPENDENCY_CONFLICT,
            localTask,
            remoteTask
          );
        }

        // General concurrent edit
        return this.createConflict(
          projectId,
          taskId,
          ConflictType.CONCURRENT_EDIT,
          localTask,
          remoteTask
        );
      }
    }

    return null;
  }

  /**
   * Resolve a conflict using the specified strategy
   */
  public async resolveConflict(
    conflictId: string,
    strategy: ResolutionStrategy,
    customMerge?: TaskData,
    resolvedBy?: string
  ): Promise<TaskData | null> {
    const conflict = this.conflictQueue.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    let resolvedTask: TaskData | null = null;

    switch (strategy) {
      case ResolutionStrategy.ACCEPT_LOCAL:
        resolvedTask = conflict.localVersion;
        break;

      case ResolutionStrategy.ACCEPT_REMOTE:
        resolvedTask = conflict.remoteVersion;
        break;

      case ResolutionStrategy.MERGE_FIELDS:
        resolvedTask = this.autoMergeFields(
          conflict.localVersion,
          conflict.remoteVersion
        );
        break;

      case ResolutionStrategy.CUSTOM_MERGE:
        if (!customMerge) {
          throw new Error('Custom merge data required for CUSTOM_MERGE strategy');
        }
        resolvedTask = customMerge;
        break;

      case ResolutionStrategy.DEFER:
        // Mark as deferred, don't resolve
        conflict.resolution = {
          strategy: ResolutionStrategy.DEFER,
          notes: 'Resolution deferred for manual review'
        };
        this.resolutionHistory.push(conflict);
        this.conflictQueue.delete(conflictId);
        return null;
    }

    // Record resolution
    conflict.resolution = {
      strategy,
      mergedVersion: resolvedTask || undefined,
      selectedVersion: strategy === ResolutionStrategy.ACCEPT_LOCAL ? 'local' : 
                      strategy === ResolutionStrategy.ACCEPT_REMOTE ? 'remote' : undefined
    };
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = resolvedBy;

    // Move to history
    this.resolutionHistory.push(conflict);
    this.conflictQueue.delete(conflictId);

    return resolvedTask;
  }

  /**
   * Auto-merge non-conflicting fields
   */
  private autoMergeFields(local: TaskData, remote: TaskData): TaskData {
    const merged: TaskData = { ...local };

    // Merge simple fields - prefer remote for most recent updates
    const simpleFields: (keyof TaskData)[] = [
      'title', 'description', 'priority', 'details', 'testStrategy'
    ];

    for (const field of simpleFields) {
      // Use remote if it's different and appears more recent
      if (remote[field] !== local[field]) {
        // In a real system, we'd check timestamps
        merged[field] = remote[field] as any;
      }
    }

    // Merge status with special rules
    merged.status = this.mergeStatus(local.status, remote.status);

    // Merge dependencies - union by default
    const localDeps = new Set(local.dependencies);
    const remoteDeps = new Set(remote.dependencies);
    merged.dependencies = Array.from(new Set([...localDeps, ...remoteDeps]));

    // Merge subtasks
    if (local.subtasks || remote.subtasks) {
      merged.subtasks = this.mergeSubtasks(
        local.subtasks || [],
        remote.subtasks || []
      );
    }

    // Update version
    merged.version = Math.max(local.version || 0, remote.version || 0) + 1;

    return merged;
  }

  /**
   * Merge status fields with conflict prevention
   */
  private mergeStatus(localStatus: string, remoteStatus: string): string {
    // Priority order for status
    const statusPriority: Record<string, number> = {
      'done': 5,
      'in-progress': 4,
      'review': 3,
      'pending': 2,
      'blocked': 1,
      'cancelled': 0
    };

    const localPriority = statusPriority[localStatus] ?? 2;
    const remotePriority = statusPriority[remoteStatus] ?? 2;

    // Keep in-progress status if either is in-progress
    if (localStatus === 'in-progress' || remoteStatus === 'in-progress') {
      return 'in-progress';
    }

    // Otherwise use higher priority status
    return localPriority >= remotePriority ? localStatus : remoteStatus;
  }

  /**
   * Merge subtasks arrays
   */
  private mergeSubtasks(localSubtasks: any[], remoteSubtasks: any[]): any[] {
    const merged: any[] = [];
    const processedIds = new Set<string>();

    // Process remote subtasks first (assuming more recent)
    for (const remoteSubtask of remoteSubtasks) {
      merged.push(remoteSubtask);
      processedIds.add(remoteSubtask.id);
    }

    // Add local-only subtasks
    for (const localSubtask of localSubtasks) {
      if (!processedIds.has(localSubtask.id)) {
        merged.push(localSubtask);
      }
    }

    return merged;
  }

  /**
   * Check if task was recently modified
   */
  private wasRecentlyModified(task: TaskData): boolean {
    if (!task.updatedAt) return false;
    
    const updatedAt = new Date(task.updatedAt);
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    return updatedAt > hourAgo;
  }

  /**
   * Check if two tasks are functionally equivalent
   */
  private areTasksEquivalent(task1: TaskData, task2: TaskData): boolean {
    // Compare essential fields
    return (
      task1.title === task2.title &&
      task1.description === task2.description &&
      task1.status === task2.status &&
      JSON.stringify(task1.dependencies) === JSON.stringify(task2.dependencies)
    );
  }

  /**
   * Generate content hash for a task
   */
  private generateTaskHash(task: TaskData): string {
    const content = JSON.stringify({
      title: task.title,
      description: task.description,
      status: task.status,
      dependencies: task.dependencies,
      priority: task.priority,
      details: task.details
    });
    
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Check if status transition causes a conflict
   */
  private isStatusConflict(localStatus: string, remoteStatus: string): boolean {
    // Conflicting status transitions
    const conflicts: Record<string, string[]> = {
      'done': ['in-progress', 'pending'],
      'cancelled': ['in-progress', 'done'],
      'in-progress': ['cancelled']
    };

    return conflicts[localStatus]?.includes(remoteStatus) || 
           conflicts[remoteStatus]?.includes(localStatus) || false;
  }

  /**
   * Check for dependency conflicts
   */
  private hasDependencyConflict(local: TaskData, remote: TaskData): boolean {
    const localDeps = new Set(local.dependencies.map(String));
    const remoteDeps = new Set(remote.dependencies.map(String));

    // Check if dependencies were both modified differently
    if (localDeps.size !== remoteDeps.size) return true;
    
    for (const dep of localDeps) {
      if (!remoteDeps.has(dep)) return true;
    }

    return false;
  }

  /**
   * Create a conflict item
   */
  private createConflict(
    projectId: string,
    taskId: string,
    type: ConflictType,
    localVersion: TaskData,
    remoteVersion: TaskData
  ): ConflictItem {
    const conflictId = `${projectId}-${taskId}-${Date.now()}`;
    
    const conflict: ConflictItem = {
      id: conflictId,
      projectId,
      taskId,
      conflictType: type,
      localVersion,
      remoteVersion,
      detectedAt: new Date()
    };

    this.conflictQueue.set(conflictId, conflict);
    return conflict;
  }

  /**
   * Get all pending conflicts
   */
  public getPendingConflicts(projectId?: string): ConflictItem[] {
    const conflicts = Array.from(this.conflictQueue.values());
    
    if (projectId) {
      return conflicts.filter(c => c.projectId === projectId);
    }
    
    return conflicts;
  }

  /**
   * Get resolution history
   */
  public getResolutionHistory(projectId?: string): ConflictItem[] {
    if (projectId) {
      return this.resolutionHistory.filter(c => c.projectId === projectId);
    }
    
    return this.resolutionHistory;
  }

  /**
   * Clear resolved conflicts older than specified days
   */
  public clearOldResolutions(daysOld: number = 30): number {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    const initialCount = this.resolutionHistory.length;
    
    this.resolutionHistory = this.resolutionHistory.filter(
      c => !c.resolvedAt || c.resolvedAt > cutoffDate
    );
    
    return initialCount - this.resolutionHistory.length;
  }
}

// Export singleton instance
export const conflictResolver = new ConflictResolver();