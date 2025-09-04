export interface Team {
  id: string;
  name: string;
  description?: string;
  slug: string; // URL-friendly identifier
  avatar?: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  settings: TeamSettings;
  memberCount: number;
  projectCount: number;
  plan: 'free' | 'pro' | 'enterprise';
  billingEmail?: string;
  isActive: boolean;
}

export interface TeamSettings {
  allowMemberInvites: boolean;
  requireApproval: boolean;
  defaultRole: TeamRole;
  notificationPreferences: NotificationPreferences;
  integrations: TeamIntegrations;
}

export interface TeamIntegrations {
  slack?: {
    enabled: boolean;
    webhookUrl?: string;
    channel?: string;
  };
  github?: {
    enabled: boolean;
    organization?: string;
  };
  gitlab?: {
    enabled: boolean;
    groupId?: string;
  };
}

export interface TeamMember {
  id: string;
  userId: string;
  teamId: string;
  user: User;
  role: TeamRole;
  permissions: Permission[];
  joinedAt: string;
  invitedBy?: string;
  status: 'active' | 'inactive' | 'pending' | 'suspended';
  lastActiveAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  username?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
}

export type TeamRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface Permission {
  id: string;
  name: string;
  resource: ResourceType;
  action: ActionType;
  scope?: 'own' | 'team' | 'all';
}

export type ResourceType = 
  | 'project'
  | 'task'
  | 'team'
  | 'member'
  | 'report'
  | 'analytics'
  | 'settings'
  | 'billing';

export type ActionType = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'share'
  | 'export'
  | 'invite'
  | 'manage';

export interface TeamInvitation {
  id: string;
  teamId: string;
  team: Team;
  email: string;
  role: TeamRole;
  invitedBy: string;
  invitedByUser?: User;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  token: string;
  expiresAt: string;
  acceptedAt?: string;
  declinedAt?: string;
  createdAt: string;
  message?: string;
}

export interface ActivityFeedItem {
  id: string;
  teamId: string;
  projectId?: string;
  taskId?: string;
  userId: string;
  user: User;
  type: ActivityType;
  action: string;
  target?: {
    type: 'project' | 'task' | 'member' | 'team';
    id: string;
    name: string;
  };
  metadata?: Record<string, any>;
  createdAt: string;
  isRead: boolean;
}

export type ActivityType = 
  | 'task_created'
  | 'task_updated'
  | 'task_completed'
  | 'task_deleted'
  | 'task_assigned'
  | 'task_comment'
  | 'project_created'
  | 'project_updated'
  | 'project_archived'
  | 'member_joined'
  | 'member_left'
  | 'member_role_changed'
  | 'team_settings_updated';

export interface Notification {
  id: string;
  userId: string;
  teamId?: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: string;
  createdAt: string;
  expiresAt?: string;
  actionUrl?: string;
  actionLabel?: string;
}

export type NotificationType = 
  | 'task_assigned'
  | 'task_mentioned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'comment_reply'
  | 'team_invitation'
  | 'role_changed'
  | 'project_shared'
  | 'report_ready'
  | 'system_announcement';

export interface NotificationPreferences {
  taskAssigned: boolean;
  taskUpdated: boolean;
  taskComment: boolean;
  taskDue: boolean;
  teamUpdates: boolean;
  weeklyReport: boolean;
  emailDigest: 'instant' | 'daily' | 'weekly' | 'never';
  pushEnabled: boolean;
  quietHours?: {
    enabled: boolean;
    start: string; // "22:00"
    end: string; // "08:00"
    timezone: string;
  };
}

