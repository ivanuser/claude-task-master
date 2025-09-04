import React, { useState } from 'react'
import { Task, Project } from '@/types'
import { TaskFiltersState } from '@/app/tasks/page'

interface TaskFiltersProps {
  filters: TaskFiltersState
  onChange: (filters: TaskFiltersState) => void
  projects?: Project[] | null
}

export function TaskFilters({ filters, onChange, projects }: TaskFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'review', label: 'Review' },
    { value: 'done', label: 'Done' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'deferred', label: 'Deferred' },
    { value: 'cancelled', label: 'Cancelled' },
  ]

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ]

  const handleMultiSelectChange = (
    field: keyof Pick<TaskFiltersState, 'status' | 'priority' | 'projectIds' | 'assigneeIds' | 'tags'>,
    value: string,
    checked: boolean
  ) => {
    const currentValues = filters[field] as string[]
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter(v => v !== value)
    
    onChange({
      ...filters,
      [field]: newValues,
    })
  }

  const clearAllFilters = () => {
    onChange({
      status: [],
      priority: [],
      projectIds: [],
      assigneeIds: [],
      tags: [],
      dateRange: { start: null, end: null },
    })
  }

  const getActiveFiltersCount = () => {
    return (
      filters.status.length +
      filters.priority.length +
      filters.projectIds.length +
      filters.assigneeIds.length +
      filters.tags.length +
      (filters.dateRange.start || filters.dateRange.end ? 1 : 0)
    )
  }

  const activeCount = getActiveFiltersCount()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
          activeCount > 0
            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
        </svg>
        Filters
        {activeCount > 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Filter Tasks</h3>
              <div className="flex items-center gap-2">
                {activeCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {statusOptions.map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.status.includes(option.value)}
                        onChange={(e) => handleMultiSelectChange('status', option.value, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Priority Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <div className="space-y-2">
                  {priorityOptions.map((option) => (
                    <label key={option.value} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={filters.priority.includes(option.value)}
                        onChange={(e) => handleMultiSelectChange('priority', option.value, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Project Filter */}
              {projects && projects.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Project</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {projects.map((project) => (
                      <label key={project.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.projectIds.includes(project.id)}
                          onChange={(e) => handleMultiSelectChange('projectIds', project.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 truncate">{project.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Date Range Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={filters.dateRange.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                      onChange={(e) => onChange({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          start: e.target.value ? new Date(e.target.value) : null
                        }
                      })}
                      className="w-full text-sm border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={filters.dateRange.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                      onChange={(e) => onChange({
                        ...filters,
                        dateRange: {
                          ...filters.dateRange,
                          end: e.target.value ? new Date(e.target.value) : null
                        }
                      })}
                      className="w-full text-sm border-gray-300 rounded focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}