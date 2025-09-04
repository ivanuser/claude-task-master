import { NextRequest, NextResponse } from 'next/server'
import { TeamMember } from '@/types/team'

// Mock members data
const mockMembers: TeamMember[] = [
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
]

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const teamId = params.id
    const teamMembers = mockMembers.filter(member => member.teamId === teamId)
    
    return NextResponse.json({ members: teamMembers })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}