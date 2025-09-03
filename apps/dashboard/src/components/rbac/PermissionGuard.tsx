'use client';

import { useRBAC } from "@/hooks/useRBAC";
import { Permission, ProjectPermission } from "@/lib/rbac";
import { ProjectRole } from "../../../../generated/prisma";

interface PermissionGuardProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  projectRole?: ProjectRole;
  projectPermission?: ProjectPermission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  permission,
  permissions = [],
  requireAll = true,
  projectRole,
  projectPermission,
  children,
  fallback = null,
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, canAccessResource } = useRBAC();

  let hasAccess = false;

  if (permission && projectRole && projectPermission) {
    // Check both system and project permissions
    hasAccess = canAccessResource(permission, projectRole, projectPermission);
  } else if (permission) {
    // Check single system permission
    hasAccess = hasPermission(permission);
  } else if (permissions.length > 0) {
    // Check multiple permissions
    hasAccess = requireAll ? hasAllPermissions(permissions) : hasAnyPermission(permissions);
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Convenience components for common use cases
export function AdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard
      permissions={[Permission.MANAGE_SYSTEM, Permission.MANAGE_ROLES]}
      requireAll={false}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function SuperAdminOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  return (
    <PermissionGuard
      permission={Permission.MANAGE_SYSTEM}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}

export function ProjectOwnerOnly({ 
  children, 
  fallback = null 
}: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  return (
    <PermissionGuard
      permission={Permission.READ_PROJECTS}
      projectRole="OWNER"
      projectPermission={ProjectPermission.MANAGE_SETTINGS}
      fallback={fallback}
    >
      {children}
    </PermissionGuard>
  );
}