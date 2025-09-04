import { 
  Notification, 
  NotificationType,
  NotificationPreferences,
} from '@/types/team';

// Simplified notification service for testing (no WebSocket dependencies)
export class NotificationServiceSimple {
  private static notifications: Notification[] = [];
  private static subscribers: Set<(notification: Notification) => void> = new Set();

  // Create a notification
  static async createNotification(data: {
    userId: string;
    teamId?: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    actionUrl?: string;
    actionLabel?: string;
    expiresIn?: number; // hours
  }): Promise<Notification> {
    const notification: Notification = {
      id: `notif-${Date.now()}`,
      userId: data.userId,
      teamId: data.teamId,
      type: data.type,
      title: data.title,
      message: data.message,
      data: data.data,
      read: false,
      createdAt: new Date().toISOString(),
      actionUrl: data.actionUrl,
      actionLabel: data.actionLabel,
    };

    if (data.expiresIn) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + data.expiresIn);
      notification.expiresAt = expiresAt.toISOString();
    }

    // Store notification
    this.notifications.push(notification);

    // Notify subscribers (for real-time updates in UI)
    this.notifySubscribers(notification);

    console.log('Sending push notification:', notification);
    
    return notification;
  }

  // Get user notifications
  static async getUserNotifications(userId: string, options: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
    type?: NotificationType;
  } = {}): Promise<Notification[]> {
    let notifications = this.notifications.filter(n => n.userId === userId);
    
    // Filter by unread status
    if (options.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }
    
    // Filter by type
    if (options.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }
    
    // Sort by creation date (newest first)
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 50;
    
    return notifications.slice(offset, offset + limit);
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<boolean> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      return true;
    }
    return false;
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string): Promise<void> {
    const userNotifications = this.notifications.filter(n => n.userId === userId && !n.read);
    const now = new Date().toISOString();
    
    userNotifications.forEach(notification => {
      notification.read = true;
      notification.readAt = now;
    });
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<boolean> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
      return true;
    }
    return false;
  }

  // Get notification statistics
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    lastWeek: number;
    lastMonth: number;
  }> {
    const userNotifications = this.notifications.filter(n => n.userId === userId);
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const byType: Record<string, number> = {};
    let lastWeekCount = 0;
    let lastMonthCount = 0;

    userNotifications.forEach(notification => {
      // Count by type
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      
      // Count by time period
      const createdAt = new Date(notification.createdAt);
      if (createdAt >= lastWeek) {
        lastWeekCount++;
      }
      if (createdAt >= lastMonth) {
        lastMonthCount++;
      }
    });

    return {
      total: userNotifications.length,
      unread: userNotifications.filter(n => !n.read).length,
      byType,
      lastWeek: lastWeekCount,
      lastMonth: lastMonthCount,
    };
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    return this.notifications.filter(n => n.userId === userId && !n.read).length;
  }

  // Get user preferences (simplified)
  static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    return {
      taskAssigned: true,
      taskUpdated: true,
      taskComment: true,
      taskDue: true,
      teamUpdates: true,
      weeklyReport: true,
      emailDigest: 'daily',
      pushEnabled: true,
    };
  }

  // Update user preferences (simplified)
  static async updateUserPreferences(userId: string, preferences: NotificationPreferences): Promise<NotificationPreferences> {
    console.log('Updating preferences for user:', userId, preferences);
    return preferences;
  }

  // Subscribe to notifications
  static subscribe(callback: (notification: Notification) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  // Notify subscribers
  private static notifySubscribers(notification: Notification): void {
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification subscriber:', error);
      }
    });
  }
}