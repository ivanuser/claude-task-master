import { z } from 'zod';

// Zod schema for Task Master task validation
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in-progress', 'done', 'blocked', 'deferred', 'cancelled', 'review']),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional().default('medium'),
  complexity: z.number().optional(),
  dependencies: z.array(z.string()).optional().default([]),
  subtasks: z.array(z.lazy(() => TaskSchema)).optional().default([]),
  details: z.string().optional(),
  testStrategy: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

const ConfigSchema = z.object({
  tag: z.string().optional(),
  models: z.object({
    main: z.string().optional(),
    research: z.string().optional(),
    fallback: z.string().optional(),
  }).optional(),
  settings: z.record(z.any()).optional(),
});

export type ParsedTask = z.infer<typeof TaskSchema>;
export type ParsedConfig = z.infer<typeof ConfigSchema>;

export interface TaskParsingResult {
  tasks: ParsedTask[];
  config?: ParsedConfig;
  metadata: {
    totalTasks: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    hasSubtasks: boolean;
    parsingErrors: string[];
    format: 'tagged' | 'legacy' | 'mixed';
  };
}

export interface SyncDiff {
  added: ParsedTask[];
  modified: Array<{
    id: string;
    before: ParsedTask;
    after: ParsedTask;
    changes: string[];
  }>;
  deleted: ParsedTask[];
  metadata: {
    totalChanges: number;
    requiresFullSync: boolean;
    conflictResolution: 'auto' | 'manual' | 'none';
  };
}

export class TaskMasterParser {
  private static readonly SUPPORTED_FORMATS = ['tagged', 'legacy', 'mixed'];
  private static readonly MAX_PARSING_DEPTH = 10;
  
