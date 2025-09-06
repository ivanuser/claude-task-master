import { io, Socket } from 'socket.io-client';

// Socket instance
let socket: Socket | null = null;

// Notification event types
export interface NotificationEvent {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  createdAt: string;
  read: boolean;
  data?: any;
}

// Socket event handlers
export interface NotificationHandlers {
  onNotification?: (notification: NotificationEvent) => void;
  onNotificationRead?: (notificationId: string) => void;
  onNotificationDeleted?: (notificationId: string) => void;
  onNotificationBatch?: (notifications: NotificationEvent[]) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error) => void;
}

// Initialize socket connection
export function initializeNotificationSocket(
  userId: string,
  handlers?: NotificationHandlers
): Socket {
  // Close existing connection if any
  if (socket) {
    socket.close();
  }

  // Create new socket connection
  socket = io('/notifications', {
    auth: {
      userId,
    },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  // Register event handlers
  if (handlers) {
    registerHandlers(handlers);
  }

  return socket;
}

// Register event handlers
export function registerHandlers(handlers: NotificationHandlers): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  // Connection events
  if (handlers.onConnect) {
    socket.on('connect', handlers.onConnect);
  }

  if (handlers.onDisconnect) {
    socket.on('disconnect', handlers.onDisconnect);
  }

  if (handlers.onError) {
    socket.on('error', handlers.onError);
    socket.on('connect_error', handlers.onError);
  }

  // Notification events
  if (handlers.onNotification) {
    socket.on('notification:new', handlers.onNotification);
  }

  if (handlers.onNotificationRead) {
    socket.on('notification:read', handlers.onNotificationRead);
  }

  if (handlers.onNotificationDeleted) {
    socket.on('notification:deleted', handlers.onNotificationDeleted);
  }

  if (handlers.onNotificationBatch) {
    socket.on('notification:batch', handlers.onNotificationBatch);
  }
}

// Unregister event handlers
export function unregisterHandlers(): void {
  if (!socket) return;

  socket.off('connect');
  socket.off('disconnect');
  socket.off('error');
  socket.off('connect_error');
  socket.off('notification:new');
  socket.off('notification:read');
  socket.off('notification:deleted');
  socket.off('notification:batch');
}

// Send notification to specific user
export function sendNotification(
  targetUserId: string,
  notification: Omit<NotificationEvent, 'id' | 'userId' | 'createdAt' | 'read'>
): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:send', {
    targetUserId,
    ...notification,
  });
}

// Mark notification as read
export function markNotificationAsRead(notificationId: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:markRead', notificationId);
}

// Mark multiple notifications as read
export function markNotificationsAsRead(notificationIds: string[]): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:markReadBatch', notificationIds);
}

// Delete notification
export function deleteNotification(notificationId: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:delete', notificationId);
}

// Delete multiple notifications
export function deleteNotifications(notificationIds: string[]): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:deleteBatch', notificationIds);
}

// Subscribe to notification channel
export function subscribeToChannel(channel: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:subscribe', channel);
}

// Unsubscribe from notification channel
export function unsubscribeFromChannel(channel: string): void {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.emit('notification:unsubscribe', channel);
}

// Get socket instance
export function getSocket(): Socket | null {
  return socket;
}

// Check if socket is connected
export function isConnected(): boolean {
  return socket?.connected || false;
}

// Disconnect socket
export function disconnect(): void {
  if (socket) {
    unregisterHandlers();
    socket.close();
    socket = null;
  }
}

// Reconnect socket
export function reconnect(): void {
  if (socket && !socket.connected) {
    socket.connect();
  }
}

// Socket status
export function getSocketStatus(): {
  connected: boolean;
  id: string | undefined;
  transport: string | undefined;
} {
  return {
    connected: socket?.connected || false,
    id: socket?.id,
    transport: socket?.io?.engine?.transport?.name,
  };
}