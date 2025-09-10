import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamId = params.id
    const userId = session.user.id

    // Handle personal workspace
    if (teamId.startsWith('personal-')) {
      const personalUserId = teamId.replace('personal-', '')
      if (personalUserId !== userId) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      return NextResponse.json({
        team: {
          id: teamId,
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
      })
    }

    // Get project details for real team
    const project = await prisma.project.findFirst({
      where: {
        id: teamId,
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

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    const owner = project.members.find(m => m.role === 'OWNER') || project.members[0]

    const team = {
      id: project.id,
      name: project.name,
      description: project.description || `${project.name} project team`,
      slug: project.name.toLowerCase().replace(/\s+/g, '-'),
      avatar: null,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      ownerId: owner?.userId || userId,
      memberCount: project._count.members,
      projectCount: 1,
      plan: 'free',
      isActive: project.status === 'ACTIVE',
      settings: (project.settings as any) || {
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

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const teamId = params.id
    const userId = session.user.id
    const updates = await request.json()

    // Handle personal workspace (no updates allowed)
    if (teamId.startsWith('personal-')) {
      return NextResponse.json({ error: 'Personal workspace cannot be modified' }, { status: 400 })
    }

    // Verify user has admin access to this team/project
    const project = await prisma.project.findFirst({
      where: {
        id: teamId,
        members: {
          some: { 
            userId,
            role: { in: ['OWNER', 'ADMIN'] }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or insufficient permissions' }, { status: 404 })
    }

    // Prepare update data
    const updateData: any = {}
    
    // Update basic project info
    if (updates.name !== undefined) {
      updateData.name = updates.name
    }
    if (updates.description !== undefined) {
      updateData.description = updates.description
    }

    // Update settings
    if (updates.settings !== undefined) {
      updateData.settings = {
        ...(project.settings as any || {}),
        ...updates.settings
      }
    }

    // Update the project
    const updatedProject = await prisma.project.update({
      where: { id: teamId },
      data: updateData,
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

    const owner = updatedProject.members.find(m => m.role === 'OWNER') || updatedProject.members[0]

    const team = {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description || `${updatedProject.name} project team`,
      slug: updatedProject.name.toLowerCase().replace(/\s+/g, '-'),
      avatar: null,
      createdAt: updatedProject.createdAt.toISOString(),
      updatedAt: updatedProject.updatedAt.toISOString(),
      ownerId: owner?.userId || userId,
      memberCount: updatedProject._count.members,
      projectCount: 1,
      plan: 'free',
      isActive: updatedProject.status === 'ACTIVE',
      settings: updatedProject.settings as any || {
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

    return NextResponse.json({ team })
  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}