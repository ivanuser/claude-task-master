import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

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

    // Get current date for filtering recent signups
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    // Fetch all stats in parallel
    const [
      totalUsers,
      activeUsers,
      totalTeams,
      totalProjects,
      totalTasks,
      recentSignups
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users (logged in within last 30 days or have isActive = true)
      prisma.user.count({
        where: {
          OR: [
            { isActive: true },
            { lastLoginAt: { gte: oneMonthAgo } }
          ]
        }
      }),
      
      // Total teams (using projects as teams)
      prisma.project.count(),
      
      // Total projects
      prisma.project.count(),
      
      // Total tasks
      prisma.task.count(),
      
      // Recent signups (last 30 days)
      prisma.user.count({
        where: {
          createdAt: { gte: oneMonthAgo }
        }
      })
    ])

    const stats = {
      totalUsers,
      activeUsers,
      totalTeams,
      totalProjects,
      totalTasks,
      recentSignups
    }

    return NextResponse.json({ stats })

  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}