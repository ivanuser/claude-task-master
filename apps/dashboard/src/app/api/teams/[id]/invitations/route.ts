import { NextRequest, NextResponse } from 'next/server'
import { TeamInvitation } from '@/types/team'

// Mock invitations data
const mockInvitations: TeamInvitation[] = [
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
    team: {
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
        integrations: {},
      },
    },
    invitedByUser: {
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
  }
]

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const teamInvitations = mockInvitations.filter(invitation => invitation.teamId === teamId)
    
    return NextResponse.json({ invitations: teamInvitations })
  } catch (error) {
    console.error('Error fetching team invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch team invitations' }, { status: 500 })
  }
}