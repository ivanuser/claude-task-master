import React from 'react'
import { Task, Project } from '@/types'
import { SortConfig, TaskFiltersState } from '@/app/tasks/page'

interface TaskListViewProps {
  tasks: Task[]
  projects?: Project[] | null
  selectedTasks: Set<string>
  sortConfig: SortConfig
  onTaskSelect: (taskId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
  onSort: (field: keyof Task) => void
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
}

export function TaskListView({
  tasks,
  projects,
  selectedTasks,
  sortConfig,
  onTaskSelect,
  onSelectAll,
  onSort,
  onTaskUpdate,
}: TaskListViewProps) {
  const getStatusBadge = (status: Task['status']) => {
    const colors = {
      'pending': 'bg-gray-100 text-gray-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'review': 'bg-yellow-100 text-yellow-800',
      'done': 'bg-green-100 text-green-800',
      'blocked': 'bg-red-100 text-red-800',
      'cancelled': 'bg-gray-100 text-gray-500',
      'deferred': 'bg-purple-100 text-purple-800',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    )
  }

  const getPriorityBadge = (priority: Task['priority']) => {
    const colors = {
      'low': 'bg-gray-100 text-gray-600',
      'medium': 'bg-blue-100 text-blue-600',
      'high': 'bg-orange-100 text-orange-600',
      'critical': 'bg-red-100 text-red-600',
    }
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[priority]}`}>
        {priority}
      </span>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  const getSortIcon = (field: keyof Task) => {
    if (sortConfig.field !== field) {
      return <span className="text-gray-400">↕</span>
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-gray-600">↑</span> : 
      <span className="text-gray-600">↓</span>
  }

  const allSelected = tasks.length > 0 && tasks.every(task => selectedTasks.has(task.id))
  const someSelected = tasks.some(task => selectedTasks.has(task.id))

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-1">
                Task
                {getSortIcon('title')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('status')}
            >
              <div className="flex items-center gap-1">
                Status
                {getSortIcon('status')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('priority')}
            >
              <div className="flex items-center gap-1">
                Priority
                {getSortIcon('priority')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('projectName')}
            >
              <div className="flex items-center gap-1">
                Project
                {getSortIcon('projectName')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('dueDate')}
            >
              <div className="flex items-center gap-1">
                Due Date
                {getSortIcon('dueDate')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => onSort('updatedAt')}
            >
              <div className="flex items-center gap-1">
                Last Updated
                {getSortIcon('updatedAt')}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-gray-50">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.id)}
                  onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-gray-900 max-w-xs truncate">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {task.description}
                    </div>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 3 && (
                        <span className="text-xs text-gray-400">+{task.tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                {getStatusBadge(task.status)}
              </td>
              <td className="px-6 py-4">
                {getPriorityBadge(task.priority)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {task.projectName || 'Unknown Project'}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900">
                {formatDate(task.dueDate)}
              </td>
              <td className="px-6 py-4 text-sm text-gray-500">
                {formatDate(task.updatedAt)}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => onTaskUpdate(task.id, { status: e.target.value as Task['status'] })}
                    className="text-xs border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="in-progress">In Progress</option>
                    <option value="review">Review</option>
                    <option value="done">Done</option>
                    <option value="blocked">Blocked</option>
                    <option value="deferred">Deferred</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button 
                    className="text-blue-600 hover:text-blue-800 text-sm"
                    onClick={() => {/* open task details modal */}}
                  >
                    View
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}