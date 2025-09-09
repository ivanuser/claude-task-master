import { useEffect, useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { SyncEvent, TaskUpdateEvent, ProjectUpdateEvent } from '@/lib/websockets/socket-server';

export interface SyncStatus {
  projectId: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
  lastSync: string | null;
  isRunning: boolean;
  progress?: {
    current: number;
    total: number;
    message: string;
  };
}

export interface RealtimeSyncState {
  syncStatuses: Map<string, SyncStatus>;
  recentEvents: SyncEvent[];
  taskUpdates: Map<string, TaskUpdateEvent>;
  projectUpdates: Map<string, ProjectUpdateEvent>;
  isConnected: boolean;
  subscribedProjects: Set<string>;
}

export interface UseRealtimeSyncReturn {
  state: RealtimeSyncState;
  subscribeToProject: (projectId: string) => Promise<void>;
  unsubscribeFromProject: (projectId: string) => void;
  triggerSync: (projectId: string) => Promise<void>;
  getSyncStatus: (projectId: string) => void;
  clearEvents: (projectId?: string) => void;
  isProjectSyncing: (projectId: string) => boolean;
  getLatestTaskUpdate: (taskId: string) => TaskUpdateEvent | null;
  getProjectSyncHistory: (projectId: string) => SyncEvent[];
}

const MAX_RECENT_EVENTS = 100;
const EVENT_RETENTION_TIME = 24 * 60 * 60 * 1000; // 24 hours

export function useRealtimeSync(): UseRealtimeSyncReturn {
  const { socket, state: wsState, subscribeToProject: wsSubscribe, unsubscribeFromProject: wsUnsubscribe, triggerSync: wsTriggerSync, getSyncStatus: wsGetSyncStatus, on, off } = useWebSocket();
  
  const [state, setState] = useState<RealtimeSyncState>({
    syncStatuses: new Map(),
    recentEvents: [],
    taskUpdates: new Map(),
    projectUpdates: new Map(),
    isConnected: false,
    subscribedProjects: new Set(),
  });

  const eventCleanupRef = useRef<NodeJS.Timeout>();

  // Update connection status from WebSocket
  useEffect(() => {
    console.log('🔄 Updating connection status:', wsState?.connected)
    setState(prev => ({ 
      ...prev, 
      isConnected: wsState?.connected || false
    }));
  }, [wsState]);

  // Subscribe to project with local tracking
  const subscribeToProject = useCallback(async (projectId: string): Promise<void> => {
    try {
      await wsSubscribe(projectId);
      setState(prev => ({
        ...prev,
        subscribedProjects: new Set([...prev.subscribedProjects, projectId]),
      }));
      
      // Get initial sync status
      wsGetSyncStatus(projectId);
    } catch (error) {
      console.error('Failed to subscribe to project:', error);
      throw error;
    }
  }, [wsSubscribe, wsGetSyncStatus]);

  // Unsubscribe from project with local tracking
  const unsubscribeFromProject = useCallback((projectId: string) => {
    wsUnsubscribe(projectId);
    setState(prev => {
      const newSubscribed = new Set(prev.subscribedProjects);
      newSubscribed.delete(projectId);
      
      return {
        ...prev,
        subscribedProjects: newSubscribed,
      };
    });
  }, [wsUnsubscribe]);

  // Trigger sync wrapper
  const triggerSync = useCallback(async (projectId: string): Promise<void> => {
    try {
      await wsTriggerSync(projectId);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
      throw error;
    }
  }, [wsTriggerSync]);

  // Get sync status wrapper
  const getSyncStatus = useCallback((projectId: string) => {
    wsGetSyncStatus(projectId);
  }, [wsGetSyncStatus]);

  // Clear events
  const clearEvents = useCallback((projectId?: string) => {
    setState(prev => ({
      ...prev,
      recentEvents: projectId 
        ? prev.recentEvents.filter(event => event.projectId !== projectId)
        : [],
      taskUpdates: projectId 
        ? new Map([...prev.taskUpdates].filter(([_, update]) => update.projectId !== projectId))
        : new Map(),
      projectUpdates: projectId
        ? new Map([...prev.projectUpdates].filter(([_, update]) => update.projectId !== projectId))
        : new Map(),
    }));
  }, []);

  // Check if project is syncing
  const isProjectSyncing = useCallback((projectId: string): boolean => {
    const status = state.syncStatuses.get(projectId);
    return status?.isRunning || status?.status === 'RUNNING' || false;
  }, [state.syncStatuses]);

  // Get latest task update
  const getLatestTaskUpdate = useCallback((taskId: string): TaskUpdateEvent | null => {
    return state.taskUpdates.get(taskId) || null;
  }, [state.taskUpdates]);

  // Get project sync history
  const getProjectSyncHistory = useCallback((projectId: string): SyncEvent[] => {
    return state.recentEvents
      .filter(event => event.projectId === projectId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [state.recentEvents]);

  // Event handlers
  useEffect(() => {
    if (!socket) return;

    // Sync event handler
    const handleSyncEvent = (event: SyncEvent) => {
      console.log('📡 Received sync event:', event.type, 'for project:', event.projectId);
      
      setState(prev => {
        // Update sync status
        const newSyncStatuses = new Map(prev.syncStatuses);
        const currentStatus = newSyncStatuses.get(event.projectId) || {
          projectId: event.projectId,
          status: 'UNKNOWN' as const,
          lastSync: null,
          isRunning: false,
        };

        switch (event.type) {
          case 'sync-started':
            newSyncStatuses.set(event.projectId, {
              ...currentStatus,
              status: 'RUNNING',
              isRunning: true,
            });
            break;
          case 'sync-completed':
            newSyncStatuses.set(event.projectId, {
              ...currentStatus,
              status: 'COMPLETED',
              isRunning: false,
              lastSync: event.timestamp,
            });
            break;
          case 'sync-failed':
            newSyncStatuses.set(event.projectId, {
              ...currentStatus,
              status: 'FAILED',
              isRunning: false,
              lastSync: event.timestamp,
            });
            break;
        }

        // Add to recent events
        const newRecentEvents = [event, ...prev.recentEvents].slice(0, MAX_RECENT_EVENTS);

        return {
          ...prev,
          syncStatuses: newSyncStatuses,
          recentEvents: newRecentEvents,
        };
      });
    };

    // Task update handler
    const handleTaskUpdate = (event: TaskUpdateEvent) => {
      console.log('📝 Received task update:', event.taskId, 'in project:', event.projectId);
      
      setState(prev => {
        const newTaskUpdates = new Map(prev.taskUpdates);
        newTaskUpdates.set(event.taskId, event);

        return {
          ...prev,
          taskUpdates: newTaskUpdates,
        };
      });
    };

    // Project update handler
    const handleProjectUpdate = (event: ProjectUpdateEvent) => {
      console.log('🏗️ Received project update:', event.field, 'for project:', event.projectId);
      
      setState(prev => {
        const newProjectUpdates = new Map(prev.projectUpdates);
        newProjectUpdates.set(`${event.projectId}-${event.field}`, event);

        return {
          ...prev,
          projectUpdates: newProjectUpdates,
        };
      });
    };

    // Sync status handler
    const handleSyncStatus = (data: { projectId: string; status: string; lastSync: string | null; isRunning: boolean }) => {
      console.log('📊 Received sync status:', data);
      
      setState(prev => {
        const newSyncStatuses = new Map(prev.syncStatuses);
        newSyncStatuses.set(data.projectId, {
          projectId: data.projectId,
          status: data.status as SyncStatus['status'],
          lastSync: data.lastSync,
          isRunning: data.isRunning,
        });

        return {
          ...prev,
          syncStatuses: newSyncStatuses,
        };
      });
    };

    // Register event listeners
    on('sync-event', handleSyncEvent);
    on('task-updated', handleTaskUpdate);
    on('project-updated', handleProjectUpdate);
    on('sync-status', handleSyncStatus);

    // Cleanup on unmount or socket change
    return () => {
      off('sync-event', handleSyncEvent);
      off('task-updated', handleTaskUpdate);
      off('project-updated', handleProjectUpdate);
      off('sync-status', handleSyncStatus);
    };
  }, [socket, on, off]);

  // Clean up old events periodically
  useEffect(() => {
    if (eventCleanupRef.current) {
      clearInterval(eventCleanupRef.current);
    }

    eventCleanupRef.current = setInterval(() => {
      setState(prev => {
        const now = Date.now();
        const cutoff = now - EVENT_RETENTION_TIME;
        
        const newRecentEvents = prev.recentEvents.filter(event => 
          new Date(event.timestamp).getTime() > cutoff
        );

        return {
          ...prev,
          recentEvents: newRecentEvents,
        };
      });
    }, 60000); // Clean up every minute

    return () => {
      if (eventCleanupRef.current) {
        clearInterval(eventCleanupRef.current);
      }
    };
  }, []);

  // Auto-unsubscribe from all projects on disconnect
  useEffect(() => {
    if (!wsState?.connected && state.subscribedProjects.size > 0) {
      setState(prev => ({
        ...prev,
        subscribedProjects: new Set(),
      }));
    }
  }, [wsState?.connected, state.subscribedProjects.size]);

  return {
    state,
    subscribeToProject,
    unsubscribeFromProject,
    triggerSync,
    getSyncStatus,
    clearEvents,
    isProjectSyncing,
    getLatestTaskUpdate,
    getProjectSyncHistory,
  };
}