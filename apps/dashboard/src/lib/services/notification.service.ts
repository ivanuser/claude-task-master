import { 
  Notification, 
  NotificationType,
  NotificationPreferences,
  User,
  TeamMember,
} from '@/types/team';
import { Task } from '@/types/task';
import { AuthService } from './auth.service';

export class NotificationService {
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

    // WebSocket broadcasting will be handled by API route

    // Check user preferences before sending
    const userPreferences = await this.getUserPreferences(data.userId);
    
    if (this.shouldSendNotification(notification.type, userPreferences)) {
      // Send push notification if enabled
      if (userPreferences.pushEnabled && !this.isInQuietHours(userPreferences)) {
        await this.sendPushNotification(notification);
      }

      // Queue email notification based on digest preference
      if (userPreferences.emailNotifications) {
        await this.queueEmailNotification(notification, userPreferences.emailDigest);
      }
    }

    // Notify subscribers (for real-time updates in UI)
    this.notifySubscribers(notification);

    return notification;
  }

  // Get notifications for user
  static async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean;
      limit?: number;
      offset?: number;
      type?: NotificationType;
    }
  ): Promise<Notification[]> {
    let notifications = this.notifications.filter(n => n.userId === userId);

    // Filter expired notifications
    const now = new Date();
    notifications = notifications.filter(n => 
      !n.expiresAt || new Date(n.expiresAt) > now
    );

    // Apply filters
    if (options?.unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    if (options?.type) {
      notifications = notifications.filter(n => n.type === options.type);
    }

    // Sort by date (newest first)
    notifications.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    
    return notifications.slice(offset, offset + limit);
  }

  // Mark notification as read
  static async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(userId: string): Promise<void> {
    this.notifications
      .filter(n => n.userId === userId && !n.read)
      .forEach(n => {
        n.read = true;
        n.readAt = new Date().toISOString();
      });
  }

  // Delete notification
  static async deleteNotification(notificationId: string): Promise<void> {
    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index !== -1) {
      this.notifications.splice(index, 1);
    }
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
    this.subscribers.forEach(callback => callback(notification));
  }

  // Get unread count
  static async getUnreadCount(userId: string): Promise<number> {
    return this.notifications.filter(n => 
      n.userId === userId && 
      !n.read &&
      (!n.expiresAt || new Date(n.expiresAt) > new Date())
    ).length;
  }

  // Task-specific notifications
  static async notifyTaskAssigned(
    task: Task,
    assignedTo: User,
    assignedBy: User
  ): Promise<void> {
    await this.createNotification({
      userId: assignedTo.id,
      type: 'task_assigned',
      title: 'New Task Assigned',
      message: `${assignedBy.name} assigned you the task "${task.title}"`,
      data: { taskId: task.id, projectId: task.projectId },
      actionUrl: `/tasks/${task.id}`,
      actionLabel: 'View Task',
    });
  }

  static async notifyTaskMentioned(
    task: Task,
    mentionedUser: User,
    mentionedBy: User,
    comment: string
  ): Promise<void> {
    await this.createNotification({
      userId: mentionedUser.id,
      type: 'task_mentioned',
      title: 'You were mentioned',
      message: `${mentionedBy.name} mentioned you in "${task.title}": ${comment.substring(0, 100)}...`,
      data: { taskId: task.id, commentId: comment },
      actionUrl: `/tasks/${task.id}#comments`,
      actionLabel: 'View Comment',
    });
  }

  static async notifyTaskDueSoon(
    task: Task,
    assignee: User
  ): Promise<void> {
    const hoursUntilDue = task.dueDate ? 
      Math.floor((new Date(task.dueDate).getTime() - Date.now()) / (1000 * 60 * 60)) : 0;

    await this.createNotification({
      userId: assignee.id,
      type: 'task_due_soon',
      title: 'Task Due Soon',
      message: `"${task.title}" is due in ${hoursUntilDue} hours`,
      data: { taskId: task.id },
      actionUrl: `/tasks/${task.id}`,
      actionLabel: 'View Task',
      expiresIn: hoursUntilDue,
    });
  }

  static async notifyTaskOverdue(
    task: Task,
    assignee: User
  ): Promise<void> {
    await this.createNotification({
      userId: assignee.id,
      type: 'task_overdue',
      title: 'Task Overdue',
      message: `"${task.title}" is overdue`,
      data: { taskId: task.id },
      actionUrl: `/tasks/${task.id}`,
      actionLabel: 'View Task',
    });
  }

  // Team notifications
  static async notifyTeamInvitation(
    invitedUser: string,
    invitedBy: User,
    teamName: string,
    inviteToken: string
  ): Promise<void> {
    // This would typically send an email since the user might not be registered yet
    console.log(`Sending team invitation to ${invitedUser} from ${invitedBy.name} for team ${teamName}`);
  }

  static async notifyRoleChanged(
    member: TeamMember,
    changedBy: User,
    oldRole: string,
    newRole: string
  ): Promise<void> {
    await this.createNotification({
      userId: member.userId,
      teamId: member.teamId,
      type: 'role_changed',
      title: 'Role Updated',
      message: `${changedBy.name} changed your role from ${oldRole} to ${newRole}`,
      data: { oldRole, newRole },
    });
  }

  // Helper methods
  private static async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    // In production, fetch from database
    return {
      taskAssigned: true,
      taskUpdated: true,
      taskComment: true,
      taskDue: true,
      teamUpdates: true,
      weeklyReport: true,
      emailDigest: 'daily',
      pushEnabled: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
      },
    };
  }

  private static shouldSendNotification(
    type: NotificationType,
    preferences: NotificationPreferences
  ): boolean {
    switch (type) {
      case 'task_assigned':
        return preferences.taskAssigned;
      case 'task_mentioned':
      case 'comment_reply':
        return preferences.taskComment;
      case 'task_due_soon':
      case 'task_overdue':
        return preferences.taskDue;
      case 'team_invitation':
      case 'role_changed':
      case 'project_shared':
        return preferences.teamUpdates;
      case 'report_ready':
        return preferences.weeklyReport;
      default:
        return true;
    }
  }

  private static isInQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours?.enabled) {
      return false;
    }

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.quietHours.start.split(':').map(Number);
    const [endHour, endMin] = preferences.quietHours.end.split(':').map(Number);
    
    const quietStart = startHour * 60 + startMin;
    const quietEnd = endHour * 60 + endMin;

    if (quietStart < quietEnd) {
      // Quiet hours don't cross midnight
      return currentTime >= quietStart && currentTime < quietEnd;
    } else {
      // Quiet hours cross midnight
      return currentTime >= quietStart || currentTime < quietEnd;
    }
  }

  private static async sendPushNotification(notification: Notification): Promise<void> {
    // In production, use a service like Firebase Cloud Messaging
    console.log('Sending push notification:', notification);
  }

  private static async queueEmailNotification(
    notification: Notification,
    digest: 'instant' | 'daily' | 'weekly' | 'never'
  ): Promise<void> {
    // In production, queue email based on digest preference
    switch (digest) {
      case 'instant':
        // Send immediately
        console.log('Sending instant email:', notification);
        break;
      case 'daily':
      case 'weekly':
        // Add to digest queue
        console.log(`Queueing for ${digest} digest:`, notification);
        break;
      case 'never':
        // Don't send email
        break;
    }
  }

  // Clean up old notifications
  static async cleanupOldNotifications(): Promise<void> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    this.notifications = this.notifications.filter(n => 
      new Date(n.createdAt) > thirtyDaysAgo ||
      !n.read
    );
  }

  // Batch notification operations
  static async createBatchNotifications(
    notifications: Array<Parameters<typeof this.createNotification>[0]>
  ): Promise<Notification[]> {
    return Promise.all(notifications.map(n => this.createNotification(n)));
  }

  // Get notification statistics
  static async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    lastWeek: number;
    lastMonth: number;
  }> {
    const userNotifications = this.notifications.filter(n => n.userId === userId);
    const unreadNotifications = userNotifications.filter(n => !n.read);
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    const byType = userNotifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<NotificationType, number>);

    return {
      total: userNotifications.length,
      unread: unreadNotifications.length,
      byType,
      lastWeek: userNotifications.filter(n => new Date(n.createdAt) > oneWeekAgo).length,
      lastMonth: userNotifications.filter(n => new Date(n.createdAt) > oneMonthAgo).length,
    };
  }
}