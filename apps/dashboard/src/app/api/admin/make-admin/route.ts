import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database'

// This is a temporary endpoint to make Ivan Honer an admin
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    // Security check - only allow specific email
    if (email !== 'ihoner@example.com' && email !== 'ivan@example.com' && email !== 'ivan.honer@gmail.com' && email !== 'honerivan@gmail.com') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Update user to admin
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        role: 'ADMIN',
        name: 'Ivan Honer' // Update name if needed
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true
      }
    })

    return NextResponse.json({ 
      message: 'User promoted to admin successfully',
      user: updatedUser 
    })

  } catch (error) {
    console.error('Error making user admin:', error)
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 })
  }
}

// GET - List users to help identify the correct email
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}