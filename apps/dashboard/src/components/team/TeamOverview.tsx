import React from 'react'
import { Team, TeamMember, TeamInvitation } from '@/types/team'

interface TeamOverviewProps {
  team: Team
  members: TeamMember[] | null
  invitations: TeamInvitation[] | null
}

export function TeamOverview({ team, members, invitations }: TeamOverviewProps) {
  const stats = {
    totalMembers: members?.length || 0,
    activeMembers: members?.filter(m => m.status === 'active').length || 0,
    pendingInvitations: invitations?.filter(i => i.status === 'pending').length || 0,
    recentActivity: members?.filter(m => {
      if (!m.lastActiveAt) return false
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      return new Date(m.lastActiveAt) > dayAgo
    }).length || 0,
  }

  const recentMembers = members?.slice(0, 5) || []
  const teamAge = Math.floor((Date.now() - new Date(team.createdAt).getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-6">
      {/* Team Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-foreground">{stats.totalMembers}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-foreground">{stats.activeMembers}</p>
              <p className="text-sm text-muted-foreground">Active Members</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l-3 3.75L13 4M13 20l3-3.75L19 20" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-foreground">{team.projectCount}</p>
              <p className="text-sm text-muted-foreground">Projects</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-semibold text-foreground">{stats.recentActivity}</p>
              <p className="text-sm text-muted-foreground">Active Today</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Info */}
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">Team Information</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-foreground">Description</label>
              <p className="text-sm text-muted-foreground mt-1">
                {team.description || 'No description provided'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Plan</label>
              <div className="flex items-center gap-2 mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  team.plan === 'enterprise' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400' :
                  team.plan === 'pro' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                  'bg-secondary text-secondary-foreground'
                }`}>
                  {team.plan.charAt(0).toUpperCase() + team.plan.slice(1)}
                </span>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Created</label>
              <p className="text-sm text-muted-foreground mt-1">
                {new Date(team.createdAt).toLocaleDateString()} ({teamAge} days ago)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Team URL</label>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                /team/{team.slug}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Members */}
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-foreground">Recent Members</h3>
            <button className="text-sm text-primary hover:text-primary/90">
              View all
            </button>
          </div>
          {recentMembers.length > 0 ? (
            <div className="space-y-3">
              {recentMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-secondary-foreground">
                        {member.user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{member.user.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      member.status === 'active' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                      member.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400' :
                      'bg-secondary text-secondary-foreground'
                    }`}>
                      {member.status}
                    </div>
                    {member.lastActiveAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(member.lastActiveAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No members found</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Invite Members</p>
              <p className="text-xs text-muted-foreground">Add new team members</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7l-3 3.75L13 4M13 20l3-3.75L19 20" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">New Project</p>
              <p className="text-xs text-muted-foreground">Create a new project</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">View Analytics</p>
              <p className="text-xs text-muted-foreground">Team performance</p>
            </div>
          </button>

          <button className="flex items-center gap-3 p-4 border border-border rounded-lg hover:bg-accent transition-colors">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Team Settings</p>
              <p className="text-xs text-muted-foreground">Configure team</p>
            </div>
          </button>
        </div>
      </div>

      {/* Pending Invitations Alert */}
      {stats.pendingInvitations > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-yellow-800 dark:text-yellow-400">
              You have {stats.pendingInvitations} pending invitation{stats.pendingInvitations !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}