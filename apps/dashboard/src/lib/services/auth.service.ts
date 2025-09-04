import { 
  Team, 
  TeamMember, 
  User, 
  TeamRole, 
  Permission, 
  ResourceType, 
  ActionType,
  rolePermissions,
  hasPermission as checkPermission,
} from '@/types/team';

export class AuthService {
  // Current user context (would come from session/JWT in production)
  private static currentUser: User | null = null;
  private static currentTeam: Team | null = null;
  private static currentMember: TeamMember | null = null;

  // Set the current user context
  static setCurrentUser(user: User | null): void {
    this.currentUser = user;
  }

  // Set the current team context
  static setCurrentTeam(team: Team | null): void {
    this.currentTeam = team;
  }

  // Set the current member context
  static setCurrentMember(member: TeamMember | null): void {
    this.currentMember = member;
  }

  // Get current user
  static getCurrentUser(): User | null {
    return this.currentUser;
  }

  // Get current team
  static getCurrentTeam(): Team | null {
    return this.currentTeam;
  }

  // Get current member
  static getCurrentMember(): TeamMember | null {
    return this.currentMember;
  }

  // Check if user is authenticated
  static isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  // Check if user has specific permission
  static hasPermission(
    resource: ResourceType,
    action: ActionType,
    resourceOwnerId?: string
  ): boolean {
    if (!this.currentMember) {
      return false;
    }

    return checkPermission(this.currentMember, resource, action, resourceOwnerId);
  }

  // Check if user has role
  static hasRole(role: TeamRole): boolean {
    if (!this.currentMember) {
      return false;
    }

    const roleHierarchy: Record<TeamRole, number> = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    return roleHierarchy[this.currentMember.role] >= roleHierarchy[role];
  }

  // Check if user can perform action on resource
  static canPerformAction(
    action: ActionType,
    resource: ResourceType,
    resourceData?: {
      ownerId?: string;
      teamId?: string;
      projectId?: string;
    }
  ): boolean {
    if (!this.isAuthenticated() || !this.currentMember) {
      return false;
    }

    // Owner can do anything
    if (this.currentMember.role === 'owner') {
      return true;
    }

    // Check specific permissions
    return this.hasPermission(resource, action, resourceData?.ownerId);
  }

  // Get user's permissions
  static getUserPermissions(): Permission[] {
    if (!this.currentMember) {
      return [];
    }

    return this.currentMember.permissions || rolePermissions[this.currentMember.role] || [];
  }

  // Check if user can access project
  static canAccessProject(
    projectId: string,
    requiredAccess: 'read' | 'write' | 'admin' = 'read'
  ): boolean {
    if (!this.currentMember) {
      return false;
    }

    // Owner and admin have full access
    if (this.currentMember.role === 'owner' || this.currentMember.role === 'admin') {
      return true;
    }

    // Members can read and write
    if (this.currentMember.role === 'member') {
      return requiredAccess !== 'admin';
    }

    // Viewers can only read
    if (this.currentMember.role === 'viewer') {
      return requiredAccess === 'read';
    }

    return false;
  }

  // Check if user can manage team
  static canManageTeam(): boolean {
    return this.hasRole('admin');
  }

  // Check if user can invite members
  static canInviteMembers(): boolean {
    if (!this.currentMember || !this.currentTeam) {
      return false;
    }

    // Check team settings
    if (this.currentTeam.settings.allowMemberInvites) {
      return this.hasRole('member');
    }

    // Otherwise only admins and owners
    return this.hasRole('admin');
  }

  // Check if user can manage member
  static canManageMember(targetMember: TeamMember): boolean {
    if (!this.currentMember) {
      return false;
    }

    // Can't manage yourself
    if (this.currentMember.userId === targetMember.userId) {
      return false;
    }

    // Owner can manage anyone
    if (this.currentMember.role === 'owner') {
      return true;
    }

    // Admin can manage members and viewers
    if (this.currentMember.role === 'admin') {
      return targetMember.role === 'member' || targetMember.role === 'viewer';
    }

    return false;
  }

  // Check if user can delete task
  static canDeleteTask(task: { assignedTo?: string; createdBy?: string }): boolean {
    if (!this.currentMember || !this.currentUser) {
      return false;
    }

    // Admin and owner can delete any task
    if (this.hasRole('admin')) {
      return true;
    }

    // Members can delete their own tasks
    if (this.currentMember.role === 'member') {
      return task.assignedTo === this.currentUser.id || 
             task.createdBy === this.currentUser.id;
    }

    return false;
  }

