import { 
  Team, 
  TeamMember, 
  TeamInvitation, 
  TeamRole,
  User,
  ActivityFeedItem,
  AuditLog,
} from '@/types/team';
import { AuthService } from './auth.service';

export class TeamService {
  // Create a new team
  static async createTeam(data: {
    name: string;
    description?: string;
    slug?: string;
  }): Promise<Team> {
    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const team: Team = {
      id: `team-${Date.now()}`,
      name: data.name,
      description: data.description,
      slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: currentUser.id,
      settings: {
        allowMemberInvites: true,
        requireApproval: false,
        defaultRole: 'member',
        notificationPreferences: {
          taskAssigned: true,
          taskUpdated: true,
          taskComment: true,
          taskDue: true,
          teamUpdates: true,
          weeklyReport: true,
          emailDigest: 'daily',
          pushEnabled: true,
        },
        integrations: {},
      },
      memberCount: 1,
      projectCount: 0,
      plan: 'free',
      isActive: true,
    };

    // Create owner member
    const ownerMember: TeamMember = {
      id: `member-${Date.now()}`,
      userId: currentUser.id,
      teamId: team.id,
      user: currentUser,
      role: 'owner',
      permissions: [],
      joinedAt: new Date().toISOString(),
      status: 'active',
    };

    // In production, save to database
    // For now, return mock data
    return team;
  }

  // Invite a member to team
  static async inviteMember(data: {
    teamId: string;
    email: string;
    role: TeamRole;
    message?: string;
  }): Promise<TeamInvitation> {
    const currentUser = AuthService.getCurrentUser();
    const currentMember = AuthService.getCurrentMember();
    
    if (!currentUser || !currentMember) {
      throw new Error('User not authenticated');
    }

    if (!AuthService.canInviteMembers()) {
      throw new Error('You do not have permission to invite members');
    }

    // Generate invitation token
    const token = this.generateInviteToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation: TeamInvitation = {
      id: `invite-${Date.now()}`,
      teamId: data.teamId,
      team: AuthService.getCurrentTeam()!,
      email: data.email,
      role: data.role,
      invitedBy: currentUser.id,
      invitedByUser: currentUser,
      status: 'pending',
      token,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
      message: data.message,
    };

    // Log the action
    await this.logActivity({
      teamId: data.teamId,
      userId: currentUser.id,
      user: currentUser,
      type: 'member_joined',
      action: `invited ${data.email} as ${data.role}`,
      target: {
        type: 'member',
        id: invitation.id,
        name: data.email,
      },
    });

    // Send invitation email (in production)
    await this.sendInvitationEmail(invitation);

    return invitation;
  }

  // Accept invitation
  static async acceptInvitation(token: string): Promise<TeamMember> {
    // In production, validate token and get invitation from database
    const invitation = await this.getInvitationByToken(token);
    
    if (!invitation) {
      throw new Error('Invalid invitation token');
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation has already been used');
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      throw new Error('Invitation has expired');
    }

    const currentUser = AuthService.getCurrentUser();
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Create team member
    const member: TeamMember = {
      id: `member-${Date.now()}`,
      userId: currentUser.id,
      teamId: invitation.teamId,
      user: currentUser,
      role: invitation.role,
      permissions: [],
      joinedAt: new Date().toISOString(),
      invitedBy: invitation.invitedBy,
      status: 'active',
    };

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();

    // Log the action
    await this.logActivity({
      teamId: invitation.teamId,
      userId: currentUser.id,
      user: currentUser,
      type: 'member_joined',
      action: `joined the team as ${invitation.role}`,
      target: {
        type: 'team',
        id: invitation.teamId,
        name: invitation.team.name,
      },
    });

    return member;
  }

  // Remove member from team
  static async removeMember(
    teamId: string,
    memberId: string,
    reason?: string
  ): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    const currentMember = AuthService.getCurrentMember();
    
    if (!currentUser || !currentMember) {
      throw new Error('User not authenticated');
    }

    // Get target member (in production, from database)
    const targetMember = await this.getMemberById(memberId);
    
    if (!targetMember) {
      throw new Error('Member not found');
    }

    if (!AuthService.canManageMember(targetMember)) {
      throw new Error('You do not have permission to remove this member');
    }

    // Can't remove the owner
    if (targetMember.role === 'owner') {
      throw new Error('Cannot remove team owner');
    }

