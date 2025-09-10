import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// GET /api/admin/teams - List all teams (admin only)
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } }
      ]
    }

    // Get teams (using projects as teams)
    const [teams, total] = await Promise.all([
      prisma.project.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          status: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              members: true,
              tasks: true
            }
          },
          owner: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          members: {
            select: {
              id: true,
              role: true,
              joinedAt: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            take: 5 // Show first 5 members
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.project.count({ where })
    ])

    return NextResponse.json({
      teams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching teams:', error)
    return NextResponse.json({ error: 'Failed to fetch teams' }, { status: 500 })
  }
}

// POST /api/admin/teams - Create new team (admin only)
export async function POST(request: NextRequest) {
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

    const teamData = await request.json()
    const { name, description, slug, ownerId, visibility = 'PRIVATE', members = [] } = teamData

    // Validate required fields
    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 })
    }

    // Generate slug if not provided
    let teamSlug = slug
    if (!teamSlug) {
      teamSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').trim('-')
    }

    // Check if slug already exists
    const existingProject = await prisma.project.findUnique({
      where: { slug: teamSlug }
    })

    if (existingProject) {
      return NextResponse.json({ error: 'Team slug already exists' }, { status: 400 })
    }

    // Validate owner exists
    const owner = await prisma.user.findUnique({
      where: { id: ownerId || currentUser.id }
    })

    if (!owner) {
      return NextResponse.json({ error: 'Owner not found' }, { status: 400 })
    }

    // Create team (project)
    const newTeam = await prisma.project.create({
      data: {
        name,
        description: description || null,
        slug: teamSlug,
        ownerId: owner.id,
        visibility: visibility || 'PRIVATE',
        status: 'ACTIVE',
        // Add owner as admin member
        members: {
          create: {
            userId: owner.id,
            role: 'ADMIN',
            joinedAt: new Date()
          }
        }
      },
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

    // Add additional members if provided
    if (members.length > 0) {
      const memberData = members.map((memberId: string) => ({
        projectId: newTeam.id,
        userId: memberId,
        role: 'MEMBER',
        joinedAt: new Date()
      }))

      await prisma.projectMember.createMany({
        data: memberData,
        skipDuplicates: true
      })
    }

    return NextResponse.json({ team: newTeam }, { status: 201 })

  } catch (error) {
    console.error('Error creating team:', error)
    return NextResponse.json({ error: 'Failed to create team' }, { status: 500 })
  }
}