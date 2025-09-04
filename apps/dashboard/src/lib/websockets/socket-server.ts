import { Server as SocketIOServer } from 'socket.io';
import { createServer } from 'http';
import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth';
import { prisma } from '../database';
import { RBAC, Permission } from '../rbac';

export interface SocketData {
  userId: string;
  userRole: string;
  subscribedProjects: Set<string>;
}

export interface SyncEvent {
  type: 'sync-started' | 'sync-completed' | 'sync-failed' | 'task-updated' | 'project-updated' | 'notification';
  projectId: string;
  data: any;
  timestamp: string;
}

export interface TaskUpdateEvent {
  taskId: string;
  projectId: string;
  changes: string[];
  updatedBy: string;
  timestamp: string;
}

export interface ProjectUpdateEvent {
  projectId: string;
  field: string;
  oldValue: any;
  newValue: any;
  updatedBy: string;
  timestamp: string;
}

export interface NotificationEvent {
  notificationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
}

export class SocketManager {
  private static instance: SocketManager;
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, Set<string>>(); // userId -> socketIds
  private projectSubscriptions = new Map<string, Set<string>>(); // projectId -> socketIds
  
  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  // Initialize Socket.IO server
  initialize(server: any): void {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXTAUTH_URL || 'http://localhost:3001',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    console.log('📡 WebSocket server initialized');
  }