    // Remove member (in production, update database)
    // For now, just log the action
    await this.logActivity({
      teamId,
      userId: currentUser.id,
      user: currentUser,
      type: 'member_left',
      action: `removed ${targetMember.user.name} from the team`,
      target: {
        type: 'member',
        id: memberId,
        name: targetMember.user.name,
      },
      metadata: { reason },
    });
  }

  // Update member role
  static async updateMemberRole(
    teamId: string,
    memberId: string,
    newRole: TeamRole
  ): Promise<TeamMember> {
    const currentUser = AuthService.getCurrentUser();
    const currentMember = AuthService.getCurrentMember();
    
    if (!currentUser || !currentMember) {
      throw new Error('User not authenticated');
    }

    // Get target member
    const targetMember = await this.getMemberById(memberId);
    
    if (!targetMember) {
      throw new Error('Member not found');
    }

    if (!AuthService.canManageMember(targetMember)) {
      throw new Error('You do not have permission to update this member\'s role');
    }

    // Can't change owner role
    if (targetMember.role === 'owner') {
      throw new Error('Cannot change owner role');
    }

    // Can't promote to owner (requires ownership transfer)
    if (newRole === 'owner') {
      throw new Error('Use transferOwnership to make someone the owner');
    }

    const oldRole = targetMember.role;
    targetMember.role = newRole;
    targetMember.permissions = []; // Reset to use role defaults

    // Log the action
    await this.logActivity({
      teamId,
      userId: currentUser.id,
      user: currentUser,
      type: 'member_role_changed',
      action: `changed ${targetMember.user.name}'s role from ${oldRole} to ${newRole}`,
      target: {
        type: 'member',
        id: memberId,
        name: targetMember.user.name,
      },
      metadata: { oldRole, newRole },
    });

    return targetMember;
  }

  // Transfer team ownership
  static async transferOwnership(
    teamId: string,
    newOwnerId: string
  ): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    const currentMember = AuthService.getCurrentMember();
    
    if (!currentUser || !currentMember) {
      throw new Error('User not authenticated');
    }

    if (currentMember.role !== 'owner') {
      throw new Error('Only the owner can transfer ownership');
    }

    const newOwnerMember = await this.getMemberByUserId(teamId, newOwnerId);
    
    if (!newOwnerMember) {
      throw new Error('New owner must be a team member');
    }

    // Update roles
    currentMember.role = 'admin'; // Demote current owner to admin
    newOwnerMember.role = 'owner'; // Promote new owner

    // Update team
    const team = AuthService.getCurrentTeam();
    if (team) {
      team.ownerId = newOwnerId;
    }

    // Log the action
    await this.logActivity({
      teamId,
      userId: currentUser.id,
      user: currentUser,
      type: 'member_role_changed',
      action: `transferred ownership to ${newOwnerMember.user.name}`,
      target: {
        type: 'team',
        id: teamId,
        name: team?.name || 'Team',
      },
    });
  }

  // Get team members
  static async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    // In production, fetch from database
    // For now, return mock data
    const currentUser = AuthService.getCurrentUser();
    
    if (!currentUser) {
      return [];
    }

    return [
      {
        id: '1',
        userId: '1',
        teamId,
        user: currentUser,
        role: 'owner',
        permissions: [],
        joinedAt: new Date().toISOString(),
        status: 'active',
      },
      {
        id: '2',
        userId: '2',
        teamId,
        user: {
          id: '2',
          email: 'jane@example.com',
          name: 'Jane Smith',
          emailVerified: true,
          twoFactorEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {
            theme: 'dark',
            language: 'en',
            emailNotifications: true,
            pushNotifications: false,
            weeklyDigest: true,
          },
        },
        role: 'admin',
        permissions: [],
        joinedAt: new Date().toISOString(),
        status: 'active',
      },
      {
        id: '3',
        userId: '3',
        teamId,
        user: {
          id: '3',
          email: 'bob@example.com',
          name: 'Bob Johnson',
          emailVerified: true,
          twoFactorEnabled: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          preferences: {
            theme: 'light',
            language: 'en',
            emailNotifications: false,
            pushNotifications: true,
            weeklyDigest: false,
          },
        },
        role: 'member',
        permissions: [],
        joinedAt: new Date().toISOString(),
        status: 'active',
      },
    ];
  }

  // Helper methods
  private static generateInviteToken(): string {
    return Math.random().toString(36).substr(2) + Date.now().toString(36);
  }

  private static async sendInvitationEmail(invitation: TeamInvitation): Promise<void> {
    // In production, send actual email
    console.log('Sending invitation email to:', invitation.email);
  }

  private static async getInvitationByToken(token: string): Promise<TeamInvitation | null> {
    // In production, fetch from database
    // For now, return mock data
    return {
      id: 'invite-123',
      teamId: '1',
      team: {
        id: '1',
        name: 'Test Team',
        slug: 'test-team',
        ownerId: '1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        settings: {
          allowMemberInvites: true,
          requireApproval: false,
          defaultRole: 'member',
          notificationPreferences: {
            taskAssigned: true,
            taskUpdated: true,
            taskComment: true,
            taskDue: true,
            teamUpdates: true,
            weeklyReport: true,
            emailDigest: 'daily',
            pushEnabled: true,
          },
          integrations: {},
        },
        memberCount: 3,
        projectCount: 2,
        plan: 'pro',
        isActive: true,
      },
      email: 'newuser@example.com',
      role: 'member',
      invitedBy: '1',
      status: 'pending',
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  private static async getMemberById(memberId: string): Promise<TeamMember | null> {
    // In production, fetch from database
    const members = await this.getTeamMembers('1');
    return members.find(m => m.id === memberId) || null;
  }

  private static async getMemberByUserId(
    teamId: string,
    userId: string
  ): Promise<TeamMember | null> {
    // In production, fetch from database
    const members = await this.getTeamMembers(teamId);
    return members.find(m => m.userId === userId) || null;
  }

  // Log activity
  static async logActivity(activity: Omit<ActivityFeedItem, 'id' | 'createdAt' | 'isRead'>): Promise<void> {
    const activityItem: ActivityFeedItem = {
      ...activity,
      id: `activity-${Date.now()}`,
      createdAt: new Date().toISOString(),
      isRead: false,
    };

    // In production, save to database and broadcast via WebSocket
    console.log('Activity logged:', activityItem);
  }

  // Log audit event
  static async logAudit(
    action: string,
    resource: any,
    resourceId: string,
    changes?: any,
    status: 'success' | 'failure' = 'success',
    errorMessage?: string
  ): Promise<void> {
    const currentUser = AuthService.getCurrentUser();
    const currentTeam = AuthService.getCurrentTeam();
    
    if (!currentUser || !currentTeam) {
      return;
    }

    const auditLog: AuditLog = {
      id: `audit-${Date.now()}`,
      teamId: currentTeam.id,
      userId: currentUser.id,
      user: currentUser,
      action,
      resource,
      resourceId,
      changes,
      status,
      errorMessage,
      timestamp: new Date().toISOString(),
    };

    // In production, save to database
    console.log('Audit logged:', auditLog);
  }
}