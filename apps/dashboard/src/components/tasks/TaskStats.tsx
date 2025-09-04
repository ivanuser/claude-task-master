import React from 'react'
import { Task } from '@/types'

interface TaskStatsProps {
  tasks: Task[]
}

export function TaskStats({ tasks }: TaskStatsProps) {
  const stats = {
    total: tasks.length,
    done: tasks.filter(t => t.status === 'done').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => t.status === 'pending').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    critical: tasks.filter(t => t.priority === 'critical').length,
    high: tasks.filter(t => t.priority === 'high').length,
  }

  const completionRate = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
        <div className="text-sm text-gray-500">Total Tasks</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-green-600">{stats.done}</div>
        <div className="text-sm text-gray-500">Completed</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
        <div className="text-sm text-gray-500">In Progress</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-gray-600">{stats.pending}</div>
        <div className="text-sm text-gray-500">Pending</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
        <div className="text-sm text-gray-500">Blocked</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
        <div className="text-sm text-gray-500">Critical</div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
        <div className="text-sm text-gray-500">Completion</div>
      </div>
    </div>
  )
}