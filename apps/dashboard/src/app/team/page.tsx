'use client'

import { useState } from 'react'
import { useTeams } from '@/hooks/useTeams'
import { useTeamMembers } from '@/hooks/useTeamMembers'
import { TeamOverview } from '@/components/team/TeamOverview'
import { TeamMembersList } from '@/components/team/TeamMembersList'
import { TeamInvitations } from '@/components/team/TeamInvitations'
import { TeamSettings } from '@/components/team/TeamSettings'
import { TeamActivity } from '@/components/team/TeamActivity'
import { RoleManagement } from '@/components/team/RoleManagement'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { ErrorState } from '@/components/ui/ErrorState'
import BackButton from '@/components/ui/BackButton'

type TabType = 'overview' | 'members' | 'invitations' | 'roles' | 'activity' | 'settings'

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const { teams, currentTeam, members, invitations, loading, error, refetch, selectTeam } = useTeams()
  const teamMemberActions = useTeamMembers(currentTeam?.id || '', refetch)

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: '🏠' },
    { id: 'members' as const, label: 'Members', icon: '👥' },
    { id: 'invitations' as const, label: 'Invitations', icon: '📧', badge: invitations?.filter(i => i.status === 'pending').length },
    { id: 'roles' as const, label: 'Roles', icon: '🔐' },
    { id: 'activity' as const, label: 'Activity', icon: '📊' },
    { id: 'settings' as const, label: 'Settings', icon: '⚙️' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState 
        title="Failed to load team data"
        message="There was an error loading your team information. Please try again."
        onRetry={refetch}
      />
    )
  }

  if (!teams || teams.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-24 w-24 text-gray-400">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="h-full w-full">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No teams found</h3>
        <p className="mt-2 text-sm text-gray-500">Get started by creating your first team.</p>
        <div className="mt-6">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Create Team
          </button>
        </div>
      </div>
    )
  }

  if (!currentTeam) {
    return (
      <ErrorState 
        title="No team selected"
        message="Please select a team to view its details."
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton href="/dashboard" label="Back to Dashboard" />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{currentTeam.name}</h1>
            <p className="text-sm text-gray-500">
              {currentTeam.memberCount} members • {currentTeam.projectCount} projects
            </p>
          </div>
          {teams.length > 1 && (
            <select
              value={currentTeam.id}
              onChange={(e) => selectTeam(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-blue-500"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
            </svg>
            Share Team
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'overview' && (
          <TeamOverview
            team={currentTeam}
            members={members}
            invitations={invitations}
          />
        )}
        
        {activeTab === 'members' && (
          <TeamMembersList
            team={currentTeam}
            members={members || []}
            actions={teamMemberActions}
          />
        )}
        
        {activeTab === 'invitations' && (
          <TeamInvitations
            team={currentTeam}
            invitations={invitations || []}
            actions={teamMemberActions}
          />
        )}
        
        {activeTab === 'roles' && (
          <RoleManagement
            team={currentTeam}
            members={members || []}
            actions={teamMemberActions}
          />
        )}
        
        {activeTab === 'activity' && (
          <TeamActivity
            team={currentTeam}
          />
        )}
        
        {activeTab === 'settings' && (
          <TeamSettings
            team={currentTeam}
            onUpdate={refetch}
          />
        )}
      </div>
    </div>
  )
}