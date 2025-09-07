import { prisma } from '@/lib/database';
import type { 
  Notification, 
  NotificationPreference,
  NotificationQueue
} from '@prisma/client';
import { 
  NotificationType,
  NotificationPriority 
} from '@/types/prisma-enums';

export class NotificationService {
  // Create a new notification
  async createNotification(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'MEDIUM',
    metadata?: any
  ): Promise<Notification> {
    // Check user preferences
    const preferences = await this.getUserPreferences(userId);
    
    // Check if this notification type is enabled
    if (!this.isNotificationEnabled(preferences, type)) {
      throw new Error('Notification type is disabled for user');
    }

    // Create the notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        priority,
        metadata: metadata || {},
        read: false,
      },
    });

    // Queue for delivery based on preferences
    await this.queueNotification(notification, preferences);

    return notification;
  }

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<NotificationPreference | null> {
    return await prisma.notificationPreference.findUnique({
      where: { userId },
    });
  }

  // Check if notification type is enabled
  private isNotificationEnabled(
    preferences: NotificationPreference | null,
    type: NotificationType
  ): boolean {
    if (!preferences || !preferences.enabled) return false;

    // Check quiet hours
    if (preferences.quietHoursEnabled && this.isInQuietHours(preferences)) {
      return false;
    }

    // Check specific notification type settings
    const typeSettings = preferences.notificationTypes as any;
    if (typeSettings && typeSettings[type] === false) {
      return false;
    }

    return true;
  }

  // Check if current time is in quiet hours
  private isInQuietHours(preferences: NotificationPreference): boolean {
    if (!preferences.quietHoursStart || !preferences.quietHoursEnd) {
      return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Quiet hours span midnight
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  // Queue notification for delivery
  private async queueNotification(
    notification: Notification,
    preferences: NotificationPreference | null
  ): Promise<void> {
    const channels = this.getEnabledChannels(preferences);
    
    for (const channel of channels) {
      await prisma.notificationQueue.create({
        data: {
          notificationId: notification.id,
          channel,
          status: 'PENDING',
          scheduledFor: this.getScheduledTime(preferences),
        },
      });
    }
  }

  // Get enabled notification channels
  private getEnabledChannels(preferences: NotificationPreference | null): string[] {
    if (!preferences) return ['IN_APP'];

    const channels: string[] = [];
    
    if (preferences.inApp) channels.push('IN_APP');
    if (preferences.email) channels.push('EMAIL');
    if (preferences.push) channels.push('PUSH');
    if (preferences.sms) channels.push('SMS');
    if (preferences.slack) channels.push('SLACK');
    if (preferences.discord) channels.push('DISCORD');
    if (preferences.mobileApp) channels.push('MOBILE');

    return channels.length > 0 ? channels : ['IN_APP'];
  }

  // Calculate scheduled delivery time
  private getScheduledTime(preferences: NotificationPreference | null): Date {
    const now = new Date();

    if (!preferences || !preferences.quietHoursEnabled) {
      return now;
    }

    if (this.isInQuietHours(preferences)) {
      // Schedule for after quiet hours end
      const [endHour, endMinute] = preferences.quietHoursEnd!.split(':').map(Number);
      const scheduledTime = new Date();
      scheduledTime.setHours(endHour, endMinute, 0, 0);

      // If end time is tomorrow
      if (scheduledTime < now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
      }

      return scheduledTime;
    }

    return now;
  }

  // Get unread notifications for a user
  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await prisma.notification.findMany({
      where: {
        userId,
        read: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get all notifications for a user with pagination
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{
    notifications: Notification[];
    total: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({
        where: { userId },
      }),
    ]);

    return {
      notifications,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<Notification> {
    return await prisma.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<void> {
    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: { read: true },
    });
  }

  // Delete a notification
  async deleteNotification(notificationId: string): Promise<void> {
    await prisma.notification.delete({
      where: { id: notificationId },
    });
  }

  // Clear all notifications for a user
  async clearAllNotifications(userId: string): Promise<void> {
    await prisma.notification.deleteMany({
      where: { userId },
    });
  }

  // Update user notification preferences
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    return await prisma.notificationPreference.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        enabled: true,
        inApp: true,
        email: false,
        push: false,
        sms: false,
        slack: false,
        discord: false,
        mobileApp: false,
        quietHoursEnabled: false,
        notificationTypes: {},
        soundEnabled: true,
        vibrationEnabled: true,
        ...preferences,
      },
    });
  }

  // Get notification statistics for a user
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
  }> {
    const notifications = await prisma.notification.findMany({
      where: { userId },
    });

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
    };

    for (const notification of notifications) {
      // Count by type
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      
      // Count by priority
      stats.byPriority[notification.priority] = 
        (stats.byPriority[notification.priority] || 0) + 1;
    }

    return stats;
  }

  // Process notification queue (for background job)
  async processQueue(): Promise<void> {
    const pendingItems = await prisma.notificationQueue.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        notification: {
          include: {
            user: true,
          },
        },
      },
    });

    for (const item of pendingItems) {
      try {
        await this.deliverNotification(item);
        
        // Mark as sent
        await prisma.notificationQueue.update({
          where: { id: item.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      } catch (error) {
        // Mark as failed
        await prisma.notificationQueue.update({
          where: { id: item.id },
          data: {
            status: 'FAILED',
            error: (error as Error).message,
            retries: item.retries + 1,
          },
        });
      }
    }
  }

  // Deliver notification through specific channel
  private async deliverNotification(queueItem: any): Promise<void> {
    const { notification, channel } = queueItem;

    switch (channel) {
      case 'IN_APP':
        // In-app notifications are already stored, just emit event
        // This will be handled by Socket.IO
        break;
      
      case 'EMAIL':
        // Send email notification
        // await this.sendEmailNotification(notification);
        break;
      
      case 'PUSH':
        // Send push notification
        // await this.sendPushNotification(notification);
        break;
      
      case 'SMS':
        // Send SMS notification
        // await this.sendSmsNotification(notification);
        break;
      
      case 'SLACK':
        // Send Slack notification
        // await this.sendSlackNotification(notification);
        break;
      
      case 'DISCORD':
        // Send Discord notification
        // await this.sendDiscordNotification(notification);
        break;
      
      case 'MOBILE':
        // Send mobile app notification
        // await this.sendMobileNotification(notification);
        break;
      
      default:
        throw new Error(`Unknown notification channel: ${channel}`);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();