  // Check if user can update task
  static canUpdateTask(task: { assignedTo?: string; createdBy?: string }): boolean {
    if (!this.currentMember || !this.currentUser) {
      return false;
    }

    // Admin and owner can update any task
    if (this.hasRole('admin')) {
      return true;
    }

    // Members can update their own tasks
    if (this.currentMember.role === 'member') {
      return task.assignedTo === this.currentUser.id || 
             task.createdBy === this.currentUser.id;
    }

    return false;
  }

  // Check if user can view analytics
  static canViewAnalytics(): boolean {
    return this.hasPermission('analytics', 'read');
  }

  // Check if user can export reports
  static canExportReports(): boolean {
    return this.hasPermission('report', 'export');
  }

  // Check if user can manage billing
  static canManageBilling(): boolean {
    return this.hasRole('owner');
  }
}

// React hook for using auth in components
export function useAuth() {
  return {
    user: AuthService.getCurrentUser(),
    team: AuthService.getCurrentTeam(),
    member: AuthService.getCurrentMember(),
    isAuthenticated: AuthService.isAuthenticated(),
    hasPermission: AuthService.hasPermission.bind(AuthService),
    hasRole: AuthService.hasRole.bind(AuthService),
    canPerformAction: AuthService.canPerformAction.bind(AuthService),
    canAccessProject: AuthService.canAccessProject.bind(AuthService),
    canManageTeam: AuthService.canManageTeam(),
    canInviteMembers: AuthService.canInviteMembers(),
    canViewAnalytics: AuthService.canViewAnalytics(),
    canExportReports: AuthService.canExportReports(),
    canManageBilling: AuthService.canManageBilling(),
  };
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requireAuth?: boolean;
    requireRole?: TeamRole;
    requirePermission?: {
      resource: ResourceType;
      action: ActionType;
    };
    fallback?: React.ComponentType;
  }
): React.ComponentType<P> {
  return (props: P) => {
    const auth = useAuth();

    // Check authentication
    if (options?.requireAuth && !auth.isAuthenticated) {
      const Fallback = options.fallback;
      return Fallback ? <Fallback /> : null;
    }

    // Check role
    if (options?.requireRole && !auth.hasRole(options.requireRole)) {
      const Fallback = options.fallback;
      return Fallback ? <Fallback /> : null;
    }

    // Check permission
    if (options?.requirePermission) {
      const { resource, action } = options.requirePermission;
      if (!auth.hasPermission(resource, action)) {
        const Fallback = options.fallback;
        return Fallback ? <Fallback /> : null;
      }
    }

    return <Component {...props} />;
  };
}

// Middleware for API routes
export async function requireAuth(
  request: Request,
  options?: {
    requireRole?: TeamRole;
    requirePermission?: {
      resource: ResourceType;
      action: ActionType;
    };
  }
): Promise<{ authorized: boolean; user?: User; member?: TeamMember; error?: string }> {
  // In production, this would validate JWT token
  // For now, we'll use mock authentication
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Missing authorization token' };
  }

  // Mock user and member data
  const mockUser: User = {
    id: '1',
    email: 'user@example.com',
    name: 'John Doe',
    username: 'johndoe',
    emailVerified: true,
    twoFactorEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    preferences: {
      theme: 'light',
      language: 'en',
      emailNotifications: true,
      pushNotifications: true,
      weeklyDigest: true,
    },
  };

  const mockMember: TeamMember = {
    id: '1',
    userId: '1',
    teamId: '1',
    user: mockUser,
    role: 'admin', // Default role for testing
    permissions: rolePermissions['admin'],
    joinedAt: new Date().toISOString(),
    status: 'active',
  };

  // Check role requirement
  if (options?.requireRole) {
    const roleHierarchy: Record<TeamRole, number> = {
      owner: 4,
      admin: 3,
      member: 2,
      viewer: 1,
    };

    if (roleHierarchy[mockMember.role] < roleHierarchy[options.requireRole]) {
      return { 
        authorized: false, 
        error: `Requires ${options.requireRole} role or higher` 
      };
    }
  }

  // Check permission requirement
  if (options?.requirePermission) {
    const hasPermission = checkPermission(
      mockMember,
      options.requirePermission.resource,
      options.requirePermission.action
    );

    if (!hasPermission) {
      return { 
        authorized: false, 
        error: `Missing permission: ${options.requirePermission.action} ${options.requirePermission.resource}` 
      };
    }
  }

  return { authorized: true, user: mockUser, member: mockMember };
}