import { NextRequest, NextResponse } from 'next/server'
import { Team } from '@/types/team'

// Mock teams data - in a real app this would come from a database
const mockTeams: Team[] = [
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
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // In real app, get from auth
    
    // Filter teams the user has access to
    let filteredTeams = [...mockTeams]
    
    return NextResponse.json({ teams: filteredTeams })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const teamData = await request.json()
    
    const newTeam: Team = {
      id: Math.random().toString(36).substr(2, 9),
      name: teamData.name,
      description: teamData.description,
      slug: teamData.slug || teamData.name.toLowerCase().replace(/\s+/g, '-'),
      avatar: teamData.avatar,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ownerId: '1', // In real app, get from auth
      memberCount: 1,
      projectCount: 0,
      plan: teamData.plan || 'free',
      billingEmail: teamData.billingEmail,
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
    }
    
    // In a real app, save to database
    mockTeams.push(newTeam)
    
    return NextResponse.json({ team: newTeam }, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}