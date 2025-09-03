'use client'

import { useState, useEffect } from 'react'
import { Project } from '@/types'
import { Badge } from '@/components/ui/Badge'
import { FolderIcon, GitBranchIcon, ClockIcon } from 'lucide-react'

export function ProjectCard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Mock data for now - will be replaced with API call
    const mockProjects: Project[] = [
      {
        id: 'task-master',
        name: 'Task Master',
        description: 'Multi-project task management system',
        gitUrl: 'https://github.com/user/task-master',
        branch: 'main',
        status: 'active',
        taskCount: 20,
        completedTaskCount: 3,
        lastSync: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'web-dashboard',
        name: 'Web Dashboard',
        description: 'Task Master centralized dashboard',
        gitUrl: 'https://github.com/user/task-master',
        branch: 'web-dashboard',
        status: 'active',
        taskCount: 10,
        completedTaskCount: 0,
        lastSync: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]

    setTimeout(() => {
      setProjects(mockProjects)
      setLoading(false)
    }, 500)
  }, [])

  if (loading) {
    return (
      <div className='space-y-4'>
        {[...Array(2)].map((_, i) => (
          <div key={i} className='animate-pulse'>
            <div className='h-24 bg-gray-100 rounded-md'></div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className='space-y-4'>
      {projects.map(project => (
        <div
          key={project.id}
          className='p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow'
        >
          <div className='flex items-start justify-between'>
            <div className='flex items-start space-x-3'>
              <FolderIcon className='w-5 h-5 text-gray-400 mt-0.5' />
              <div>
                <h4 className='text-sm font-medium text-gray-900'>
                  {project.name}
                </h4>
                <p className='mt-1 text-xs text-gray-500'>
                  {project.description}
                </p>
              </div>
            </div>
            <Badge
              variant={project.status === 'active' ? 'success' : 'secondary'}
            >
              {project.status}
            </Badge>
          </div>

          <div className='mt-4 flex items-center space-x-4 text-xs text-gray-500'>
            <div className='flex items-center space-x-1'>
              <GitBranchIcon className='w-3 h-3' />
              <span>{project.branch}</span>
            </div>
            <div className='flex items-center space-x-1'>
              <ClockIcon className='w-3 h-3' />
              <span>Synced 1m ago</span>
            </div>
          </div>

          <div className='mt-3 pt-3 border-t border-gray-100'>
            <div className='flex items-center justify-between'>
              <span className='text-xs text-gray-500'>
                {project.completedTaskCount} of {project.taskCount} tasks
                complete
              </span>
              <div className='w-24 bg-gray-200 rounded-full h-1.5'>
                <div
                  className='bg-taskmaster-600 h-1.5 rounded-full'
                  style={{
                    width: `${(project.completedTaskCount / project.taskCount) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
