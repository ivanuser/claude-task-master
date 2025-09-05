'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Task, Project } from '@/types'
import { TaskListView } from '@/components/tasks/TaskListView'
import { TaskKanbanView } from '@/components/tasks/TaskKanbanView'
import { TaskFilters } from '@/components/tasks/TaskFilters'
import { TaskSearch } from '@/components/tasks/TaskSearch'
import { TaskBulkActions } from '@/components/tasks/TaskBulkActions'
import { TaskCreateButton } from '@/components/tasks/TaskCreateButton'
import { TaskExport } from '@/components/tasks/TaskExport'
import { TaskStats } from '@/components/tasks/TaskStats'
import { ViewToggle } from '@/components/ui/ViewToggle'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState } from '@/components/ui/ErrorState'
import BackButton from '@/components/ui/BackButton'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { FilterOptions } from '@/app/dashboard/page'
import { useDebounce } from '@/hooks/useDebounce'
// Using console for now since sonner is not installed
const toast = {
  success: (msg: string) => console.log('✅', msg),
  error: (msg: string) => console.error('❌', msg),
  info: (msg: string) => console.info('ℹ️', msg)
}

type ViewMode = 'list' | 'kanban' | 'timeline'

export interface TaskFiltersState {
  status: string[]
  priority: string[]
  projectIds: string[]
  assigneeIds: string[]
  tags: string[]
  dateRange: {
    start: Date | null
    end: Date | null
  }
}

