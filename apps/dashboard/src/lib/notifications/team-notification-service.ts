import { prisma } from '@/lib/database';
import { notificationService } from './notification-service';
import type { 
  NotificationType,
  NotificationPriority,
  ProjectRole
} from '@/types/prisma-enums';

interface TeamNotificationData {
  projectId: string;
  projectName: string;
  teamId?: string;
  teamName?: string;
  actorId: string;
  actorName: string;
  targetUserId?: string;
  targetUserName?: string;
  oldRole?: ProjectRole;
  newRole?: ProjectRole;
  milestone?: string;
  announcementId?: string;
  invitationId?: string;
  [key: string]: any;
}

export class TeamNotificationService {
  // Send notification to all team members
  async notifyTeamMembers(
    projectId: string,
    type: NotificationType,
    title: string,
    message: string,
    priority: NotificationPriority = 'MEDIUM',
    metadata?: TeamNotificationData,
    excludeUserId?: string
  ) {
    try {
      // Get all project members
      const members = await prisma.projectMember.findMany({
        where: {
          projectId,
          userId: excludeUserId ? { not: excludeUserId } : undefined,
        },
        include: {
          user: true,
        },
      });

      // Create notifications for each member
      const notifications = await Promise.all(
        members.map(member =>
          notificationService.createNotification(
            member.userId,
            type,
            title,
            message,
            priority,
            metadata
          ).catch(err => {
            console.error(`Failed to notify user ${member.userId}:`, err);
            return null;
          })
        )
      );

      return notifications.filter(n => n !== null);
    } catch (error) {
      console.error('Failed to notify team members:', error);
      throw error;
    }
  }

