import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { EventEmitter } from 'events';

export interface TaskChangeEvent {
  type: 'added' | 'changed' | 'removed';
  projectId: string;
  serverPath?: string;
  timestamp: Date;
  tasks?: any;
  error?: string;
}

export class FileWatcherService extends EventEmitter {
  private watchers: Map<string, chokidar.FSWatcher> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEBOUNCE_DELAY = 1000; // 1 second debounce

  constructor() {
    super();
    console.log('🔍 File watcher service initialized');
  }

  /**
   * Start watching a tasks.json file for a specific project/server
   */
  async watchTaskFile(projectId: string, filePath: string): Promise<void> {
    // Stop existing watcher if any
    if (this.watchers.has(projectId)) {
      await this.stopWatching(projectId);
    }

    try {
      // Verify file exists
      await fs.access(filePath);
      
      console.log(`👁️ Starting file watcher for project ${projectId}: ${filePath}`);

      const watcher = chokidar.watch(filePath, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 500,
          pollInterval: 100
        }
      });

      watcher
        .on('change', () => this.handleFileChange(projectId, filePath, 'changed'))
        .on('add', () => this.handleFileChange(projectId, filePath, 'added'))
        .on('unlink', () => this.handleFileChange(projectId, filePath, 'removed'))
        .on('error', (error) => {
          console.error(`❌ File watcher error for ${projectId}:`, error);
          this.emit('error', { projectId, error: error.message });
        });

      this.watchers.set(projectId, watcher);
      console.log(`✅ File watcher active for project ${projectId}`);
      
    } catch (error) {
      console.error(`❌ Failed to start file watcher for ${projectId}:`, error);
      throw error;
    }
  }

  /**
   * Handle file change events with debouncing
   */
  private handleFileChange(projectId: string, filePath: string, changeType: 'added' | 'changed' | 'removed'): void {
    // Clear existing debounce timer
    const existingTimer = this.debounceTimers.get(projectId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new debounce timer
    const timer = setTimeout(async () => {
      console.log(`📝 File ${changeType} detected for project ${projectId}`);
      
      try {
        let tasks = null;
        
        // Only read file if it wasn't removed
        if (changeType !== 'removed') {
          const content = await fs.readFile(filePath, 'utf-8');
          const tasksFile = JSON.parse(content);
          
          // Extract tasks based on project tag - get from database
          // For now, we'll need to pass the project tag context
          // This will be resolved in the event handler
          tasks = tasksFile;
        }

        const event: TaskChangeEvent = {
          type: changeType,
          projectId,
          serverPath: filePath,
          timestamp: new Date(),
          tasks
        };

        // Emit the change event
        this.emit('task-change', event);
        console.log(`🔔 Task change event emitted for project ${projectId}`);
        
      } catch (error) {
        console.error(`❌ Error processing file change for ${projectId}:`, error);
        this.emit('error', { 
          projectId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Clear the timer from the map
      this.debounceTimers.delete(projectId);
    }, this.DEBOUNCE_DELAY);

    this.debounceTimers.set(projectId, timer);
  }

  /**
   * Stop watching a specific project's task file
   */
  async stopWatching(projectId: string): Promise<void> {
    const watcher = this.watchers.get(projectId);
    if (watcher) {
      await watcher.close();
      this.watchers.delete(projectId);
      console.log(`🛑 Stopped watching project ${projectId}`);
    }

    // Clear any pending debounce timer
    const timer = this.debounceTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(projectId);
    }
  }

  /**
   * Stop all file watchers
   */
  async stopAll(): Promise<void> {
    console.log('🛑 Stopping all file watchers...');
    
    // Stop all watchers
    for (const [projectId, watcher] of this.watchers) {
      await watcher.close();
      console.log(`  - Stopped watching ${projectId}`);
    }
    this.watchers.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    console.log('✅ All file watchers stopped');
  }

  /**
   * Get list of currently watched projects
   */
  getWatchedProjects(): string[] {
    return Array.from(this.watchers.keys());
  }

  /**
   * Check if a project is being watched
   */
  isWatching(projectId: string): boolean {
    return this.watchers.has(projectId);
  }
}

// Create singleton instance
let fileWatcherInstance: FileWatcherService | null = null;

export function getFileWatcher(): FileWatcherService {
  if (!fileWatcherInstance) {
    fileWatcherInstance = new FileWatcherService();
  }
  return fileWatcherInstance;
}