export interface SortConfig {
  field: keyof Task
  direction: 'asc' | 'desc'
}

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState<TaskFiltersState>({
    status: [],
    priority: [],
    projectIds: [],
    assigneeIds: [],
    tags: [],
    dateRange: { start: null, end: null }
  })
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'updatedAt',
    direction: 'desc'
  })

  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  
  const { tasks, loading, error, refetch, updateTask, createTask, deleteTasks } = useTasks()
  
  // Create default filter options for useProjects
  const defaultFilters: FilterOptions = {
    search: '',
    status: [],
    tags: [],
    ownership: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  }
  
  const { projects } = useProjects(defaultFilters)
  const { subscribe, unsubscribe } = useWebSocket()

  // Subscribe to real-time task updates
  useEffect(() => {
    const handleTaskUpdate = (data: any) => {
      if (data.type === 'task:updated' || data.type === 'task:created' || data.type === 'task:deleted') {
        refetch()
      }
    }

    subscribe('tasks', handleTaskUpdate)
    return () => unsubscribe('tasks', handleTaskUpdate)
  }, [subscribe, unsubscribe, refetch])

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    if (!tasks) return []

    let filtered = [...tasks]

    // Apply search
    if (debouncedSearchQuery) {
      const query = debouncedSearchQuery.toLowerCase()
      filtered = filtered.filter(task =>
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.details?.toLowerCase().includes(query) ||
        task.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Apply filters
    if (filters.status.length > 0) {
      filtered = filtered.filter(task => filters.status.includes(task.status))
    }
    if (filters.priority.length > 0) {
      filtered = filtered.filter(task => filters.priority.includes(task.priority))
    }
    if (filters.projectIds.length > 0) {
      filtered = filtered.filter(task => task.projectId && filters.projectIds.includes(task.projectId))
    }
    if (filters.assigneeIds.length > 0) {
      filtered = filtered.filter(task => task.assignedTo && filters.assigneeIds.includes(task.assignedTo))
    }
    if (filters.tags.length > 0) {
      filtered = filtered.filter(task =>
        task.tags?.some(tag => filters.tags.includes(tag))
      )
    }
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(task => {
        if (!task.dueDate) return false
        const dueDate = new Date(task.dueDate)
        if (filters.dateRange.start && dueDate < filters.dateRange.start) return false
        if (filters.dateRange.end && dueDate > filters.dateRange.end) return false
        return true
      })
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[sortConfig.field]
      const bValue = b[sortConfig.field]
      
      if (aValue === undefined || aValue === null) return 1
      if (bValue === undefined || bValue === null) return -1
      
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }
      
      return sortConfig.direction === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [tasks, debouncedSearchQuery, filters, sortConfig])

  // Handle bulk operations
  const handleBulkStatusChange = useCallback(async (status: Task['status']) => {
    if (selectedTasks.size === 0) {
      toast.error('No tasks selected')
      return
    }

    try {
      const updates = Array.from(selectedTasks).map(taskId =>
        updateTask(taskId, { status })
      )
      await Promise.all(updates)
      toast.success(`Updated ${selectedTasks.size} task(s) status to ${status}`)
      setSelectedTasks(new Set())
    } catch (error) {
      toast.error('Failed to update tasks')
      console.error('Bulk status update error:', error)
    }
  }, [selectedTasks, updateTask])

  const handleBulkDelete = useCallback(async () => {
    if (selectedTasks.size === 0) {
      toast.error('No tasks selected')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedTasks.size} task(s)?`)) {
      return
    }

    try {
      await deleteTasks(Array.from(selectedTasks))
      toast.success(`Deleted ${selectedTasks.size} task(s)`)
      setSelectedTasks(new Set())
    } catch (error) {
      toast.error('Failed to delete tasks')
      console.error('Bulk delete error:', error)
    }
  }, [selectedTasks, deleteTasks])

  const handleTaskSelect = useCallback((taskId: string, selected: boolean) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev)
      if (selected) {
        newSet.add(taskId)
      } else {
        newSet.delete(taskId)
      }
      return newSet
    })
  }, [])

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedTasks(new Set(filteredTasks.map(t => t.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }, [filteredTasks])

  const handleSort = useCallback((field: keyof Task) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleCreateTask = useCallback(async (taskData: Partial<Task>) => {
    try {
      await createTask(taskData)
      toast.success('Task created successfully')
    } catch (error) {
      toast.error('Failed to create task')
      console.error('Task creation error:', error)
    }
  }, [createTask])

  const handleExport = useCallback((format: 'csv' | 'json' | 'pdf') => {
    const dataToExport = selectedTasks.size > 0 
      ? filteredTasks.filter(t => selectedTasks.has(t.id))
      : filteredTasks

    if (dataToExport.length === 0) {
      toast.error('No tasks to export')
      return
    }

    // Implementation would go here for actual export
    toast.info(`Exporting ${dataToExport.length} task(s) as ${format.toUpperCase()}`)
  }, [filteredTasks, selectedTasks])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <ErrorState 
        title="Failed to load tasks"
        message="There was an error loading your tasks. Please try again."
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <BackButton href="/dashboard" label="Back to Dashboard" />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tasks</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage tasks across all your projects
          </p>
        </div>
        <div className="flex items-center gap-3">
          <TaskExport onExport={handleExport} />
          <TaskCreateButton onCreate={handleCreateTask} projects={projects} />
        </div>
      </div>

      {/* Stats */}
      <TaskStats tasks={tasks || []} />

      {/* Controls Bar */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1">
            <TaskSearch value={searchQuery} onChange={setSearchQuery} />
          </div>
          <div className="flex items-center gap-3">
            <TaskFilters 
              filters={filters} 
              onChange={setFilters}
              projects={projects}
            />
            {selectedTasks.size > 0 && (
              <TaskBulkActions
                selectedCount={selectedTasks.size}
                onStatusChange={handleBulkStatusChange}
                onDelete={handleBulkDelete}
              />
            )}
            <ViewToggle
              value={viewMode}
              onChange={setViewMode}
              options={[
                { value: 'list', icon: 'list', label: 'List' },
                { value: 'kanban', icon: 'kanban', label: 'Kanban' },
                { value: 'timeline', icon: 'timeline', label: 'Timeline' }
              ]}
            />
          </div>
        </div>
      </div>

      {/* Task Views */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-lg">
        {filteredTasks.length === 0 ? (
          <EmptyState
            title="No tasks found"
            message={searchQuery || Object.values(filters).some(f => f.length > 0) 
              ? "Try adjusting your filters or search query"
              : "Create your first task to get started"}
            action={!searchQuery && Object.values(filters).every(f => f.length === 0) && {
              label: "Create task",
              onClick: () => {/* open create modal */}
            }}
          />
        ) : (
          <>
            {viewMode === 'list' && (
              <TaskListView
                tasks={filteredTasks}
                projects={projects}
                selectedTasks={selectedTasks}
                sortConfig={sortConfig}
                onTaskSelect={handleTaskSelect}
                onSelectAll={handleSelectAll}
                onSort={handleSort}
                onTaskUpdate={updateTask}
              />
            )}
            {viewMode === 'kanban' && (
              <TaskKanbanView
                tasks={filteredTasks}
                projects={projects}
                onTaskUpdate={updateTask}
                onTaskMove={updateTask}
              />
            )}
            {viewMode === 'timeline' && (
              <div className="p-8 text-center text-gray-500">
                Timeline view coming soon...
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}