import { useAuth } from "./useAuth";
import { RBAC, Permission, ProjectPermission } from "@/lib/rbac";
import { UserRole, ProjectRole } from "../../../generated/prisma";

export function useRBAC() {
  const { user } = useAuth();

  const hasPermission = (permission: Permission): boolean => {
    if (!user || !('role' in user)) return false;
    return RBAC.hasPermission(user.role as UserRole, permission);
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    if (!user || !('role' in user)) return false;
    return RBAC.hasAllPermissions(user.role as UserRole, permissions);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    if (!user || !('role' in user)) return false;
    return RBAC.hasAnyPermission(user.role as UserRole, permissions);
  };

  const hasProjectPermission = (projectRole: ProjectRole, permission: ProjectPermission): boolean => {
    return RBAC.hasProjectPermission(projectRole, permission);
  };

  const canAccessResource = (
    systemPermission: Permission,
    projectRole?: ProjectRole | null,
    projectPermission?: ProjectPermission
  ): boolean => {
    if (!user || !('role' in user)) return false;
    return RBAC.canAccessResource(
      user.role as UserRole,
      projectRole || null,
      systemPermission,
      projectPermission
    );
  };

  const isAdmin = (): boolean => {
    if (!user || !('role' in user)) return false;
    return RBAC.isAdmin(user.role as UserRole);
  };

  const isSuperAdmin = (): boolean => {
    if (!user || !('role' in user)) return false;
    return RBAC.isSuperAdmin(user.role as UserRole);
  };

  const getUserPermissions = (): Permission[] => {
    if (!user || !('role' in user)) return [];
    return RBAC.getUserPermissions(user.role as UserRole);
  };

  return {
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    hasProjectPermission,
    canAccessResource,
    isAdmin,
    isSuperAdmin,
    getUserPermissions,
    userRole: user && 'role' in user ? (user.role as UserRole) : null,
  };
}