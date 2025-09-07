'use client'

import React, { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { 
  UsersIcon, 
  BellIcon, 
  CogIcon,
  MegaphoneIcon,
  UserPlusIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { ProjectActivityFeed } from '@/components/teams/ProjectActivityFeed'
import { TeamNotificationSettings } from '@/components/teams/TeamNotificationSettings'
import { TeamAnnouncementModal } from '@/components/teams/TeamAnnouncementModal'
import { TeamInviteModal } from '@/components/teams/TeamInviteModal'
import { TeamNotificationManager } from '@/components/teams/TeamNotificationManager'

interface TeamMember {
  id: string
  userId: string
  projectId: string
  role: 'OWNER' | 'ADMIN' | 'MEMBER'
  joinedAt: string
  user: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

export default function ProjectTeamPage() {
  const { data: session } = useSession()
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserRole, setCurrentUserRole] = useState<'OWNER' | 'ADMIN' | 'MEMBER'>('MEMBER')
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'settings'>('members')

  const isAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN'

  // Fetch team members
  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/teams/${projectId}/members`)
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
        
        // Find current user's role
        const currentMember = data.find(
          (m: TeamMember) => m.user.email === session?.user?.email
        )
        if (currentMember) {
          setCurrentUserRole(currentMember.role)
        }
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session && projectId) {
      fetchMembers()
    }
  }, [session, projectId])

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/teams/${projectId}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (response.ok) {
        toast.success('Role updated successfully')
        fetchMembers()
      } else {
        throw new Error('Failed to update role')
      }
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Failed to update role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`/api/teams/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Member removed successfully')
        fetchMembers()
      } else {
        throw new Error('Failed to remove member')
      }
    } catch (error) {
      console.error('Error removing member:', error)
      toast.error('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-taskmaster-600"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Back to Project
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
            <p className="text-gray-600 mt-2">Manage team members and notifications</p>
          </div>
          
          {isAdmin && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center px-4 py-2 bg-taskmaster-600 text-white rounded-lg hover:bg-taskmaster-700"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Invite Members
              </button>
              <button
                onClick={() => setShowAnnouncementModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <MegaphoneIcon className="h-5 w-5 mr-2" />
                Send Announcement
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'members'
                ? 'border-taskmaster-500 text-taskmaster-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UsersIcon className="h-5 w-5 inline mr-2" />
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'activity'
                ? 'border-taskmaster-500 text-taskmaster-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BellIcon className="h-5 w-5 inline mr-2" />
            Activity
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-taskmaster-500 text-taskmaster-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CogIcon className="h-5 w-5 inline mr-2" />
            Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {activeTab === 'members' && (
          <>
            <div className="lg:col-span-2">
              {/* Members List */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Team Members</h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {members.map((member) => (
                    <div key={member.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          {member.user.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name || member.user.email}
                              className="h-10 w-10 rounded-full"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                {(member.user.name || member.user.email)[0].toUpperCase()}
                              </span>
                            </div>
                          )}
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-900">
                              {member.user.name || member.user.email}
                            </p>
                            <p className="text-sm text-gray-500">{member.user.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                          {isAdmin && member.user.email !== session?.user?.email ? (
                            <>
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                                className="text-sm border-gray-300 rounded-md"
                              >
                                <option value="MEMBER">Member</option>
                                <option value="ADMIN">Admin</option>
                                <option value="OWNER">Owner</option>
                              </select>
                              <button
                                onClick={() => handleRemoveMember(member.userId)}
                                className="text-red-600 hover:text-red-700 text-sm"
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              {member.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="lg:col-span-1">
              <ProjectActivityFeed projectId={projectId} className="sticky top-4" />
            </div>
          </>
        )}

        {activeTab === 'activity' && (
          <>
            <div className="lg:col-span-2">
              <ProjectActivityFeed projectId={projectId} />
            </div>
            
            <div className="lg:col-span-1 space-y-6">
              {isAdmin && (
                <TeamNotificationManager projectId={projectId} isAdmin={isAdmin} />
              )}
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <>
            <div className="lg:col-span-2 space-y-6">
              <TeamNotificationSettings projectId={projectId} isAdmin={isAdmin} />
            </div>
            
            <div className="lg:col-span-1">
              {isAdmin && (
                <TeamNotificationManager projectId={projectId} isAdmin={isAdmin} />
              )}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <TeamAnnouncementModal
        projectId={projectId}
        isOpen={showAnnouncementModal}
        onClose={() => setShowAnnouncementModal(false)}
        onSuccess={() => {
          // Refresh activity feed if needed
        }}
      />

      <TeamInviteModal
        projectId={projectId}
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onSuccess={() => {
          fetchMembers()
        }}
      />
    </div>
  )
}