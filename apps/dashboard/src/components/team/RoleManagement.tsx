import React from 'react'
import { Team, TeamMember, rolePermissions } from '@/types/team'
import { UseTeamMembersReturn } from '@/hooks/useTeamMembers'

interface RoleManagementProps {
  team: Team
  members: TeamMember[]
  actions: UseTeamMembersReturn
}

export function RoleManagement({ team, members, actions }: RoleManagementProps) {
  const roleStats = {
    owner: members.filter(m => m.role === 'owner').length,
    admin: members.filter(m => m.role === 'admin').length,
    member: members.filter(m => m.role === 'member').length,
    viewer: members.filter(m => m.role === 'viewer').length,
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Role Management</h3>
        <p className="text-sm text-gray-500">
          Configure team roles and permissions
        </p>
      </div>

      {/* Role Distribution */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(roleStats).map(([role, count]) => (
          <div key={role} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-2xl font-bold text-gray-900">{count}</div>
            <div className="text-sm text-gray-500 capitalize">{role}s</div>
          </div>
        ))}
      </div>

      {/* Role Permissions */}
      <div className="space-y-4">
        {Object.entries(rolePermissions).map(([role, permissions]) => (
          <div key={role} className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900 capitalize">{role}</h4>
              <span className="text-sm text-gray-500">
                {permissions.length} permissions
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {permissions.map((permission) => (
                <div key={permission.id} className="text-sm text-gray-600">
                  ✓ {permission.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}