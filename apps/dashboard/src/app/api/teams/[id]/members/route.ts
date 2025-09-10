import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { TeamMember } from '@/types/team'

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

      // Return just the current user as a member
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          createdAt: true,
          updatedAt: true
        }
      })

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const personalMember: TeamMember = {
        id: `personal-member-${userId}`,
        userId: userId,
        teamId: teamId,
        role: 'owner',
        permissions: [],
        joinedAt: user.createdAt.toISOString(),
        status: 'active',
        lastActiveAt: new Date().toISOString(),
        user: {
          id: user.id,
          email: user.email!,
          name: user.name!,
          avatar: user.image,
          username: user.email!.split('@')[0],
          bio: 'Personal workspace owner',
          location: null,
          timezone: 'UTC',
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          emailVerified: true,
          twoFactorEnabled: false,
          preferences: {
            theme: 'system',
            language: 'en',
            emailNotifications: true,
            pushNotifications: true,
            weeklyDigest: true,
          },
        },
      }

      return NextResponse.json({ members: [personalMember] })
    }

    // Get project members (for real team/project)
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
                image: true,
                createdAt: true,
                updatedAt: true
              }
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Convert project members to team members format
    const teamMembers: TeamMember[] = project.members.map(member => ({
      id: member.id,
      userId: member.userId,
      teamId: teamId,
      role: member.role.toLowerCase() as 'owner' | 'admin' | 'member' | 'viewer',
      permissions: member.permissions as string[],
      joinedAt: member.createdAt.toISOString(),
      status: 'active',
      lastActiveAt: member.updatedAt.toISOString(),
      user: {
        id: member.user.id,
        email: member.user.email!,
        name: member.user.name!,
        avatar: member.user.image,
        username: member.user.email!.split('@')[0],
        bio: `${member.role} of ${project.name}`,
        location: null,
        timezone: 'UTC',
        createdAt: member.user.createdAt.toISOString(),
        updatedAt: member.user.updatedAt.toISOString(),
        emailVerified: true,
        twoFactorEnabled: false,
        preferences: {
          theme: 'system',
          language: 'en',
          emailNotifications: true,
          pushNotifications: true,
          weeklyDigest: true,
        },
      },
    }))
    
    return NextResponse.json({ members: teamMembers })
  } catch (error) {
    console.error('Error fetching team members:', error)
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
  }
}