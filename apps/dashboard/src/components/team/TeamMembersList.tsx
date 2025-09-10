import React, { useState } from 'react'
import { Team, TeamMember, TeamRole } from '@/types/team'
import { UseTeamMembersReturn } from '@/hooks/useTeamMembers'

interface TeamMembersListProps {
  team: Team
  members: TeamMember[]
  actions: UseTeamMembersReturn
}

export function TeamMembersList({ team, members, actions }: TeamMembersListProps) {
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [showInviteModal, setShowInviteModal] = useState(false)

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         member.user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    
    return matchesSearch && matchesStatus && matchesRole
  })

  const getRoleBadge = (role: TeamRole) => {
    const colors = {
      owner: 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400',
      admin: 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400',
      member: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
      viewer: 'bg-secondary text-secondary-foreground',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[role]}`}>
        {role}
      </span>
    )
  }

  const getStatusBadge = (status: TeamMember['status']) => {
    const colors = {
      active: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
      inactive: 'bg-secondary text-secondary-foreground',
      pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
      suspended: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    )
  }

  const formatLastActive = (lastActiveAt?: string) => {
    if (!lastActiveAt) return 'Never'
    const date = new Date(lastActiveAt)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 48) return 'Yesterday'
    return date.toLocaleDateString()
  }

  const handleMemberSelect = (memberId: string, selected: boolean) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(memberId)
      } else {
        newSet.delete(memberId)
      }
      return newSet
    })
  }

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedMembers(new Set(filteredMembers.map(m => m.id)))
    } else {
      setSelectedMembers(new Set())
    }
  }

  const handleBulkRoleUpdate = async (role: TeamRole) => {
    if (selectedMembers.size === 0) return
    
    try {
      await actions.bulkUpdateRoles(Array.from(selectedMembers), role)
      setSelectedMembers(new Set())
    } catch (error) {
      console.error('Failed to update member roles:', error)
    }
  }

  const allSelected = filteredMembers.length > 0 && filteredMembers.every(member => selectedMembers.has(member.id))
  const someSelected = filteredMembers.some(member => selectedMembers.has(member.id))

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border rounded-lg leading-5 bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:placeholder-muted-foreground/70 focus:ring-1 focus:ring-primary focus:border-primary"
              placeholder="Search members..."
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:border-primary focus:ring-primary"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:border-primary focus:ring-primary"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
        
        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Invite Member
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedMembers.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-400">
                {selectedMembers.size} member{selectedMembers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkRoleUpdate('admin')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1 border border-blue-300 dark:border-blue-700 rounded"
              >
                Make Admin
              </button>
              <button
                onClick={() => handleBulkRoleUpdate('member')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1 border border-blue-300 dark:border-blue-700 rounded"
              >
                Make Member
              </button>
              <button
                onClick={() => handleBulkRoleUpdate('viewer')}
                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-1 border border-blue-300 dark:border-blue-700 rounded"
              >
                Make Viewer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members Table */}
      <div className="bg-card shadow-sm border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead className="bg-secondary/50 dark:bg-secondary/20">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected
                    }}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
              {filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-accent">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(member.id)}
                      onChange={(e) => handleMemberSelect(member.id, e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <span className="text-sm font-medium text-secondary-foreground">
                            {member.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{member.user.name}</div>
                        <div className="text-sm text-muted-foreground">{member.user.email}</div>
                        {member.user.location && (
                          <div className="text-xs text-muted-foreground/75">{member.user.location}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getRoleBadge(member.role)}
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(member.status)}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {formatLastActive(member.lastActiveAt)}
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground">
                    {new Date(member.joinedAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => actions.updateMemberRole(member.id, e.target.value as TeamRole)}
                        className="text-xs border-border bg-background text-foreground rounded focus:border-primary focus:ring-primary"
                        disabled={member.role === 'owner'}
                      >
                        <option value="owner" disabled>Owner</option>
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="viewer">Viewer</option>
                      </select>
                      
                      {member.status === 'active' ? (
                        <button
                          onClick={() => actions.suspendMember(member.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                          disabled={member.role === 'owner'}
                        >
                          Suspend
                        </button>
                      ) : member.status === 'suspended' ? (
                        <button
                          onClick={() => actions.reactivateMember(member.id)}
                          className="text-xs text-green-600 hover:text-green-800"
                        >
                          Reactivate
                        </button>
                      ) : null}
                      
                      {member.role !== 'owner' && (
                        <button
                          onClick={() => actions.removeMember(member.id)}
                          className="text-xs text-red-600 hover:text-red-800"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No members found</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {searchQuery || statusFilter !== 'all' || roleFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Get started by inviting team members'
              }
            </p>
          </div>
        )}
      </div>

      {/* Team Summary */}
      <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-foreground">
              {members.filter(m => m.status === 'active').length}
            </div>
            <div className="text-sm text-muted-foreground">Active Members</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {members.filter(m => m.role === 'admin').length}
            </div>
            <div className="text-sm text-muted-foreground">Admins</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {members.filter(m => m.status === 'pending').length}
            </div>
            <div className="text-sm text-muted-foreground">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-foreground">
              {members.filter(m => {
                if (!m.lastActiveAt) return false
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
                return new Date(m.lastActiveAt) > dayAgo
              }).length}
            </div>
            <div className="text-sm text-muted-foreground">Active Today</div>
          </div>
        </div>
      </div>

      {/* Invite Modal placeholder */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border border-border">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Invite Member</h3>
            <p className="text-sm text-muted-foreground mb-4">Invitation functionality will be implemented in the next step.</p>
            <button
              onClick={() => setShowInviteModal(false)}
              className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}