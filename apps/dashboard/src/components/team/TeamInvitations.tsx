import React, { useState } from 'react'
import { Team, TeamInvitation, TeamRole } from '@/types/team'
import { UseTeamMembersReturn } from '@/hooks/useTeamMembers'

interface TeamInvitationsProps {
  team: Team
  invitations: TeamInvitation[]
  actions: UseTeamMembersReturn
}

export function TeamInvitations({ team, invitations, actions }: TeamInvitationsProps) {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<TeamRole>('member')
  const [message, setMessage] = useState('')

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    try {
      await actions.inviteMember(email, role, message || undefined)
      setEmail('')
      setMessage('')
      setShowInviteForm(false)
    } catch (error) {
      console.error('Failed to send invitation:', error)
    }
  }

  const getStatusBadge = (status: TeamInvitation['status']) => {
    const colors = {
      pending: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-400',
      accepted: 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400',
      declined: 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400',
      expired: 'bg-secondary text-secondary-foreground',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    )
  }

  const pendingInvitations = invitations.filter(i => i.status === 'pending')
  const expiredInvitations = invitations.filter(i => i.status === 'expired')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-foreground">Team Invitations</h3>
          <p className="text-sm text-muted-foreground">
            Manage pending invitations and invite new members
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Send Invitation
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingInvitations.length}</div>
          <div className="text-sm text-muted-foreground">Pending</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{expiredInvitations.length}</div>
          <div className="text-sm text-muted-foreground">Expired</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-foreground">{invitations.length}</div>
          <div className="text-sm text-muted-foreground">Total Sent</div>
        </div>
      </div>

      {/* Invitations List */}
      <div className="bg-card shadow-sm border border-border rounded-lg overflow-hidden">
        {invitations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-secondary/50 dark:bg-secondary/20">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {invitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-accent">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-foreground">{invitation.email}</div>
                      {invitation.message && (
                        <div className="text-xs text-muted-foreground mt-1">{invitation.message}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        invitation.role === 'admin' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400' :
                        invitation.role === 'member' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400' :
                        'bg-secondary text-secondary-foreground'
                      }`}>
                        {invitation.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(invitation.status)}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {invitation.invitedByUser?.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {new Date(invitation.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={() => actions.resendInvitation(invitation.id)}
                              className="text-xs text-primary hover:text-primary/80"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => actions.cancelInvitation(invitation.id)}
                              className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {invitation.status === 'expired' && (
                          <button
                            onClick={() => actions.resendInvitation(invitation.id)}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Resend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 2.26a2 2 0 001.22 0L20 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No invitations sent</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get started by inviting team members.</p>
          </div>
        )}
      </div>

      {/* Invite Form Modal */}
      {showInviteForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg p-6 w-full max-w-md mx-4 border border-border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Invite Team Member</h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="member@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TeamRole)}
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                >
                  <option value="viewer">Viewer</option>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Personal Message (Optional)</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  placeholder="Welcome to our team!"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteForm(false)}
                  className="px-4 py-2 text-sm font-medium text-secondary-foreground bg-secondary rounded-lg hover:bg-secondary/80"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actions.loading}
                  className="px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actions.loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}