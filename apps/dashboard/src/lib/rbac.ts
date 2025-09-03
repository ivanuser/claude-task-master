import { UserRole, ProjectRole } from "../../../generated/prisma";

// System-wide permissions
export enum Permission {
  // User management
  READ_USERS = "read:users",
  CREATE_USERS = "create:users",
  UPDATE_USERS = "update:users",
  DELETE_USERS = "delete:users",
  
  // Project management
  READ_PROJECTS = "read:projects",
  CREATE_PROJECTS = "create:projects",
  UPDATE_PROJECTS = "update:projects",
  DELETE_PROJECTS = "delete:projects",
  
  // Task management
  READ_TASKS = "read:tasks",
  CREATE_TASKS = "create:tasks",
  UPDATE_TASKS = "update:tasks",
  DELETE_TASKS = "delete:tasks",
  
  // System administration
  MANAGE_SYSTEM = "manage:system",
  VIEW_ANALYTICS = "view:analytics",
  MANAGE_ROLES = "manage:roles",
}

// Role-based permissions mapping
const rolePermissions: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    Permission.READ_USERS,
    Permission.CREATE_USERS,
    Permission.UPDATE_USERS,
    Permission.DELETE_USERS,
    Permission.READ_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.UPDATE_PROJECTS,
    Permission.DELETE_PROJECTS,
    Permission.READ_TASKS,
    Permission.CREATE_TASKS,
    Permission.UPDATE_TASKS,
    Permission.DELETE_TASKS,
    Permission.MANAGE_SYSTEM,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_ROLES,
  ],
  ADMIN: [
    Permission.READ_USERS,
    Permission.UPDATE_USERS,
    Permission.READ_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.UPDATE_PROJECTS,
    Permission.DELETE_PROJECTS,
    Permission.READ_TASKS,
    Permission.CREATE_TASKS,
    Permission.UPDATE_TASKS,
    Permission.DELETE_TASKS,
    Permission.VIEW_ANALYTICS,
  ],
  USER: [
    Permission.READ_PROJECTS,
    Permission.CREATE_PROJECTS,
    Permission.UPDATE_PROJECTS,
    Permission.READ_TASKS,
    Permission.CREATE_TASKS,
    Permission.UPDATE_TASKS,
    Permission.DELETE_TASKS,
  ],
  VIEWER: [
    Permission.READ_PROJECTS,
    Permission.READ_TASKS,
  ],
};

// Project-level permissions
export enum ProjectPermission {
  READ = "read",
  WRITE = "write", 
  DELETE = "delete",
  MANAGE_MEMBERS = "manage_members",
  MANAGE_SETTINGS = "manage_settings",
}

const projectRolePermissions: Record<ProjectRole, ProjectPermission[]> = {
  OWNER: [
    ProjectPermission.READ,
    ProjectPermission.WRITE,
    ProjectPermission.DELETE,
    ProjectPermission.MANAGE_MEMBERS,
    ProjectPermission.MANAGE_SETTINGS,
  ],
  ADMIN: [
    ProjectPermission.READ,
    ProjectPermission.WRITE,
    ProjectPermission.DELETE,
    ProjectPermission.MANAGE_MEMBERS,
  ],
  MEMBER: [
    ProjectPermission.READ,
    ProjectPermission.WRITE,
  ],
  VIEWER: [
    ProjectPermission.READ,
  ],
};

export class RBAC {
  // Check if user has system-wide permission
  static hasPermission(userRole: UserRole, permission: Permission): boolean {
    const permissions = rolePermissions[userRole] || [];
    return permissions.includes(permission);
  }

  // Check if user has multiple permissions
  static hasAllPermissions(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(userRole, permission));
  }

  // Check if user has any of the specified permissions
  static hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(userRole, permission));
  }

  // Check project-level permission
  static hasProjectPermission(projectRole: ProjectRole, permission: ProjectPermission): boolean {
    const permissions = projectRolePermissions[projectRole] || [];
    return permissions.includes(permission);
  }

  // Get all permissions for a user role
  static getUserPermissions(userRole: UserRole): Permission[] {
    return rolePermissions[userRole] || [];
  }

  // Get all permissions for a project role
  static getProjectPermissions(projectRole: ProjectRole): ProjectPermission[] {
    return projectRolePermissions[projectRole] || [];
  }

  // Check if user can access resource (combines user and project roles)
  static canAccessResource(
    userRole: UserRole,
    projectRole: ProjectRole | null,
    systemPermission: Permission,
    projectPermission?: ProjectPermission
  ): boolean {
    // First check system-wide permission
    if (!this.hasPermission(userRole, systemPermission)) {
      return false;
    }

    // If project permission is specified and user is member of project, check project permission
    if (projectPermission && projectRole) {
      return this.hasProjectPermission(projectRole, projectPermission);
    }

    return true;
  }

  // Check if user is admin (system-wide)
  static isAdmin(userRole: UserRole): boolean {
    return userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;
  }

  // Check if user is super admin
  static isSuperAdmin(userRole: UserRole): boolean {
    return userRole === UserRole.SUPER_ADMIN;
  }

  // Get minimum required role for permission
  static getMinimumRoleForPermission(permission: Permission): UserRole | null {
    for (const [role, permissions] of Object.entries(rolePermissions)) {
      if (permissions.includes(permission)) {
        return role as UserRole;
      }
    }
    return null;
  }

  // Validate role hierarchy (higher roles can perform actions of lower roles)
  static isRoleHigherOrEqual(userRole: UserRole, requiredRole: UserRole): boolean {
    const roleHierarchy = {
      [UserRole.VIEWER]: 0,
      [UserRole.USER]: 1,
      [UserRole.ADMIN]: 2,
      [UserRole.SUPER_ADMIN]: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}