  // Parse Task Master tasks.json file
  static parseTasksFile(content: string, tag?: string): TaskParsingResult {
    const errors: string[] = [];
    let tasks: ParsedTask[] = [];
    let format: 'tagged' | 'legacy' | 'mixed' = 'legacy';
    
    try {
      const rawData = JSON.parse(content);
      
      // Handle different Task Master formats
      if (Array.isArray(rawData)) {
        // Legacy format: array of tasks
        tasks = this.parseLegacyFormat(rawData, errors);
        format = 'legacy';
      } else if (rawData.tasks && Array.isArray(rawData.tasks)) {
        // Modern format: object with tasks array
        tasks = this.parseModernFormat(rawData.tasks, errors);
        format = 'tagged';
      } else if (tag && rawData[tag] && Array.isArray(rawData[tag])) {
        // Tagged format: tasks organized by tags
        tasks = this.parseTaggedFormat(rawData[tag], errors);
        format = 'tagged';
      } else {
        // Try to find any task array in the object
        const taskArrays = Object.values(rawData).filter(Array.isArray);
        if (taskArrays.length > 0) {
          tasks = this.parseModernFormat(taskArrays[0] as any[], errors);
          format = 'mixed';
        } else {
          errors.push('No valid task array found in file');
        }
      }
      
      // Validate and clean tasks
      tasks = this.validateAndCleanTasks(tasks, errors);
      
    } catch (error) {
      errors.push(`JSON parsing error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return {
      tasks,
      metadata: this.generateMetadata(tasks, errors, format),
    };
  }
  
  // Parse Task Master config.json file
  static parseConfigFile(content: string): { config?: ParsedConfig; errors: string[] } {
    const errors: string[] = [];
    let config: ParsedConfig | undefined;
    
    try {
      const rawData = JSON.parse(content);
      const result = ConfigSchema.safeParse(rawData);
      
      if (result.success) {
        config = result.data;
      } else {
        result.error.issues.forEach(issue => {
          errors.push(`Config validation error: ${issue.path.join('.')} - ${issue.message}`);
        });
      }
    } catch (error) {
      errors.push(`JSON parsing error: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    return { config, errors };
  }
  
  // Compare two task sets and generate diff
  static generateDiff(
    currentTasks: ParsedTask[],
    newTasks: ParsedTask[],
    options: {
      conflictStrategy?: 'timestamp' | 'manual' | 'remote-wins';
      deepCompare?: boolean;
    } = {}
  ): SyncDiff {
    const currentTaskMap = new Map(currentTasks.map(task => [task.id, task]));
    const newTaskMap = new Map(newTasks.map(task => [task.id, task]));
    
    const added: ParsedTask[] = [];
    const modified: SyncDiff['modified'] = [];
    const deleted: ParsedTask[] = [];
    
    // Find added and modified tasks
    for (const [id, newTask] of newTaskMap) {
      const currentTask = currentTaskMap.get(id);
      
      if (!currentTask) {
        added.push(newTask);
      } else {
        const changes = this.compareTaskChanges(currentTask, newTask, options.deepCompare);
        if (changes.length > 0) {
          modified.push({
            id,
            before: currentTask,
            after: newTask,
            changes,
          });
        }
      }
    }
    
    // Find deleted tasks
    for (const [id, currentTask] of currentTaskMap) {
      if (!newTaskMap.has(id)) {
        deleted.push(currentTask);
      }
    }
    
    const totalChanges = added.length + modified.length + deleted.length;
    const requiresFullSync = totalChanges > currentTasks.length * 0.5; // > 50% changes
    
    return {
      added,
      modified,
      deleted,
      metadata: {
        totalChanges,
        requiresFullSync,
        conflictResolution: this.determineConflictResolution(options.conflictStrategy, totalChanges),
      },
    };
  }
  
  // Parse legacy format (simple array)
  private static parseLegacyFormat(tasks: any[], errors: string[]): ParsedTask[] {
    return tasks.map((task, index) => {
      try {
        return this.normalizeTask(task, `legacy-${index}`);
      } catch (error) {
        errors.push(`Task ${index}: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      }
    }).filter((task): task is ParsedTask => task !== null);
  }
  
  // Parse modern format (structured object)
  private static parseModernFormat(tasks: any[], errors: string[]): ParsedTask[] {
    return this.parseLegacyFormat(tasks, errors); // Same logic for now
  }
  
  // Parse tagged format (tasks organized by tags)
  private static parseTaggedFormat(tasks: any[], errors: string[]): ParsedTask[] {
    return this.parseLegacyFormat(tasks, errors); // Same logic for now
  }
  
  // Normalize and validate individual task
  private static normalizeTask(rawTask: any, fallbackId: string): ParsedTask {
    // Ensure required fields exist
    const normalizedTask = {
      id: rawTask.id || fallbackId,
      title: rawTask.title || 'Untitled Task',
      description: rawTask.description || '',
      status: rawTask.status || 'pending',
      priority: rawTask.priority || 'medium',
      complexity: rawTask.complexity,
      dependencies: rawTask.dependencies || [],
      subtasks: rawTask.subtasks || [],
      details: rawTask.details,
      testStrategy: rawTask.testStrategy,
      createdAt: rawTask.createdAt,
      updatedAt: rawTask.updatedAt,
    };
    
    // Validate with Zod schema
    const result = TaskSchema.safeParse(normalizedTask);
    if (!result.success) {
      throw new Error(`Validation failed: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
    
    return result.data;
  }
  
  // Validate and clean entire task array
  private static validateAndCleanTasks(tasks: ParsedTask[], errors: string[]): ParsedTask[] {
    const cleanedTasks: ParsedTask[] = [];
    const seenIds = new Set<string>();
    
    for (const task of tasks) {
      // Check for duplicate IDs
      if (seenIds.has(task.id)) {
        errors.push(`Duplicate task ID found: ${task.id}`);
        // Generate unique ID
        let uniqueId = `${task.id}_duplicate_${Date.now()}`;
        let counter = 1;
        while (seenIds.has(uniqueId)) {
          uniqueId = `${task.id}_duplicate_${Date.now()}_${counter}`;
          counter++;
        }
        task.id = uniqueId;
      }
      
      seenIds.add(task.id);
      
      // Recursively clean subtasks
      if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks = this.validateAndCleanTasks(task.subtasks, errors);
      }
      
      cleanedTasks.push(task);
    }
    
    return cleanedTasks;
  }
  
  // Generate parsing metadata
  private static generateMetadata(
    tasks: ParsedTask[],
    errors: string[],
    format: 'tagged' | 'legacy' | 'mixed'
  ): TaskParsingResult['metadata'] {
    const byStatus: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let hasSubtasks = false;
    
    const countTask = (task: ParsedTask) => {
      byStatus[task.status] = (byStatus[task.status] || 0) + 1;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + 1;
      
      if (task.subtasks && task.subtasks.length > 0) {
        hasSubtasks = true;
        task.subtasks.forEach(countTask);
      }
    };
    
    tasks.forEach(countTask);
    
    return {
      totalTasks: tasks.length,
      byStatus,
      byPriority,
      hasSubtasks,
      parsingErrors: errors,
      format,
    };
  }
  
  // Compare tasks for changes
  private static compareTaskChanges(
    before: ParsedTask,
    after: ParsedTask,
    deepCompare = false
  ): string[] {
    const changes: string[] = [];
    
    // Compare basic fields
    if (before.title !== after.title) changes.push('title');
    if (before.description !== after.description) changes.push('description');
    if (before.status !== after.status) changes.push('status');
    if (before.priority !== after.priority) changes.push('priority');
    if (before.complexity !== after.complexity) changes.push('complexity');
    if (before.details !== after.details) changes.push('details');
    if (before.testStrategy !== after.testStrategy) changes.push('testStrategy');
    
    // Compare arrays
    if (JSON.stringify(before.dependencies) !== JSON.stringify(after.dependencies)) {
      changes.push('dependencies');
    }
    
    if (deepCompare && JSON.stringify(before.subtasks) !== JSON.stringify(after.subtasks)) {
      changes.push('subtasks');
    }
    
    return changes;
  }
  
  // Determine conflict resolution strategy
  private static determineConflictResolution(
    strategy: string | undefined,
    totalChanges: number
  ): 'auto' | 'manual' | 'none' {
    if (!strategy) {
      return totalChanges > 10 ? 'manual' : 'auto';
    }
    
    switch (strategy) {
      case 'timestamp':
      case 'remote-wins':
        return 'auto';
      case 'manual':
        return 'manual';
      default:
        return 'none';
    }
  }
  
  // Extract all tasks including subtasks into flat array
  static flattenTasks(tasks: ParsedTask[]): ParsedTask[] {
    const flattened: ParsedTask[] = [];
    
    const flatten = (taskList: ParsedTask[]) => {
      for (const task of taskList) {
        flattened.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
          flatten(task.subtasks);
        }
      }
    };
    
    flatten(tasks);
    return flattened;
  }
  
  // Find task by ID in nested structure
  static findTaskById(tasks: ParsedTask[], id: string): ParsedTask | null {
    for (const task of tasks) {
      if (task.id === id) {
        return task;
      }
      if (task.subtasks && task.subtasks.length > 0) {
        const found = this.findTaskById(task.subtasks, id);
        if (found) return found;
      }
    }
    return null;
  }
}