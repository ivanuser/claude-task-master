import { useState, useCallback } from 'react'
import { TeamMember, TeamRole, TeamInvitation } from '@/types/team'

interface UseTeamMembersReturn {
  loading: boolean
  error: Error | null
  inviteMember: (email: string, role: TeamRole, message?: string) => Promise<void>
  updateMemberRole: (memberId: string, role: TeamRole) => Promise<void>
  removeMember: (memberId: string) => Promise<void>
  resendInvitation: (invitationId: string) => Promise<void>
  cancelInvitation: (invitationId: string) => Promise<void>
  suspendMember: (memberId: string) => Promise<void>
  reactivateMember: (memberId: string) => Promise<void>
  bulkUpdateRoles: (memberIds: string[], role: TeamRole) => Promise<void>
}

export function useTeamMembers(teamId: string, onUpdate?: () => void): UseTeamMembersReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const inviteMember = useCallback(async (email: string, role: TeamRole, message?: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role, message }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to send invitation')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to invite member'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const updateMemberRole = useCallback(async (memberId: string, role: TeamRole) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update member role')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update member role'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const removeMember = useCallback(async (memberId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to remove member')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove member'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const resendInvitation = useCallback(async (invitationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/invitations/${invitationId}/resend`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to resend invitation')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to resend invitation'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const cancelInvitation = useCallback(async (invitationId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/invitations/${invitationId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        throw new Error('Failed to cancel invitation')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cancel invitation'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const suspendMember = useCallback(async (memberId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}/suspend`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to suspend member')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to suspend member'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const reactivateMember = useCallback(async (memberId: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/members/${memberId}/reactivate`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        throw new Error('Failed to reactivate member')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to reactivate member'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  const bulkUpdateRoles = useCallback(async (memberIds: string[], role: TeamRole) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/teams/${teamId}/members/bulk-update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds, role }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to update member roles')
      }
      
      onUpdate?.()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update member roles'))
      throw err
    } finally {
      setLoading(false)
    }
  }, [teamId, onUpdate])

  return {
    loading,
    error,
    inviteMember,
    updateMemberRole,
    removeMember,
    resendInvitation,
    cancelInvitation,
    suspendMember,
    reactivateMember,
    bulkUpdateRoles,
  }
}