  // Notify about team member addition
  async notifyMemberAdded(
    projectId: string,
    newMemberId: string,
    addedBy: string
  ) {
    const [project, newMember, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: newMemberId } }),
      prisma.user.findUnique({ where: { id: addedBy } }),
    ]);

    if (!project || !newMember || !actor) return;

    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: addedBy,
      actorName: actor.name || actor.email,
      targetUserId: newMemberId,
      targetUserName: newMember.name || newMember.email,
    };

    // Notify existing team members
    await this.notifyTeamMembers(
      projectId,
      'PROJECT_UPDATE',
      'New Team Member',
      `${newMember.name || newMember.email} has been added to ${project.name}`,
      'LOW',
      metadata,
      newMemberId // Exclude the new member from notifications
    );

    // Notify the new member
    await notificationService.createNotification(
      newMemberId,
      'PROJECT_UPDATE',
      'Welcome to the Team!',
      `You've been added to ${project.name} by ${actor.name || actor.email}`,
      'MEDIUM',
      metadata
    );
  }

  // Notify about team member removal
  async notifyMemberRemoved(
    projectId: string,
    removedMemberId: string,
    removedBy: string
  ) {
    const [project, removedMember, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: removedMemberId } }),
      prisma.user.findUnique({ where: { id: removedBy } }),
    ]);

    if (!project || !removedMember || !actor) return;

    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: removedBy,
      actorName: actor.name || actor.email,
      targetUserId: removedMemberId,
      targetUserName: removedMember.name || removedMember.email,
    };

    // Notify remaining team members
    await this.notifyTeamMembers(
      projectId,
      'PROJECT_UPDATE',
      'Team Member Removed',
      `${removedMember.name || removedMember.email} has been removed from ${project.name}`,
      'LOW',
      metadata,
      removedMemberId
    );

    // Notify the removed member
    await notificationService.createNotification(
      removedMemberId,
      'PROJECT_UPDATE',
      'Removed from Project',
      `You've been removed from ${project.name}`,
      'MEDIUM',
      metadata
    );
  }

  // Notify about role changes
  async notifyRoleChanged(
    projectId: string,
    userId: string,
    oldRole: ProjectRole,
    newRole: ProjectRole,
    changedBy: string
  ) {
    const [project, user, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: changedBy } }),
    ]);

    if (!project || !user || !actor) return;

    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: changedBy,
      actorName: actor.name || actor.email,
      targetUserId: userId,
      targetUserName: user.name || user.email,
      oldRole,
      newRole,
    };

    // Notify team members
    await this.notifyTeamMembers(
      projectId,
      'PROJECT_UPDATE',
      'Role Changed',
      `${user.name || user.email}'s role changed from ${oldRole} to ${newRole}`,
      'LOW',
      metadata,
      userId
    );

    // Notify the affected user
    await notificationService.createNotification(
      userId,
      'PROJECT_UPDATE',
      'Your Role Has Changed',
      `Your role in ${project.name} has been changed from ${oldRole} to ${newRole}`,
      'HIGH',
      metadata
    );
  }

  // Notify about project milestones
  async notifyMilestoneCompleted(
    projectId: string,
    milestone: string,
    completedBy: string
  ) {
    const [project, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: completedBy } }),
    ]);

    if (!project || !actor) return;

    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: completedBy,
      actorName: actor.name || actor.email,
      milestone,
    };

    await this.notifyTeamMembers(
      projectId,
      'PROJECT_UPDATE',
      'Milestone Completed! 🎉',
      `${milestone} has been completed in ${project.name}`,
      'HIGH',
      metadata
    );
  }

  // Send team announcement
  async sendTeamAnnouncement(
    projectId: string,
    title: string,
    message: string,
    announcedBy: string,
    priority: NotificationPriority = 'HIGH'
  ) {
    const [project, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: announcedBy } }),
    ]);

    if (!project || !actor) return;

    const announcementId = `announcement_${Date.now()}`;
    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: announcedBy,
      actorName: actor.name || actor.email,
      announcementId,
    };

    await this.notifyTeamMembers(
      projectId,
      'SYSTEM',
      `📢 ${title}`,
      message,
      priority,
      metadata
    );
  }

  // Notify about project status changes
  async notifyProjectStatusChanged(
    projectId: string,
    oldStatus: string,
    newStatus: string,
    changedBy: string
  ) {
    const [project, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: changedBy } }),
    ]);

    if (!project || !actor) return;

    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: changedBy,
      actorName: actor.name || actor.email,
      oldStatus,
      newStatus,
    };

    const statusEmoji = {
      ACTIVE: '🟢',
      PAUSED: '⏸️',
      COMPLETED: '✅',
      ARCHIVED: '📦',
    };

    await this.notifyTeamMembers(
      projectId,
      'PROJECT_UPDATE',
      'Project Status Changed',
      `${project.name} status changed from ${oldStatus} to ${newStatus} ${statusEmoji[newStatus as keyof typeof statusEmoji] || ''}`,
      'MEDIUM',
      metadata
    );
  }

  // Send team invitation
  async sendTeamInvitation(
    projectId: string,
    inviteeEmail: string,
    invitedBy: string,
    message?: string
  ) {
    const [project, actor] = await Promise.all([
      prisma.project.findUnique({ where: { id: projectId } }),
      prisma.user.findUnique({ where: { id: invitedBy } }),
    ]);

    if (!project || !actor) return;

    // Check if user exists
    const invitee = await prisma.user.findUnique({
      where: { email: inviteeEmail },
    });

    const invitationId = `invite_${Date.now()}`;
    const metadata: TeamNotificationData = {
      projectId,
      projectName: project.name,
      actorId: invitedBy,
      actorName: actor.name || actor.email,
      invitationId,
      inviteeEmail,
    };

    if (invitee) {
      // User exists, send in-app notification
      await notificationService.createNotification(
        invitee.id,
        'PROJECT_UPDATE',
        'Project Invitation',
        `${actor.name || actor.email} has invited you to join ${project.name}${message ? `: ${message}` : ''}`,
        'HIGH',
        metadata
      );
    }

    // TODO: Send email invitation if user doesn't exist or for all invitations
    // This would integrate with your email service

    return invitationId;
  }

  // Get team activity feed
  async getProjectActivityFeed(
    projectId: string,
    limit: number = 50,
    offset: number = 0
  ) {
    const notifications = await prisma.notification.findMany({
      where: {
        metadata: {
          path: '$.projectId',
          equals: projectId,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return notifications;
  }

  // Get team notification preferences
  async getTeamNotificationPolicy(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        settings: true,
      },
    });

    const defaultPolicy = {
      quietHoursEnabled: false,
      quietHoursStart: null,
      quietHoursEnd: null,
      allowAnnouncements: true,
      allowMilestoneNotifications: true,
      allowMemberNotifications: true,
      allowStatusNotifications: true,
      digestFrequency: 'instant', // instant, daily, weekly
    };

    return (project?.settings as any)?.notificationPolicy || defaultPolicy;
  }

  // Update team notification policy
  async updateTeamNotificationPolicy(
    projectId: string,
    policy: any
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) throw new Error('Project not found');

    const currentSettings = (project.settings as any) || {};
    const updatedSettings = {
      ...currentSettings,
      notificationPolicy: policy,
    };

    await prisma.project.update({
      where: { id: projectId },
      data: {
        settings: updatedSettings,
      },
    });

    return policy;
  }

  // Bulk operations for team leads
  async markTeamNotificationsAsRead(projectId: string, userId: string) {
    // Check if user is team lead or admin
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new Error('Insufficient permissions');
    }

    // Mark all project notifications as read for all members
    await prisma.notification.updateMany({
      where: {
        metadata: {
          path: '$.projectId',
          equals: projectId,
        },
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });
  }

  async deleteTeamNotifications(
    projectId: string,
    userId: string,
    olderThanDays: number = 30
  ) {
    // Check if user is team lead or admin
    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
      throw new Error('Insufficient permissions');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await prisma.notification.deleteMany({
      where: {
        metadata: {
          path: '$.projectId',
          equals: projectId,
        },
        createdAt: {
          lt: cutoffDate,
        },
      },
    });
  }
}

// Export singleton instance
export const teamNotificationService = new TeamNotificationService();