  // Setup Socket.IO event handlers
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.use(async (socket, next) => {
      try {
        // Authenticate socket connection
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        // Verify session token (simplified - in production use proper JWT verification)
        const session = await this.verifySessionToken(token);
        if (!session) {
          return next(new Error('Invalid authentication token'));
        }

        // Attach user data to socket
        socket.data = {
          userId: session.userId,
          userRole: session.userRole,
          subscribedProjects: new Set<string>(),
        } as SocketData;

        next();
      } catch (error) {
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      const userData = socket.data as SocketData;
      console.log(`🔌 User ${userData.userId} connected via WebSocket`);

      // Track connected user
      if (!this.connectedUsers.has(userData.userId)) {
        this.connectedUsers.set(userData.userId, new Set());
      }
      this.connectedUsers.get(userData.userId)!.add(socket.id);

      // Handle project subscription
      socket.on('subscribe-project', async (projectId: string) => {
        try {
          // Verify user has access to project
          const hasAccess = await this.verifyProjectAccess(userData.userId, projectId);
          if (!hasAccess) {
            socket.emit('error', { message: 'Access denied to project' });
            return;
          }

          // Subscribe to project updates
          socket.join(`project:${projectId}`);
          userData.subscribedProjects.add(projectId);

          // Track project subscriptions
          if (!this.projectSubscriptions.has(projectId)) {
            this.projectSubscriptions.set(projectId, new Set());
          }
          this.projectSubscriptions.get(projectId)!.add(socket.id);

          socket.emit('subscribed', { projectId });
          console.log(`👀 User ${userData.userId} subscribed to project ${projectId}`);
        } catch (error) {
          socket.emit('error', { message: 'Failed to subscribe to project' });
        }
      });

      // Handle project unsubscription
      socket.on('unsubscribe-project', (projectId: string) => {
        socket.leave(`project:${projectId}`);
        userData.subscribedProjects.delete(projectId);
        
        // Remove from project subscriptions
        if (this.projectSubscriptions.has(projectId)) {
          this.projectSubscriptions.get(projectId)!.delete(socket.id);
        }

        socket.emit('unsubscribed', { projectId });
        console.log(`👋 User ${userData.userId} unsubscribed from project ${projectId}`);
      });

      // Handle sync status requests
      socket.on('get-sync-status', async (projectId: string) => {
        try {
          const syncHistory = await prisma.syncHistory.findFirst({
            where: { projectId },
            orderBy: { startedAt: 'desc' },
          });

          socket.emit('sync-status', {
            projectId,
            status: syncHistory?.status || 'UNKNOWN',
            lastSync: syncHistory?.startedAt || null,
            isRunning: syncHistory?.status === 'RUNNING',
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to get sync status' });
        }
      });

      // Handle manual sync trigger
      socket.on('trigger-sync', async (projectId: string) => {
        try {
          // Verify user has write access
          const hasWriteAccess = await this.verifyProjectWriteAccess(userData.userId, projectId);
          if (!hasWriteAccess) {
            socket.emit('error', { message: 'Insufficient permissions to trigger sync' });
            return;
          }

          // Import addSyncJob here to avoid circular dependencies
          const { addSyncJob } = await import('../jobs/sync-queue');
          
          // Queue sync job
          await addSyncJob({
            syncHistoryId: 'manual-' + Date.now(),
            projectId,
            repositoryId: 0, // Will be resolved in the job
            provider: 'github', // Default, will be corrected in job
            syncType: 'full',
            metadata: {
              triggeredBy: userData.userId,
              manual: true,
            },
          });

          socket.emit('sync-triggered', { projectId });
          
          // Notify all subscribers
          this.broadcastToProject(projectId, 'sync-started', {
            projectId,
            triggeredBy: userData.userId,
            timestamp: new Date().toISOString(),
          });

        } catch (error) {
          socket.emit('error', { message: 'Failed to trigger sync' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`🔌 User ${userData.userId} disconnected`);
        
        // Clean up tracking
        const userSockets = this.connectedUsers.get(userData.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            this.connectedUsers.delete(userData.userId);
          }
        }

        // Clean up project subscriptions
        for (const projectId of userData.subscribedProjects) {
          const projectSockets = this.projectSubscriptions.get(projectId);
          if (projectSockets) {
            projectSockets.delete(socket.id);
            if (projectSockets.size === 0) {
              this.projectSubscriptions.delete(projectId);
            }
          }
        }
      });
    });
  }

  // Broadcast sync events to project subscribers
  broadcastSyncEvent(event: SyncEvent): void {
    if (!this.io) return;

    this.io.to(`project:${event.projectId}`).emit('sync-event', event);
    console.log(`📡 Broadcast sync event: ${event.type} for project ${event.projectId}`);
  }

  // Broadcast task updates to project subscribers
  broadcastTaskUpdate(event: TaskUpdateEvent): void {
    if (!this.io) return;

    this.io.to(`project:${event.projectId}`).emit('task-updated', event);
    console.log(`📡 Broadcast task update: ${event.taskId} in project ${event.projectId}`);
  }

  // Broadcast project updates
  broadcastProjectUpdate(event: ProjectUpdateEvent): void {
    if (!this.io) return;

    this.io.to(`project:${event.projectId}`).emit('project-updated', event);
    console.log(`📡 Broadcast project update: ${event.field} for project ${event.projectId}`);
  }

  // Send message to specific user
  sendToUser(userId: string, event: string, data: any): void {
    if (!this.io) return;

    const userSockets = this.connectedUsers.get(userId);
    if (userSockets) {
      for (const socketId of userSockets) {
        this.io.to(socketId).emit(event, data);
      }
    }
  }

  // Send message to all subscribers of a project
  broadcastToProject(projectId: string, event: string, data: any): void {
    if (!this.io) return;

    this.io.to(`project:${projectId}`).emit(event, data);
  }

  // Broadcast notification to specific user
  broadcastNotification(event: NotificationEvent): void {
    if (!this.io) return;

    this.sendToUser(event.userId, 'notification', event);
    console.log(`📡 Broadcast notification: ${event.type} to user ${event.userId}`);
  }

  // Get connection statistics
  getConnectionStats(): {
    totalConnections: number;
    connectedUsers: number;
    projectSubscriptions: Record<string, number>;
  } {
    const projectSubscriptions: Record<string, number> = {};
    for (const [projectId, sockets] of this.projectSubscriptions) {
      projectSubscriptions[projectId] = sockets.size;
    }

    return {
      totalConnections: this.io?.engine.clientsCount || 0,
      connectedUsers: this.connectedUsers.size,
      projectSubscriptions,
    };
  }

  // Helper methods
  private async verifySessionToken(token: string): Promise<{ userId: string; userRole: string } | null> {
    try {
      // Simplified token verification - in production, use proper JWT verification
      // For now, assume token contains userId directly
      const decoded = Buffer.from(token, 'base64').toString();
      const [userId] = decoded.split(':');
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        return null;
      }

      return {
        userId: user.id,
        userRole: user.role,
      };
    } catch (error) {
      return null;
    }
  }

  private async verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
        include: { user: true },
      });

      if (!membership) {
        return false;
      }

      // Check if user has read permission
      return RBAC.hasPermission(membership.user.role, Permission.READ_PROJECTS);
    } catch (error) {
      return false;
    }
  }

  private async verifyProjectWriteAccess(userId: string, projectId: string): Promise<boolean> {
    try {
      const membership = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId,
            projectId,
          },
        },
        include: { user: true },
      });

      if (!membership) {
        return false;
      }

      // Check if user has update permission
      return RBAC.hasPermission(membership.user.role, Permission.UPDATE_PROJECTS);
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
export const socketManager = SocketManager.getInstance();

// Helper functions for external use
export function broadcastSyncEvent(event: SyncEvent): void {
  socketManager.broadcastSyncEvent(event);
}

export function broadcastTaskUpdate(event: TaskUpdateEvent): void {
  socketManager.broadcastTaskUpdate(event);
}

export function broadcastProjectUpdate(event: ProjectUpdateEvent): void {
  socketManager.broadcastProjectUpdate(event);
}

export function sendToUser(userId: string, event: string, data: any): void {
  socketManager.sendToUser(userId, event, data);
}

export function broadcastNotification(event: NotificationEvent): void {
  socketManager.broadcastNotification(event);
}