import { TaskData, TasksFile } from '@/app/api/sync/fetch/route';

export interface MergeConflict {
  taskId: string | number;
  field: string;
  localValue: any;
  remoteValue: any;
  resolution: 'local' | 'remote' | 'merged';
  resolvedValue: any;
}

export interface MergeResult {
  tasks: TaskData[];
  conflicts: MergeConflict[];
  added: number;
  updated: number;
  removed: number;
  unchanged: number;
}

export interface MergeOptions {
  strategy: 'last-write-wins' | 'local-priority' | 'remote-priority' | 'merge';
  preserveInProgress: boolean;
  mergeSubtasks: boolean;
  dryRun: boolean;
}

const DEFAULT_MERGE_OPTIONS: MergeOptions = {
  strategy: 'last-write-wins',
  preserveInProgress: true,
  mergeSubtasks: true,
  dryRun: false
};

export class SyncMerger {
  private conflicts: MergeConflict[] = [];
  private options: MergeOptions;

  constructor(options: Partial<MergeOptions> = {}) {
    this.options = { ...DEFAULT_MERGE_OPTIONS, ...options };
  }

  /**
   * Merge remote tasks with local tasks
   */
  public mergeTasks(
    localTasks: TaskData[],
    remoteTasks: TaskData[],
    options?: Partial<MergeOptions>
  ): MergeResult {
    if (options) {
      this.options = { ...this.options, ...options };
    }

    this.conflicts = [];
    
    const localMap = new Map(localTasks.map(t => [String(t.id), t]));
    const remoteMap = new Map(remoteTasks.map(t => [String(t.id), t]));
    const mergedMap = new Map<string, TaskData>();
    
    let added = 0;
    let updated = 0;
    let removed = 0;
    let unchanged = 0;

    // Process remote tasks (additions and updates)
    for (const [id, remoteTask] of remoteMap) {
      const localTask = localMap.get(id);
      
      if (!localTask) {
        // New task from remote
        mergedMap.set(id, remoteTask);
        added++;
      } else {
        // Task exists in both - check for conflicts
        const mergedTask = this.mergeSingleTask(localTask, remoteTask);
        
        if (this.hasChanges(localTask, mergedTask)) {
          mergedMap.set(id, mergedTask);
          updated++;
        } else {
          mergedMap.set(id, localTask);
          unchanged++;
        }
      }
    }

    // Process local-only tasks (potential removals)
    for (const [id, localTask] of localMap) {
      if (!remoteMap.has(id)) {
        if (this.options.strategy === 'remote-priority') {
          // Remote doesn't have it, so it was deleted
          removed++;
        } else {
          // Keep local task
          mergedMap.set(id, localTask);
        }
      }
    }

    // Validate dependencies after merge
    const mergedTasks = Array.from(mergedMap.values());
    this.validateDependencies(mergedTasks);

    return {
      tasks: mergedTasks,
      conflicts: this.conflicts,
      added,
      updated,
      removed,
      unchanged
    };
  }

  /**
   * Merge two individual tasks
   */
  private mergeSingleTask(local: TaskData, remote: TaskData): TaskData {
    const merged: TaskData = { ...local };

    // Handle status with special rules
    if (local.status !== remote.status) {
      if (this.options.preserveInProgress && local.status === 'in-progress') {
        // Preserve local in-progress status
        this.addConflict(local.id, 'status', local.status, remote.status, 'local', local.status);
      } else {
        const resolvedStatus = this.resolveConflict(
          local.id, 'status', local.status, remote.status
        );
        merged.status = resolvedStatus;
      }
    }

    // Merge simple fields
    const simpleFields: (keyof TaskData)[] = [
      'title', 'description', 'priority', 'details', 'testStrategy'
    ];

    for (const field of simpleFields) {
      if (local[field] !== remote[field]) {
        merged[field] = this.resolveConflict(
          local.id, field, local[field], remote[field]
        ) as any;
      }
    }

    // Merge dependencies (union by default)
    if (this.arraysDiffer(local.dependencies, remote.dependencies)) {
      if (this.options.strategy === 'merge') {
        // Union of dependencies
        const depSet = new Set([...local.dependencies, ...remote.dependencies]);
        merged.dependencies = Array.from(depSet);
        this.addConflict(
          local.id, 'dependencies', 
          local.dependencies, remote.dependencies, 
          'merged', merged.dependencies
        );
      } else {
        merged.dependencies = this.resolveConflict(
          local.id, 'dependencies', 
          local.dependencies, remote.dependencies
        ) as (string | number)[];
      }
    }

    // Merge subtasks
    if (this.options.mergeSubtasks && (local.subtasks || remote.subtasks)) {
      merged.subtasks = this.mergeSubtasks(
        local.subtasks || [], 
        remote.subtasks || []
      );
    }

    // Use latest version if available
    if (local.version !== undefined || remote.version !== undefined) {
      merged.version = Math.max(local.version || 0, remote.version || 0) + 1;
    }

    return merged;
  }

