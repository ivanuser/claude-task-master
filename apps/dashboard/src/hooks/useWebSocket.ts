import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';
import { SyncEvent, TaskUpdateEvent, ProjectUpdateEvent } from '@/lib/websockets/socket-server';

export interface WebSocketConfig {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastPing?: number;
}

export interface UseWebSocketReturn {
  socket: Socket | null;
  state: WebSocketState;
  connect: () => void;
  disconnect: () => void;
  subscribeToProject: (projectId: string) => Promise<void>;
  unsubscribeFromProject: (projectId: string) => void;
  triggerSync: (projectId: string) => Promise<void>;
  getSyncStatus: (projectId: string) => void;
  on: (event: string, callback: Function) => void;
  off: (event: string, callback?: Function) => void;
  emit: (event: string, data?: any) => void;
}

export function useWebSocket(config: WebSocketConfig = {}): UseWebSocketReturn {
  const { user, getSessionToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
  });

  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectDelay = 1000,
  } = config;

  // Connect to WebSocket server
  const connect = useCallback(async () => {
    if (!user || socketRef.current?.connected) return;

    setState(prev => ({ ...prev, connecting: true, error: null }));

    try {
      const token = await getSessionToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      const socket = io(url, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectDelay,
        timeout: 10000,
      });

      // Connection event handlers
      socket.on('connect', () => {
        console.log('🔌 WebSocket connected');
        setState(prev => ({ 
          ...prev, 
          connected: true, 
          connecting: false, 
          error: null,
          lastPing: Date.now(),
        }));
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false,
          error: reason === 'io server disconnect' ? 'Server disconnected' : null,
        }));
      });

      socket.on('connect_error', (error) => {
        console.error('🔌 WebSocket connection error:', error);
        setState(prev => ({ 
          ...prev, 
          connected: false, 
          connecting: false,
          error: error.message || 'Connection failed',
        }));
      });

      socket.on('error', (error) => {
        console.error('🔌 WebSocket error:', error);
        setState(prev => ({ ...prev, error: error.message || 'Unknown error' }));
      });

      // Server response handlers
      socket.on('subscribed', (data: { projectId: string }) => {
        console.log('👀 Subscribed to project:', data.projectId);
      });

      socket.on('unsubscribed', (data: { projectId: string }) => {
        console.log('👋 Unsubscribed from project:', data.projectId);
      });

      socket.on('sync-triggered', (data: { projectId: string }) => {
        console.log('🚀 Sync triggered for project:', data.projectId);
      });

      socket.on('sync-status', (data: { projectId: string; status: string; lastSync: string | null; isRunning: boolean }) => {
        console.log('📊 Sync status:', data);
      });

      // Heartbeat for connection monitoring
      const heartbeat = setInterval(() => {
        if (socket.connected) {
          setState(prev => ({ ...prev, lastPing: Date.now() }));
        }
      }, 30000);

      socket.on('disconnect', () => {
        clearInterval(heartbeat);
      });

      socketRef.current = socket;

    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      setState(prev => ({ 
        ...prev, 
        connecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      }));
    }
  }, [user, url, reconnectAttempts, reconnectDelay, getSessionToken]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setState({
      connected: false,
      connecting: false,
      error: null,
    });
  }, []);

  // Subscribe to project updates
  const subscribeToProject = useCallback(async (projectId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Subscription timeout'));
      }, 10000);

      socketRef.current.once('subscribed', (data: { projectId: string }) => {
        if (data.projectId === projectId) {
          clearTimeout(timeout);
          resolve();
        }
      });

      socketRef.current.once('error', (error: { message: string }) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      socketRef.current.emit('subscribe-project', projectId);
    });
  }, []);

  // Unsubscribe from project updates
  const unsubscribeFromProject = useCallback((projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe-project', projectId);
    }
  }, []);

  // Trigger manual sync
  const triggerSync = useCallback(async (projectId: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Sync trigger timeout'));
      }, 10000);

      socketRef.current.once('sync-triggered', (data: { projectId: string }) => {
        if (data.projectId === projectId) {
          clearTimeout(timeout);
          resolve();
        }
      });

      socketRef.current.once('error', (error: { message: string }) => {
        clearTimeout(timeout);
        reject(new Error(error.message));
      });

      socketRef.current.emit('trigger-sync', projectId);
    });
  }, []);

  // Get sync status
  const getSyncStatus = useCallback((projectId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('get-sync-status', projectId);
    }
  }, []);

  // Event listener management
  const on = useCallback((event: string, callback: Function) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback?: Function) => {
    if (socketRef.current) {
      if (callback) {
        socketRef.current.off(event, callback);
      } else {
        socketRef.current.off(event);
      }
    }
  }, []);

  // Emit events
  const emit = useCallback((event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    }
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && user && !socketRef.current) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, user, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    socket: socketRef.current,
    state,
    connect,
    disconnect,
    subscribeToProject,
    unsubscribeFromProject,
    triggerSync,
    getSyncStatus,
    on,
    off,
    emit,
  };
}