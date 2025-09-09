import { broadcastSSEEvent } from '@/app/api/sse/route';

export type SSEEventType = 
  | 'task-update'
  | 'task-added'
  | 'task-removed'
  | 'project-sync'
  | 'sync-started'
  | 'sync-completed'
  | 'sync-failed'
  | 'merge-completed'
  | 'merge-failed'
  | 'merge-rollback'
  | 'auto-sync-triggered'
  | 'file-change'
  | 'connection-status'
  | 'error';

export interface BroadcastOptions {
  includeTimestamp?: boolean;
  priority?: 'low' | 'normal' | 'high';
  retry?: boolean;
}

/**
 * SSE Broadcaster Service
 * Centralized service for broadcasting Server-Sent Events
 */
export class SSEBroadcaster {
  private static instance: SSEBroadcaster;
  private eventQueue: Map<string, any[]> = new Map();
  private retryQueue: Map<string, any[]> = new Map();

  private constructor() {
    // Start retry processor
    this.startRetryProcessor();
  }

  public static getInstance(): SSEBroadcaster {
    if (!SSEBroadcaster.instance) {
      SSEBroadcaster.instance = new SSEBroadcaster();
    }
    return SSEBroadcaster.instance;
  }

  /**
   * Broadcast a task update event
   */
  public broadcastTaskUpdate(
    projectId: string,
    changeType: 'added' | 'changed' | 'removed',
    tasks: any[],
    options: BroadcastOptions = {}
  ): void {
    const event = {
      type: 'task-update' as SSEEventType,
      projectId,
      data: {
        changeType,
        tasks,
        taskCount: tasks.length,
        timestamp: options.includeTimestamp !== false ? new Date().toISOString() : undefined
      }
    };

    this.broadcast(event, options);
  }

  /**
   * Broadcast a project sync event
   */
  public broadcastProjectSync(
    projectId: string,
    status: 'started' | 'in-progress' | 'completed' | 'failed',
    details?: any,
    options: BroadcastOptions = {}
  ): void {
    const eventType = `sync-${status}` as SSEEventType;
    
    const event = {
      type: eventType,
      projectId,
      data: {
        status,
        ...details,
        timestamp: options.includeTimestamp !== false ? new Date().toISOString() : undefined
      }
    };

    this.broadcast(event, options);
  }

  /**
   * Broadcast a merge event
   */
  public broadcastMergeEvent(
    projectId: string,
    status: 'completed' | 'failed' | 'rollback',
    mergeResult?: {
      added: number;
      updated: number;
      removed: number;
      conflicts: number;
    },
    options: BroadcastOptions = {}
  ): void {
    const eventType = `merge-${status}` as SSEEventType;
    
    const event = {
      type: eventType,
      projectId,
      data: {
        ...mergeResult,
        timestamp: options.includeTimestamp !== false ? new Date().toISOString() : undefined
      }
    };

    this.broadcast(event, options);
  }

