import { NextRequest, NextResponse } from 'next/server'
import { Task } from '@/types'

// Mock data - in a real app this would come from a database
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Implement user authentication',
    description: 'Set up JWT-based authentication system with refresh tokens',
    status: 'in-progress',
    priority: 'high',
    dependencies: [],
    projectId: '1',
    projectName: 'Task Master Dashboard',
    assignedTo: '1',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['backend', 'security'],
    complexity: 8,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Design database schema',
    description: 'Create PostgreSQL schema with Prisma ORM',
    status: 'done',
    priority: 'critical',
    dependencies: [],
    projectId: '1',
    projectName: 'Task Master Dashboard',
    assignedTo: '1',
    tags: ['database', 'backend'],
    complexity: 6,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    title: 'Create REST API endpoints',
    description: 'Build RESTful API with Next.js API routes',
    status: 'pending',
    priority: 'high',
    dependencies: ['1', '2'],
    projectId: '1',
    projectName: 'Task Master Dashboard',
    dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['api', 'backend'],
    complexity: 7,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '4',
    title: 'Implement real-time notifications',
    description: 'Add WebSocket support for live updates',
    status: 'blocked',
    priority: 'medium',
    dependencies: ['3'],
    projectId: '2',
    projectName: 'Mobile App',
    assignedTo: '2',
    tags: ['websocket', 'realtime'],
    complexity: 5,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '5',
    title: 'Write unit tests',
    description: 'Add comprehensive test coverage with Jest',
    status: 'pending',
    priority: 'medium',
    dependencies: ['3'],
    projectId: '1',
    projectName: 'Task Master Dashboard',
    tags: ['testing', 'quality'],
    complexity: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '6',
    title: 'Optimize performance',
    description: 'Improve page load times and reduce bundle size',
    status: 'deferred',
    priority: 'low',
    dependencies: [],
    projectId: '1',
    projectName: 'Task Master Dashboard',
    tags: ['performance', 'optimization'],
    complexity: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const projectId = searchParams.get('projectId')
    
    let filteredTasks = [...mockTasks]
    
    if (status) {
      filteredTasks = filteredTasks.filter(task => task.status === status)
    }
    
    if (priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === priority)
    }
    
    if (projectId) {
      filteredTasks = filteredTasks.filter(task => task.projectId === projectId)
    }
    
    return NextResponse.json({ tasks: filteredTasks })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const taskData = await request.json()
    
    const newTask: Task = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskData.title,
      description: taskData.description || '',
      status: taskData.status || 'pending',
      priority: taskData.priority || 'medium',
      dependencies: taskData.dependencies || [],
      projectId: taskData.projectId,
      projectName: taskData.projectName,
      assignedTo: taskData.assignedTo,
      dueDate: taskData.dueDate,
      tags: taskData.tags || [],
      complexity: taskData.complexity,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    
    // In a real app, save to database
    mockTasks.push(newTask)
    
    return NextResponse.json({ task: newTask }, { status: 201 })
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 })
  }
}