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
      'pending': 'bg-muted text-muted-foreground',
      'in-progress': 'bg-primary/10 text-primary',
      'review': 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
      'done': 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
      'blocked': 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
      'cancelled': 'bg-muted text-muted-foreground',
      'deferred': 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status]}`}>
        {status}
      </span>
    )
  }

  const getPriorityBadge = (priority: Task['priority']) => {
    const colors = {
      'low': 'bg-muted text-muted-foreground',
      'medium': 'bg-primary/10 text-primary',
      'high': 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
      'critical': 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400',
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
      return <span className="text-muted-foreground">↕</span>
    }
    return sortConfig.direction === 'asc' ? 
      <span className="text-foreground">↑</span> : 
      <span className="text-foreground">↓</span>
  }

  const allSelected = tasks.length > 0 && tasks.every(task => selectedTasks.has(task.id))
  const someSelected = tasks.some(task => selectedTasks.has(task.id))

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-6 py-3 text-left">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected
                }}
                onChange={(e) => onSelectAll(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
              onClick={() => onSort('title')}
            >
              <div className="flex items-center gap-1">
                Task
                {getSortIcon('title')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
              onClick={() => onSort('status')}
            >
              <div className="flex items-center gap-1">
                Status
                {getSortIcon('status')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
              onClick={() => onSort('priority')}
            >
              <div className="flex items-center gap-1">
                Priority
                {getSortIcon('priority')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
              onClick={() => onSort('projectName')}
            >
              <div className="flex items-center gap-1">
                Project
                {getSortIcon('projectName')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
              onClick={() => onSort('dueDate')}
            >
              <div className="flex items-center gap-1">
                Due Date
                {getSortIcon('dueDate')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70"
              onClick={() => onSort('updatedAt')}
            >
              <div className="flex items-center gap-1">
                Last Updated
                {getSortIcon('updatedAt')}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-card divide-y divide-border">
          {tasks.map((task) => (
            <tr key={task.id} className="hover:bg-muted/30">
              <td className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={selectedTasks.has(task.id)}
                  onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <div className="text-sm font-medium text-foreground max-w-xs truncate">
                    {task.title}
                  </div>
                  {task.description && (
                    <div className="text-sm text-muted-foreground max-w-xs truncate">
                      {task.description}
                    </div>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {task.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-muted text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                      {task.tags.length > 3 && (
                        <span className="text-xs text-muted-foreground/70">+{task.tags.length - 3}</span>
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
              <td className="px-6 py-4 text-sm text-foreground">
                {task.projectName || 'Unknown Project'}
              </td>
              <td className="px-6 py-4 text-sm text-foreground">
                {formatDate(task.dueDate)}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {formatDate(task.updatedAt)}
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => onTaskUpdate(task.id, { status: e.target.value as Task['status'] })}
                    className="text-xs border-border rounded focus:border-primary focus:ring-primary bg-background text-foreground"
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
                    className="text-primary hover:text-primary/80 text-sm"
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