import React from 'react'
import { NotificationType } from '@/types/team'

interface NotificationFilters {
  type?: NotificationType
  unreadOnly: boolean
  dateRange?: 'today' | 'week' | 'month' | 'all'
  search: string
}

interface NotificationFiltersProps {
  filters: NotificationFilters
  onFilterChange: (filters: Partial<NotificationFilters>) => void
}

const notificationTypeLabels: Record<NotificationType, string> = {
  task_assigned: 'Task Assigned',
  task_mentioned: 'Task Mentioned',
  task_due_soon: 'Task Due Soon',
  task_overdue: 'Task Overdue',
  comment_reply: 'Comment Reply',
  team_invitation: 'Team Invitation',
  role_changed: 'Role Changed',
  project_shared: 'Project Shared',
  report_ready: 'Report Ready',
  system_announcement: 'System Announcement',
}

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
] as const

export function NotificationFilters({ filters, onFilterChange }: NotificationFiltersProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Notification Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <select
            value={filters.type || ''}
            onChange={(e) => onFilterChange({ 
              type: e.target.value ? e.target.value as NotificationType : undefined 
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Types</option>
            {Object.entries(notificationTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date Range
          </label>
          <select
            value={filters.dateRange || 'all'}
            onChange={(e) => onFilterChange({ 
              dateRange: e.target.value as 'today' | 'week' | 'month' | 'all'
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {dateRangeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Read Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.unreadOnly ? 'unread' : 'all'}
            onChange={(e) => onFilterChange({ 
              unreadOnly: e.target.value === 'unread'
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
          </select>
        </div>

        {/* Clear Filters */}
        <div className="flex items-end">
          <button
            onClick={() => onFilterChange({ 
              type: undefined, 
              unreadOnly: false, 
              dateRange: 'all',
              search: ''
            })}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Active Filters Display */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.type && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {notificationTypeLabels[filters.type]}
            <button
              onClick={() => onFilterChange({ type: undefined })}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-blue-400 hover:text-blue-600"
            >
              ×
            </button>
          </span>
        )}
        
        {filters.unreadOnly && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Unread Only
            <button
              onClick={() => onFilterChange({ unreadOnly: false })}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-green-400 hover:text-green-600"
            >
              ×
            </button>
          </span>
        )}
        
        {filters.dateRange && filters.dateRange !== 'all' && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {dateRangeOptions.find(o => o.value === filters.dateRange)?.label}
            <button
              onClick={() => onFilterChange({ dateRange: 'all' })}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-purple-400 hover:text-purple-600"
            >
              ×
            </button>
          </span>
        )}

        {filters.search && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Search: "{filters.search}"
            <button
              onClick={() => onFilterChange({ search: '' })}
              className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-orange-400 hover:text-orange-600"
            >
              ×
            </button>
          </span>
        )}
      </div>
    </div>
  )
}