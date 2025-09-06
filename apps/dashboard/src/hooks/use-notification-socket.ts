import { useEffect, useState, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  initializeNotificationSocket,
  registerHandlers,
  unregisterHandlers,
  disconnect,
  isConnected,
  getSocketStatus,
  markNotificationAsRead,
  markNotificationsAsRead,
  deleteNotification,
  deleteNotifications,
  subscribeToChannel,
  unsubscribeFromChannel,
  NotificationEvent,
  NotificationHandlers,
} from '@/lib/socket/notifications';

export interface UseNotificationSocketOptions {
  autoConnect?: boolean;
  channels?: string[];
  onNotification?: (notification: NotificationEvent) => void;
  onNotificationRead?: (notificationId: string) => void;
  onNotificationDeleted?: (notificationId: string) => void;
  onNotificationBatch?: (notifications: NotificationEvent[]) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

export interface UseNotificationSocketReturn {
  connected: boolean;
  status: {
    connected: boolean;
    id: string | undefined;
    transport: string | undefined;
  };
  notifications: NotificationEvent[];
  unreadCount: number;
  connect: () => void;
  disconnect: () => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (notificationId: string) => void;
  deleteAll: () => void;
  subscribeToChannel: (channel: string) => void;
  unsubscribeFromChannel: (channel: string) => void;
}

export function useNotificationSocket(
  options: UseNotificationSocketOptions = {}
): UseNotificationSocketReturn {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [status, setStatus] = useState({
    connected: false,
    id: undefined as string | undefined,
    transport: undefined as string | undefined,
  });
  const socketRef = useRef<ReturnType<typeof initializeNotificationSocket> | null>(null);
  const channelsRef = useRef<Set<string>>(new Set(options.channels || []));

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Handle new notification
  const handleNotification = useCallback((notification: NotificationEvent) => {
    setNotifications(prev => {
      // Check if notification already exists
      const exists = prev.some(n => n.id === notification.id);
      if (exists) {
        return prev.map(n => n.id === notification.id ? notification : n);
      }
      // Add new notification at the beginning
      return [notification, ...prev];
    });
    
    // Call custom handler if provided
    options.onNotification?.(notification);
  }, [options]);

  // Handle notification read
  const handleNotificationRead = useCallback((notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    
    // Call custom handler if provided
    options.onNotificationRead?.(notificationId);
  }, [options]);

  // Handle notification deleted
  const handleNotificationDeleted = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    // Call custom handler if provided
    options.onNotificationDeleted?.(notificationId);
  }, [options]);

  // Handle batch notifications
  const handleNotificationBatch = useCallback((batchNotifications: NotificationEvent[]) => {
    setNotifications(batchNotifications);
    
    // Call custom handler if provided
    options.onNotificationBatch?.(batchNotifications);
  }, [options]);

  // Handle connection
  const handleConnect = useCallback(() => {
    setConnected(true);
    setStatus(getSocketStatus());
    
    // Subscribe to channels
    channelsRef.current.forEach(channel => {
      subscribeToChannel(channel);
    });
    
    // Call custom handler if provided
    options.onConnect?.();
  }, [options]);

  // Handle disconnection
  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setStatus(getSocketStatus());
    
    // Call custom handler if provided
    options.onDisconnect?.();
  }, [options]);

  // Handle error
  const handleError = useCallback((error: Error) => {
    console.error('Notification socket error:', error);
    
    // Call custom handler if provided
    options.onError?.(error);
  }, [options]);

  // Connect to socket
  const connect = useCallback(() => {
    if (!session?.user?.id) {
      console.warn('Cannot connect to notification socket: no user session');
      return;
    }

    if (socketRef.current && isConnected()) {
      console.warn('Already connected to notification socket');
      return;
    }

    const handlers: NotificationHandlers = {
      onNotification: handleNotification,
      onNotificationRead: handleNotificationRead,
      onNotificationDeleted: handleNotificationDeleted,
      onNotificationBatch: handleNotificationBatch,
      onConnect: handleConnect,
      onDisconnect: handleDisconnect,
      onError: handleError,
    };

    socketRef.current = initializeNotificationSocket(session.user.id, handlers);
  }, [
    session?.user?.id,
    handleNotification,
    handleNotificationRead,
    handleNotificationDeleted,
    handleNotificationBatch,
    handleConnect,
    handleDisconnect,
    handleError,
  ]);

  // Disconnect from socket
  const disconnectSocket = useCallback(() => {
    disconnect();
    socketRef.current = null;
    setConnected(false);
    setStatus({
      connected: false,
      id: undefined,
      transport: undefined,
    });
  }, []);

  // Mark notification as read
  const markAsRead = useCallback((notificationId: string) => {
    markNotificationAsRead(notificationId);
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(() => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length > 0) {
      markNotificationsAsRead(unreadIds);
    }
  }, [notifications]);

  // Delete single notification
  const deleteNotificationHandler = useCallback((notificationId: string) => {
    deleteNotification(notificationId);
  }, []);

  // Delete all notifications
  const deleteAll = useCallback(() => {
    const ids = notifications.map(n => n.id);
    if (ids.length > 0) {
      deleteNotifications(ids);
    }
  }, [notifications]);

  // Subscribe to channel
  const subscribeToChannelHandler = useCallback((channel: string) => {
    channelsRef.current.add(channel);
    if (isConnected()) {
      subscribeToChannel(channel);
    }
  }, []);

  // Unsubscribe from channel
  const unsubscribeFromChannelHandler = useCallback((channel: string) => {
    channelsRef.current.delete(channel);
    if (isConnected()) {
      unsubscribeFromChannel(channel);
    }
  }, []);

  // Auto-connect on mount if enabled and user is authenticated
  useEffect(() => {
    if (options.autoConnect !== false && session?.user?.id) {
      connect();
    }

    return () => {
      if (socketRef.current) {
        disconnectSocket();
      }
    };
  }, [session?.user?.id, options.autoConnect]);

  // Update status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current) {
        setStatus(getSocketStatus());
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  return {
    connected,
    status,
    notifications,
    unreadCount,
    connect,
    disconnect: disconnectSocket,
    markAsRead,
    markAllAsRead,
    deleteNotification: deleteNotificationHandler,
    deleteAll,
    subscribeToChannel: subscribeToChannelHandler,
    unsubscribeFromChannel: unsubscribeFromChannelHandler,
  };
}