import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { prisma } from '@/lib/database';
import { NotificationType, NotificationPriority, NotificationStatus } from '@/types/prisma-enums';

let io: SocketIOServer | null = null;

// User socket mapping for targeted notifications
const userSockets = new Map<string, Set<string>>();

export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  if (io) {
    return io;
  }

  io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Notification namespace
  const notificationNamespace = io.of('/notifications');

  notificationNamespace.on('connection', async (socket) => {
    const userId = socket.handshake.auth.userId;
    
    if (!userId) {
      console.error('Socket connection without userId');
      socket.disconnect();
      return;
    }

    console.log(`User ${userId} connected to notifications (socket: ${socket.id})`);

    // Add socket to user mapping
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId)!.add(socket.id);

    // Join user's personal room
    socket.join(`user:${userId}`);

    // Send initial notifications on connection
    try {
      const notifications = await prisma.notification.findMany({
        where: {
          userId,
          status: {
            not: NotificationStatus.DELETED,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 50, // Send last 50 notifications
      });

      socket.emit('notification:batch', notifications);
    } catch (error) {
      console.error('Error fetching initial notifications:', error);
      socket.emit('error', { message: 'Failed to fetch notifications' });
    }

    // Handle marking notification as read
    socket.on('notification:markRead', async (notificationId: string) => {
      try {
        await prisma.notification.update({
          where: {
            id: notificationId,
            userId, // Ensure user owns the notification
          },
          data: {
            status: NotificationStatus.READ,
            readAt: new Date(),
          },
        });

        // Notify all user's sockets
        notificationNamespace.to(`user:${userId}`).emit('notification:read', notificationId);
      } catch (error) {
        console.error('Error marking notification as read:', error);
        socket.emit('error', { message: 'Failed to mark notification as read' });
      }
    });

    // Handle marking multiple notifications as read
    socket.on('notification:markReadBatch', async (notificationIds: string[]) => {
      try {
        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId, // Ensure user owns the notifications
          },
          data: {
            status: NotificationStatus.READ,
            readAt: new Date(),
          },
        });

        // Notify all user's sockets
        notificationIds.forEach(id => {
          notificationNamespace.to(`user:${userId}`).emit('notification:read', id);
        });
      } catch (error) {
        console.error('Error marking notifications as read:', error);
        socket.emit('error', { message: 'Failed to mark notifications as read' });
      }
    });

    // Handle deleting notification
    socket.on('notification:delete', async (notificationId: string) => {
      try {
        await prisma.notification.update({
          where: {
            id: notificationId,
            userId, // Ensure user owns the notification
          },
          data: {
            status: NotificationStatus.DELETED,
          },
        });

        // Notify all user's sockets
        notificationNamespace.to(`user:${userId}`).emit('notification:deleted', notificationId);
      } catch (error) {
        console.error('Error deleting notification:', error);
        socket.emit('error', { message: 'Failed to delete notification' });
      }
    });

    // Handle deleting multiple notifications
    socket.on('notification:deleteBatch', async (notificationIds: string[]) => {
      try {
        await prisma.notification.updateMany({
          where: {
            id: { in: notificationIds },
            userId, // Ensure user owns the notifications
          },
          data: {
            status: NotificationStatus.DELETED,
          },
        });

        // Notify all user's sockets
        notificationIds.forEach(id => {
          notificationNamespace.to(`user:${userId}`).emit('notification:deleted', id);
        });
      } catch (error) {
        console.error('Error deleting notifications:', error);
        socket.emit('error', { message: 'Failed to delete notifications' });
      }
    });

    // Handle subscribing to channels
    socket.on('notification:subscribe', (channel: string) => {
      socket.join(`channel:${channel}`);
      console.log(`User ${userId} subscribed to channel: ${channel}`);
    });

    // Handle unsubscribing from channels
    socket.on('notification:unsubscribe', (channel: string) => {
      socket.leave(`channel:${channel}`);
      console.log(`User ${userId} unsubscribed from channel: ${channel}`);
    });

    // Handle sending notification to another user (admin only)
    socket.on('notification:send', async (data: {
      targetUserId: string;
      type: string;
      title: string;
      message: string;
      priority: string;
      data?: any;
    }) => {
      try {
        // TODO: Add admin permission check here
        
        const notification = await prisma.notification.create({
          data: {
            userId: data.targetUserId,
            type: data.type as NotificationType,
            title: data.title,
            message: data.message,
            priority: data.priority as NotificationPriority,
            status: NotificationStatus.UNREAD,
            data: data.data || {},
          },
        });

        // Send to target user's sockets
        notificationNamespace.to(`user:${data.targetUserId}`).emit('notification:new', notification);
      } catch (error) {
        console.error('Error sending notification:', error);
        socket.emit('error', { message: 'Failed to send notification' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${userId} disconnected (socket: ${socket.id})`);
      
      // Remove socket from user mapping
      const userSocketSet = userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        if (userSocketSet.size === 0) {
          userSockets.delete(userId);
        }
      }
    });
  });

  return io;
}

// Send notification to specific user
export async function sendNotificationToUser(
  userId: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    data?: any;
  }
): Promise<void> {
  if (!io) {
    console.error('Socket.IO server not initialized');
    return;
  }

  try {
    // Save notification to database
    const savedNotification = await prisma.notification.create({
      data: {
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        status: NotificationStatus.UNREAD,
        data: notification.data || {},
      },
    });

    // Send to user's sockets
    const notificationNamespace = io.of('/notifications');
    notificationNamespace.to(`user:${userId}`).emit('notification:new', savedNotification);
  } catch (error) {
    console.error('Error sending notification to user:', error);
  }
}

// Send notification to channel
export async function sendNotificationToChannel(
  channel: string,
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    data?: any;
  }
): Promise<void> {
  if (!io) {
    console.error('Socket.IO server not initialized');
    return;
  }

  try {
    const notificationNamespace = io.of('/notifications');
    notificationNamespace.to(`channel:${channel}`).emit('notification:new', {
      id: `channel-${Date.now()}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      createdAt: new Date().toISOString(),
      read: false,
      data: notification.data || {},
    });
  } catch (error) {
    console.error('Error sending notification to channel:', error);
  }
}

// Broadcast notification to all connected users
export async function broadcastNotification(
  notification: {
    type: NotificationType;
    title: string;
    message: string;
    priority: NotificationPriority;
    data?: any;
  }
): Promise<void> {
  if (!io) {
    console.error('Socket.IO server not initialized');
    return;
  }

  try {
    const notificationNamespace = io.of('/notifications');
    notificationNamespace.emit('notification:new', {
      id: `broadcast-${Date.now()}`,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      priority: notification.priority,
      createdAt: new Date().toISOString(),
      read: false,
      data: notification.data || {},
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
  }
}

// Get Socket.IO server instance
export function getSocketServer(): SocketIOServer | null {
  return io;
}

// Check if user is connected
export function isUserConnected(userId: string): boolean {
  return userSockets.has(userId) && userSockets.get(userId)!.size > 0;
}

// Get connected user count
export function getConnectedUserCount(): number {
  return userSockets.size;
}

// Get all connected user IDs
export function getConnectedUserIds(): string[] {
  return Array.from(userSockets.keys());
}