export interface TaskComment {
  id: string;
  taskId: string;
  projectId: string;
  userId: string;
  user: User;
  content: string;
  mentions: string[]; // User IDs
  attachments?: Attachment[];
  parentId?: string; // For threaded comments
  replies?: TaskComment[];
  reactions?: CommentReaction[];
  edited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentReaction {
  id: string;
  commentId: string;
  userId: string;
  user: User;
  type: '👍' | '👎' | '❤️' | '🎉' | '😕' | '👀';
  createdAt: string;
}

export interface Attachment {
  id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  url: string;
  thumbnailUrl?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  teamId: string;
  userId: string;
  user?: User;
  action: string;
  resource: ResourceType;
  resourceId: string;
  changes?: {
    before: Record<string, any>;
    after: Record<string, any>;
  };
  metadata?: {
    ip?: string;
    userAgent?: string;
    location?: string;
  };
  status: 'success' | 'failure';
  errorMessage?: string;
  timestamp: string;
}

export interface ProjectAccess {
  id: string;
  projectId: string;
  teamId?: string;
  userId?: string;
  accessLevel: 'read' | 'write' | 'admin';
  grantedBy: string;
  grantedAt: string;
  expiresAt?: string;
  isActive: boolean;
}

// Role-based permission sets
export const rolePermissions: Record<TeamRole, Permission[]> = {
  owner: [
    // Full access to everything
    { id: '1', name: 'Manage Team', resource: 'team', action: 'manage' },
    { id: '2', name: 'Manage Billing', resource: 'billing', action: 'manage' },
    { id: '3', name: 'Delete Team', resource: 'team', action: 'delete' },
    { id: '4', name: 'All Project Access', resource: 'project', action: 'manage', scope: 'all' },
    { id: '5', name: 'All Task Access', resource: 'task', action: 'manage', scope: 'all' },
    { id: '6', name: 'Manage Members', resource: 'member', action: 'manage' },
    { id: '7', name: 'View Analytics', resource: 'analytics', action: 'read' },
    { id: '8', name: 'Export Reports', resource: 'report', action: 'export' },
  ],
  admin: [
    // Can manage projects and members, but not billing
    { id: '9', name: 'Create Projects', resource: 'project', action: 'create' },
    { id: '10', name: 'Update Projects', resource: 'project', action: 'update', scope: 'all' },
    { id: '11', name: 'Delete Projects', resource: 'project', action: 'delete', scope: 'all' },
    { id: '12', name: 'Manage Tasks', resource: 'task', action: 'manage', scope: 'all' },
    { id: '13', name: 'Invite Members', resource: 'member', action: 'invite' },
    { id: '14', name: 'Update Member Roles', resource: 'member', action: 'update' },
    { id: '15', name: 'View Analytics', resource: 'analytics', action: 'read' },
    { id: '16', name: 'Export Reports', resource: 'report', action: 'export' },
  ],
  member: [
    // Can work on projects and tasks
    { id: '17', name: 'View Projects', resource: 'project', action: 'read', scope: 'team' },
    { id: '18', name: 'Create Tasks', resource: 'task', action: 'create' },
    { id: '19', name: 'Update Own Tasks', resource: 'task', action: 'update', scope: 'own' },
    { id: '20', name: 'Delete Own Tasks', resource: 'task', action: 'delete', scope: 'own' },
    { id: '21', name: 'View Team Analytics', resource: 'analytics', action: 'read' },
    { id: '22', name: 'Export Own Reports', resource: 'report', action: 'export', scope: 'own' },
  ],
  viewer: [
    // Read-only access
    { id: '23', name: 'View Projects', resource: 'project', action: 'read', scope: 'team' },
    { id: '24', name: 'View Tasks', resource: 'task', action: 'read', scope: 'team' },
    { id: '25', name: 'View Analytics', resource: 'analytics', action: 'read' },
  ],
};

// Helper function to check permissions
export function hasPermission(
  member: TeamMember,
  resource: ResourceType,
  action: ActionType,
  ownerId?: string
): boolean {
  const permissions = member.permissions || rolePermissions[member.role] || [];
  
  return permissions.some(p => {
    if (p.resource !== resource || p.action !== action) {
      return false;
    }
    
    if (p.scope === 'own' && ownerId && ownerId !== member.userId) {
      return false;
    }
    
    return true;
  });
}