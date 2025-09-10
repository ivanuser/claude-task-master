import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// GET /api/admin/teams/[id] - Get specific team details
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    })

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const team = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { joinedAt: 'asc' }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            createdAt: true
          },
          orderBy: { updatedAt: 'desc' },
          take: 10
        },
        _count: {
          select: {
            members: true,
            tasks: true
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    return NextResponse.json({ team })

  } catch (error) {
    console.error('Error fetching team:', error)
    return NextResponse.json({ error: 'Failed to fetch team' }, { status: 500 })
  }
}

// PATCH /api/admin/teams/[id] - Update team
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    })

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const updates = await request.json()
    const { name, description, slug, ownerId, visibility, status } = updates

    // Validate team exists
    const existingTeam = await prisma.project.findUnique({
      where: { id: params.id }
    })

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Check for slug conflicts if updating slug
    if (slug && slug !== existingTeam.slug) {
      const conflictTeam = await prisma.project.findFirst({
        where: { 
          slug: slug,
          id: { not: params.id }
        }
      })

      if (conflictTeam) {
        return NextResponse.json({ error: 'Team slug already exists' }, { status: 400 })
      }
    }

    // Validate owner exists if updating owner
    if (ownerId && ownerId !== existingTeam.ownerId) {
      const owner = await prisma.user.findUnique({
        where: { id: ownerId }
      })

      if (!owner) {
        return NextResponse.json({ error: 'Owner not found' }, { status: 400 })
      }
    }

    // Prepare update data
    const updateData: any = {}
    
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (slug !== undefined) updateData.slug = slug
    if (ownerId !== undefined) updateData.ownerId = ownerId
    if (visibility !== undefined) updateData.visibility = visibility
    if (status !== undefined) updateData.status = status

    // Update team
    const updatedTeam = await prisma.project.update({
      where: { id: params.id },
      data: updateData,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            members: true,
            tasks: true
          }
        }
      }
    })

    return NextResponse.json({ team: updatedTeam })

  } catch (error) {
    console.error('Error updating team:', error)
    return NextResponse.json({ error: 'Failed to update team' }, { status: 500 })
  }
}

// DELETE /api/admin/teams/[id] - Delete team
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check if user is admin
    const currentUser = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    })

    if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Check if team exists
    const teamToDelete = await prisma.project.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    })

    if (!teamToDelete) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Delete team (CASCADE will handle related records)
    await prisma.project.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ 
      message: 'Team deleted successfully',
      deletedCounts: {
        tasks: teamToDelete._count.tasks,
        members: teamToDelete._count.members
      }
    })

  } catch (error) {
    console.error('Error deleting team:', error)
    return NextResponse.json({ error: 'Failed to delete team' }, { status: 500 })
  }
}