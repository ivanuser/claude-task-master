'use client'

import { useState, useEffect } from 'react'
import { Task } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { TASK_STATUS_COLORS, TASK_PRIORITY_COLORS } from '@/lib/constants'

export function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - will be replaced with API call
    const mockTasks: Task[] = [
      {
        id: '11',
        title: 'Setup Web Dashboard Project Architecture',
        description: 'Initialize and configure the Next.js application',
        status: 'in-progress',
        priority: 'high',
        dependencies: [],
        projectId: 'task-master',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '12',
        title: 'Create Core API Integration',
        description: 'Build API client and service layer',
        status: 'pending',
        priority: 'high',
        dependencies: [],
        projectId: 'task-master',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: '13',
        title: 'Implement Authentication',
        description: 'Setup NextAuth with GitHub/GitLab OAuth',
        status: 'pending',
        priority: 'critical',
        dependencies: [],
        projectId: 'task-master',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    setTimeout(() => {
      setTasks(mockTasks)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className='space-y-3'>
        {[...Array(3)].map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-16 bg-gray-100 rounded-md'></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-3'>
      {tasks.map(task => (
        <div
          key={task.id}
          className='flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow'
        >
          <div className='flex-1'>
            <div className='flex items-center space-x-3'>
              <h4 className='text-sm font-medium text-gray-900'>
                {task.title}
              </h4>
              <Badge
                variant='default'
                className={
                  TASK_STATUS_COLORS[
                    task.status as keyof typeof TASK_STATUS_COLORS
                  ]
                }
              >
                {task.status}
              </Badge>
              {task.priority && (
                <Badge
                  variant='outline'
                  className={
                    TASK_PRIORITY_COLORS[
                      task.priority as keyof typeof TASK_PRIORITY_COLORS
                    ]
                  }
                >
                  {task.priority}
                </Badge>
              )}
            </div>
            <p className='mt-1 text-sm text-gray-500'>{task.description}</p>
          </div>
          <button className='text-sm text-taskmaster-600 hover:text-taskmaster-700 font-medium'>
            View
          </button>
        </div>
      ))}
    </div>
  )
}
