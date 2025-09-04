import { useState, useEffect, useCallback } from 'react'
import { Task } from '@/types'

interface UseTasksReturn {
  tasks: Task[] | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  createTask: (task: Partial<Task>) => Promise<void>
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  deleteTasks: (taskIds: string[]) => Promise<void>
}

export function useTasks(): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/tasks')
      if (!response.ok) {
        throw new Error('Failed to fetch tasks')
      }
      const data = await response.json()
      setTasks(data.tasks || data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      // Use mock data if API fails
      setTasks(getMockTasks())
    } finally {
      setLoading(false)
    }
  }, [])

  const createTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      })
      if (!response.ok) throw new Error('Failed to create task')
      await fetchTasks()
    } catch (error) {
      // For now, add task locally
      const newTask: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: taskData.title || 'New Task',
        description: taskData.description || '',
        status: taskData.status || 'pending',
        priority: taskData.priority || 'medium',
        dependencies: taskData.dependencies || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...taskData,
      }
      setTasks(prev => prev ? [...prev, newTask] : [newTask])
    }
  }, [fetchTasks])

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!response.ok) throw new Error('Failed to update task')
      await fetchTasks()
    } catch (error) {
      // Update locally for now
      setTasks(prev => prev ? prev.map(task => 
        task.id === taskId ? { ...task, ...updates, updatedAt: new Date().toISOString() } : task
      ) : prev)
    }
  }, [fetchTasks])

  const deleteTask = useCallback(async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete task')
      await fetchTasks()
    } catch (error) {
      // Delete locally for now
      setTasks(prev => prev ? prev.filter(task => task.id !== taskId) : prev)
    }
  }, [fetchTasks])

  const deleteTasks = useCallback(async (taskIds: string[]) => {
    try {
      const response = await fetch('/api/tasks/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskIds }),
      })
      if (!response.ok) throw new Error('Failed to delete tasks')
      await fetchTasks()
    } catch (error) {
      // Delete locally for now
      setTasks(prev => prev ? prev.filter(task => !taskIds.includes(task.id)) : prev)
    }
  }, [fetchTasks])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    deleteTasks,
  }
}

function getMockTasks(): Task[] {
  return [
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
}