  /**
   * Resolve a conflict based on strategy
   */
  private resolveConflict(
    taskId: string | number,
    field: string,
    localValue: any,
    remoteValue: any
  ): any {
    let resolution: 'local' | 'remote' | 'merged';
    let resolvedValue: any;

    switch (this.options.strategy) {
      case 'local-priority':
        resolution = 'local';
        resolvedValue = localValue;
        break;
      
      case 'remote-priority':
        resolution = 'remote';
        resolvedValue = remoteValue;
        break;
      
      case 'last-write-wins':
        // Use timestamps if available, otherwise prefer remote
        resolution = 'remote';
        resolvedValue = remoteValue;
        break;
      
      case 'merge':
        // For arrays, merge them; for other types, prefer remote
        if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
          resolution = 'merged';
          resolvedValue = [...new Set([...localValue, ...remoteValue])];
        } else {
          resolution = 'remote';
          resolvedValue = remoteValue;
        }
        break;
      
      default:
        resolution = 'remote';
        resolvedValue = remoteValue;
    }

    this.addConflict(taskId, field, localValue, remoteValue, resolution, resolvedValue);
    return resolvedValue;
  }

  /**
   * Merge subtasks arrays
   */
  private mergeSubtasks(localSubtasks: any[], remoteSubtasks: any[]): any[] {
    const localMap = new Map(localSubtasks.map(st => [st.id, st]));
    const remoteMap = new Map(remoteSubtasks.map(st => [st.id, st]));
    const merged: any[] = [];

    // Add all remote subtasks (updates and new)
    for (const [id, remoteSubtask] of remoteMap) {
      const localSubtask = localMap.get(id);
      if (localSubtask) {
        // Merge the subtask
        merged.push(this.mergeSingleTask(localSubtask, remoteSubtask));
      } else {
        merged.push(remoteSubtask);
      }
    }

    // Add local-only subtasks (if not using remote-priority)
    if (this.options.strategy !== 'remote-priority') {
      for (const [id, localSubtask] of localMap) {
        if (!remoteMap.has(id)) {
          merged.push(localSubtask);
        }
      }
    }

    return merged;
  }

  /**
   * Validate that all dependencies exist after merge
   */
  private validateDependencies(tasks: TaskData[]): void {
    const taskIds = new Set(tasks.map(t => String(t.id)));
    
    for (const task of tasks) {
      const invalidDeps = task.dependencies.filter(
        dep => !taskIds.has(String(dep))
      );
      
      if (invalidDeps.length > 0) {
        // Remove invalid dependencies
        task.dependencies = task.dependencies.filter(
          dep => taskIds.has(String(dep))
        );
        
        this.addConflict(
          task.id,
          'dependencies',
          task.dependencies.concat(invalidDeps),
          task.dependencies,
          'merged',
          task.dependencies
        );
      }
    }
  }

  /**
   * Check if two arrays differ
   */
  private arraysDiffer(arr1: any[], arr2: any[]): boolean {
    if (arr1.length !== arr2.length) return true;
    
    const set1 = new Set(arr1.map(String));
    const set2 = new Set(arr2.map(String));
    
    if (set1.size !== set2.size) return true;
    
    for (const item of set1) {
      if (!set2.has(item)) return true;
    }
    
    return false;
  }

  /**
   * Check if task has changes
   */
  private hasChanges(original: TaskData, merged: TaskData): boolean {
    const fields: (keyof TaskData)[] = [
      'title', 'description', 'status', 'priority', 
      'details', 'testStrategy'
    ];
    
    for (const field of fields) {
      if (original[field] !== merged[field]) return true;
    }
    
    if (this.arraysDiffer(original.dependencies, merged.dependencies)) return true;
    
    // Check subtasks if they exist
    if (original.subtasks || merged.subtasks) {
      const origSub = original.subtasks || [];
      const mergSub = merged.subtasks || [];
      if (origSub.length !== mergSub.length) return true;
    }
    
    return false;
  }

  /**
   * Add a conflict to the list
   */
  private addConflict(
    taskId: string | number,
    field: string,
    localValue: any,
    remoteValue: any,
    resolution: 'local' | 'remote' | 'merged',
    resolvedValue: any
  ): void {
    this.conflicts.push({
      taskId,
      field,
      localValue,
      remoteValue,
      resolution,
      resolvedValue
    });
  }

  /**
   * Get all recorded conflicts
   */
  public getConflicts(): MergeConflict[] {
    return this.conflicts;
  }
}