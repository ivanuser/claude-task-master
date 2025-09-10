import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { Team } from '@/types/team'

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Get projects where user is a member (these represent "teams" in Task Master context)
    const userProjects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    })

    // Convert projects to team format
    const teams: Team[] = userProjects.map(project => {
      const owner = project.members.find(m => m.role === 'OWNER') || project.members[0]
      
      return {
        id: project.id,
        name: project.name,
        description: project.description || `${project.name} project team`,
        slug: project.name.toLowerCase().replace(/\s+/g, '-'),
        avatar: null,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        ownerId: owner?.userId || userId,
        memberCount: project._count.members,
        projectCount: 1, // Each project represents one "team"
        plan: 'free', // Default plan
        isActive: project.status === 'ACTIVE',
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
    })

    // If no projects, create a default personal "team"
    if (teams.length === 0) {
      const defaultTeam: Team = {
        id: `personal-${userId}`,
        name: 'Personal Workspace',
        description: 'Your personal Task Master workspace',
        slug: 'personal-workspace',
        avatar: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ownerId: userId,
        memberCount: 1,
        projectCount: 0,
        plan: 'free',
        isActive: true,
        settings: {
          allowMemberInvites: false,
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
      teams.push(defaultTeam)
    }
    
    return NextResponse.json({ teams })
  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const teamData = await request.json()
    
    // Create a new project (which represents a team in Task Master context)
    const newProject = await prisma.project.create({
      data: {
        name: teamData.name,
        description: teamData.description || `${teamData.name} project team`,
        status: 'ACTIVE',
        visibility: 'PRIVATE',
        members: {
          create: {
            userId: userId,
            role: 'OWNER',
            permissions: []
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    })

    // Convert to team format
    const newTeam: Team = {
      id: newProject.id,
      name: newProject.name,
      description: newProject.description || `${newProject.name} project team`,
      slug: newProject.name.toLowerCase().replace(/\s+/g, '-'),
      avatar: null,
      createdAt: newProject.createdAt.toISOString(),
      updatedAt: newProject.updatedAt.toISOString(),
      ownerId: userId,
      memberCount: newProject._count.members,
      projectCount: 1,
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
    }
    
    return NextResponse.json({ team: newTeam }, { status: 201 })
  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}