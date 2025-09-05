import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const { searchParams } = new URL(request.url)
    
    // Get filter parameters
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}
    
    if (status) {
      where.status = status.toUpperCase()
    }
    
    if (priority) {
      where.priority = priority.toUpperCase()
    }
    
    if (projectId) {
      where.projectId = projectId
    }

    // If user is authenticated, only show tasks from their projects
    if (session?.user) {
      where.project = {
        members: {
          some: {
            userId: (session.user as any).id
          }
        }
      }
    }

    // Get tasks with related data
    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              tag: true
            }
          },
          dependencies: {
            include: {
              id: true,
              title: true,
              status: true
            }
          },
          dependentTasks: {
            include: {
              id: true,
              title: true,
              status: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.task.count({ where })
    ])

    // Transform the data to match frontend expectations
    const transformedTasks = tasks.map(task => ({
      id: task.id,
      taskId: task.taskId,
      title: task.title,
      description: task.description,
      status: task.status.toLowerCase(),
      priority: task.priority.toLowerCase(),
      complexity: task.complexity,
      details: task.details,
      testStrategy: task.testStrategy,
      projectId: task.projectId,
      projectName: task.project.name,
      projectTag: task.project.tag,
      dependencies: task.dependencies.map(d => d.taskId),
      dependentTasks: task.dependentTasks.map(d => d.taskId),
      data: task.data,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      // Extracting additional fields from the data JSON if needed
      tags: (task.data as any)?.tags || [],
      assignedTo: (task.data as any)?.assignedTo || null,
      dueDate: (task.data as any)?.dueDate || null,
    }))

    return NextResponse.json({ 
      tasks: transformedTasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' }, 
        { status: 401 }
      )
    }

    const taskData = await request.json()
    
    // Get the project to ensure user has access
    const project = await prisma.project.findFirst({
      where: {
        id: taskData.projectId,
        members: {
          some: {
            userId: (session.user as any).id
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' }, 
        { status: 404 }
      )
    }

    // Generate next task ID for this project
    const lastTask = await prisma.task.findFirst({
      where: { projectId: taskData.projectId },
      orderBy: { taskId: 'desc' }
    })

    const nextTaskNumber = lastTask ? parseInt(lastTask.taskId.split('.')[0]) + 1 : 1
    const newTaskId = nextTaskNumber.toString()

    // Create the task
    const newTask = await prisma.task.create({
      data: {
        taskId: newTaskId,
        title: taskData.title,
        description: taskData.description || '',
        status: taskData.status?.toUpperCase() || 'PENDING',
        priority: taskData.priority?.toUpperCase() || 'MEDIUM',
        complexity: taskData.complexity || null,
        details: taskData.details || null,
        testStrategy: taskData.testStrategy || null,
        projectId: taskData.projectId,
        data: {
          tags: taskData.tags || [],
          assignedTo: taskData.assignedTo || null,
          dueDate: taskData.dueDate || null,
          ...taskData.additionalData
        }
      },
      include: {
        project: {
          select: {
            name: true,
            tag: true
          }
        }
      }
    })

    // Handle dependencies if provided
    if (taskData.dependencies && taskData.dependencies.length > 0) {
      // Connect dependencies
      for (const depTaskId of taskData.dependencies) {
        const dependencyTask = await prisma.task.findFirst({
          where: { 
            taskId: depTaskId,
            projectId: taskData.projectId 
          }
        })

        if (dependencyTask) {
          await prisma.task.update({
            where: { id: newTask.id },
            data: {
              dependencies: {
                connect: { id: dependencyTask.id }
              }
            }
          })
        }
      }
    }

    return NextResponse.json({ 
      success: true,
      task: {
        id: newTask.id,
        taskId: newTask.taskId,
        title: newTask.title,
        description: newTask.description,
        status: newTask.status.toLowerCase(),
        priority: newTask.priority.toLowerCase(),
        projectId: newTask.projectId,
        projectName: newTask.project.name,
        createdAt: newTask.createdAt.toISOString(),
        updatedAt: newTask.updatedAt.toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' }, 
      { status: 500 }
    )
  }
}