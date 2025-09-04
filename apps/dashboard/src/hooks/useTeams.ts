import { useState, useEffect, useCallback } from 'react'
import { Team, TeamMember, TeamInvitation } from '@/types/team'

interface UseTeamsReturn {
  teams: Team[] | null
  currentTeam: Team | null
  members: TeamMember[] | null
  invitations: TeamInvitation[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createTeam: (team: Partial<Team>) => Promise<void>
  updateTeam: (teamId: string, updates: Partial<Team>) => Promise<void>
  deleteTeam: (teamId: string) => Promise<void>
  selectTeam: (teamId: string) => void
}

export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[] | null>(null)
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[] | null>(null)
  const [invitations, setInvitations] = useState<TeamInvitation[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/teams')
      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }
      const data = await response.json()
      setTeams(data.teams || data)
      
      // Set first team as current if none selected
      if (data.teams?.length > 0 && !currentTeam) {
        setCurrentTeam(data.teams[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      // Use mock data if API fails
      const mockData = getMockTeams()
      setTeams(mockData.teams)
      setCurrentTeam(mockData.teams[0])
    } finally {
      setLoading(false)
    }
  }, [currentTeam])

  const fetchTeamMembers = useCallback(async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch team members')
      }
      const data = await response.json()
      setMembers(data.members || data)
    } catch (err) {
      console.error('Error fetching team members:', err)
      setMembers(getMockMembers())
    }
  }, [])

  const fetchInvitations = useCallback(async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}/invitations`)
      if (!response.ok) {
        throw new Error('Failed to fetch invitations')
      }
      const data = await response.json()
      setInvitations(data.invitations || data)
    } catch (err) {
      console.error('Error fetching invitations:', err)
      setInvitations(getMockInvitations())
    }
  }, [])

  const createTeam = useCallback(async (teamData: Partial<Team>) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamData),
      })
      if (!response.ok) throw new Error('Failed to create team')
      await fetchTeams()
    } catch (error) {
      // For now, add team locally
      const newTeam: Team = {
        id: Math.random().toString(36).substr(2, 9),
        name: teamData.name || 'New Team',
        slug: (teamData.name || 'new-team').toLowerCase().replace(/\s+/g, '-'),
        description: teamData.description,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: '1', // Mock current user ID
        memberCount: 1,
        projectCount: 0,
        plan: 'free',
        isActive: true,
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
        ...teamData,
      }
      setTeams(prev => prev ? [...prev, newTeam] : [newTeam])
    }
  }, [fetchTeams])

  const updateTeam = useCallback(async (teamId: string, updates: Partial<Team>) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update team')
      await fetchTeams()
    } catch (error) {
      // Update locally for now
      setTeams(prev => prev ? prev.map(team => 
        team.id === teamId ? { ...team, ...updates, updatedAt: new Date().toISOString() } : team
      ) : prev)
      
      if (currentTeam?.id === teamId) {
        setCurrentTeam(prev => prev ? { ...prev, ...updates, updatedAt: new Date().toISOString() } : prev)
      }
    }
  }, [fetchTeams, currentTeam])

  const deleteTeam = useCallback(async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete team')
      await fetchTeams()
    } catch (error) {
      // Delete locally for now
      setTeams(prev => prev ? prev.filter(team => team.id !== teamId) : prev)
      if (currentTeam?.id === teamId) {
        setCurrentTeam(null)
      }
    }
  }, [fetchTeams, currentTeam])

  const selectTeam = useCallback((teamId: string) => {
    const team = teams?.find(t => t.id === teamId)
    if (team) {
      setCurrentTeam(team)
      fetchTeamMembers(teamId)
      fetchInvitations(teamId)
    }
  }, [teams, fetchTeamMembers, fetchInvitations])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  useEffect(() => {
    if (currentTeam) {
      fetchTeamMembers(currentTeam.id)
      fetchInvitations(currentTeam.id)
    }
  }, [currentTeam, fetchTeamMembers, fetchInvitations])

  return {
    teams,
    currentTeam,
    members,
    invitations,
    loading,
    error,
    refetch: fetchTeams,
    createTeam,
    updateTeam,
    deleteTeam,
    selectTeam,
  }
}

function getMockTeams(): { teams: Team[] } {
  return {
    teams: [
      {
        id: '1',
        name: 'Product Development',
        description: 'Core product development team',
        slug: 'product-development',
        avatar: null,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: '1',
        memberCount: 8,
        projectCount: 12,
        plan: 'pro',
        billingEmail: 'billing@company.com',
        isActive: true,
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
          integrations: {
            slack: {
              enabled: true,
              channel: '#product-dev',
            },
            github: {
              enabled: true,
              organization: 'company-dev',
            },
          },
        },
      },
      {
        id: '2',
        name: 'Design Team',
        description: 'UI/UX and graphic design team',
        slug: 'design-team',
        avatar: null,
        createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: '2',
        memberCount: 4,
        projectCount: 6,
        plan: 'free',
        isActive: true,
        settings: {
          allowMemberInvites: true,
          requireApproval: true,
          defaultRole: 'member',
          notificationPreferences: {
            taskAssigned: true,
            taskUpdated: false,
            taskComment: true,
            taskDue: true,
            teamUpdates: true,
            weeklyReport: false,
            emailDigest: 'weekly',
            pushEnabled: false,
          },
          integrations: {
            slack: {
              enabled: true,
              channel: '#design',
            },
          },
        },
      },
    ],
  }
}

function getMockMembers(): TeamMember[] {
  return [
    {
      id: '1',
      userId: '1',
      teamId: '1',
      role: 'owner',
      permissions: [],
      joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      lastActiveAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      user: {
        id: '1',
        email: 'john@company.com',
        name: 'John Doe',
        avatar: null,
        username: 'john.doe',
        bio: 'Product lead and team owner',
        location: 'San Francisco, CA',
        timezone: 'America/Los_Angeles',
        createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: true,
        twoFactorEnabled: true,
        preferences: {
          theme: 'dark',
          language: 'en',
          emailNotifications: true,
          pushNotifications: true,
          weeklyDigest: true,
        },
      },
    },
    {
      id: '2',
      userId: '2',
      teamId: '1',
      role: 'admin',
      permissions: [],
      joinedAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      lastActiveAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      user: {
        id: '2',
        email: 'sarah@company.com',
        name: 'Sarah Smith',
        avatar: null,
        username: 'sarah.smith',
        bio: 'Senior developer and project manager',
        location: 'New York, NY',
        timezone: 'America/New_York',
        createdAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: true,
        twoFactorEnabled: false,
        preferences: {
          theme: 'light',
          language: 'en',
          emailNotifications: true,
          pushNotifications: false,
          weeklyDigest: false,
        },
      },
    },
    {
      id: '3',
      userId: '3',
      teamId: '1',
      role: 'member',
      permissions: [],
      joinedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'active',
      lastActiveAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      user: {
        id: '3',
        email: 'mike@company.com',
        name: 'Mike Johnson',
        avatar: null,
        username: 'mike.j',
        bio: 'Frontend developer',
        location: 'Austin, TX',
        timezone: 'America/Chicago',
        createdAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString(),
        emailVerified: true,
        twoFactorEnabled: false,
        preferences: {
          theme: 'system',
          language: 'en',
          emailNotifications: false,
          pushNotifications: true,
          weeklyDigest: true,
        },
      },
    },
  ]
}

function getMockInvitations(): TeamInvitation[] {
  return [
    {
      id: '1',
      teamId: '1',
      email: 'alex@company.com',
      role: 'member',
      invitedBy: '1',
      status: 'pending',
      token: 'abc123def456',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      message: 'Welcome to the product development team!',
      team: getMockTeams().teams[0],
      invitedByUser: getMockMembers()[0].user,
    },
    {
      id: '2',
      teamId: '1',
      email: 'lisa@company.com',
      role: 'viewer',
      invitedBy: '1',
      status: 'expired',
      token: 'expired123',
      expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      team: getMockTeams().teams[0],
      invitedByUser: getMockMembers()[0].user,
    },
  ]
}