  /**
   * Broadcast an error event
   */
  public broadcastError(
    projectId: string,
    error: Error | string,
    context?: string,
    options: BroadcastOptions = {}
  ): void {
    const event = {
      type: 'error' as SSEEventType,
      projectId,
      data: {
        error: error instanceof Error ? error.message : error,
        context,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcast(event, { ...options, priority: 'high' });
  }

  /**
   * Broadcast file change event
   */
  public broadcastFileChange(
    projectId: string,
    filePath: string,
    changeType: 'added' | 'changed' | 'removed',
    options: BroadcastOptions = {}
  ): void {
    const event = {
      type: 'file-change' as SSEEventType,
      projectId,
      data: {
        filePath,
        changeType,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcast(event, options);
  }

  /**
   * Broadcast auto-sync trigger event
   */
  public broadcastAutoSyncTrigger(
    projectId: string,
    trigger: 'file-change' | 'schedule' | 'manual',
    options: BroadcastOptions = {}
  ): void {
    const event = {
      type: 'auto-sync-triggered' as SSEEventType,
      projectId,
      data: {
        trigger,
        timestamp: new Date().toISOString()
      }
    };

    this.broadcast(event, options);
  }

  /**
   * Core broadcast method
   */
  private broadcast(event: any, options: BroadcastOptions = {}): void {
    try {
      // Add to queue if high priority
      if (options.priority === 'high') {
        this.addToQueue(event.projectId, event);
      }

      // Broadcast the event
      broadcastSSEEvent(event);

      // Clear from queue if successful
      if (options.priority === 'high') {
        this.clearFromQueue(event.projectId, event);
      }

    } catch (error) {
      console.error('❌ Broadcast error:', error);
      
      // Add to retry queue if needed
      if (options.retry) {
        this.addToRetryQueue(event.projectId, event);
      }
    }
  }

  /**
   * Add event to queue
   */
  private addToQueue(projectId: string, event: any): void {
    if (!this.eventQueue.has(projectId)) {
      this.eventQueue.set(projectId, []);
    }
    this.eventQueue.get(projectId)!.push(event);
  }

  /**
   * Clear event from queue
   */
  private clearFromQueue(projectId: string, event: any): void {
    const queue = this.eventQueue.get(projectId);
    if (queue) {
      const index = queue.indexOf(event);
      if (index > -1) {
        queue.splice(index, 1);
      }
    }
  }

  /**
   * Add event to retry queue
   */
  private addToRetryQueue(projectId: string, event: any): void {
    if (!this.retryQueue.has(projectId)) {
      this.retryQueue.set(projectId, []);
    }
    
    // Add retry metadata
    event.retryCount = (event.retryCount || 0) + 1;
    event.retryAt = Date.now() + (event.retryCount * 5000); // Exponential backoff
    
    this.retryQueue.get(projectId)!.push(event);
  }

  /**
   * Process retry queue
   */
  private startRetryProcessor(): void {
    setInterval(() => {
      const now = Date.now();
      
      for (const [projectId, events] of this.retryQueue.entries()) {
        const eventsToRetry = events.filter(e => e.retryAt <= now && e.retryCount < 3);
        
        for (const event of eventsToRetry) {
          console.log(`🔄 Retrying broadcast for project ${projectId} (attempt ${event.retryCount})`);
          
          try {
            broadcastSSEEvent(event);
            
            // Remove from retry queue on success
            const index = events.indexOf(event);
            if (index > -1) {
              events.splice(index, 1);
            }
          } catch (error) {
            console.error(`❌ Retry failed for project ${projectId}:`, error);
            
            if (event.retryCount >= 3) {
              // Remove from queue after max retries
              const index = events.indexOf(event);
              if (index > -1) {
                events.splice(index, 1);
              }
            } else {
              // Update retry time for next attempt
              event.retryCount++;
              event.retryAt = now + (event.retryCount * 5000);
            }
          }
        }
        
        // Clean up empty queues
        if (events.length === 0) {
          this.retryQueue.delete(projectId);
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): {
    eventQueue: { projectId: string; count: number }[];
    retryQueue: { projectId: string; count: number }[];
  } {
    const eventQueueStats = Array.from(this.eventQueue.entries()).map(([projectId, events]) => ({
      projectId,
      count: events.length
    }));

    const retryQueueStats = Array.from(this.retryQueue.entries()).map(([projectId, events]) => ({
      projectId,
      count: events.length
    }));

    return {
      eventQueue: eventQueueStats,
      retryQueue: retryQueueStats
    };
  }

  /**
   * Clear all queues for a project
   */
  public clearQueues(projectId?: string): void {
    if (projectId) {
      this.eventQueue.delete(projectId);
      this.retryQueue.delete(projectId);
    } else {
      this.eventQueue.clear();
      this.retryQueue.clear();
    }
  }
}

// Export singleton instance
export const sseBroadcaster = SSEBroadcaster.getInstance();