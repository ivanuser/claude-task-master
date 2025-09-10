import React, { useMemo } from 'react'
import { Task, Project } from '@/types'
import { format, parseISO, isValid, startOfDay, endOfDay, differenceInDays } from 'date-fns'
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon,
  FlagIcon,
  LinkIcon
} from '@heroicons/react/24/outline'

interface TaskTimelineViewProps {
  tasks: Task[]
  projects?: Project[] | null
  onTaskUpdate: (taskId: string, updates: Partial<Task>) => void
}

interface TimelineItem {
  task: Task
  date: Date
  type: 'created' | 'due' | 'updated'
  position: 'past' | 'today' | 'future'
}

export function TaskTimelineView({
  tasks,
  projects,
  onTaskUpdate,
}: TaskTimelineViewProps) {
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = []
    const today = new Date()
    const todayStart = startOfDay(today)
    
    tasks.forEach(task => {
      // Add created date
      if (task.createdAt) {
        const createdDate = parseISO(task.createdAt)
        if (isValid(createdDate)) {
          const position = createdDate < todayStart ? 'past' : 
                         createdDate <= endOfDay(today) ? 'today' : 'future'
          items.push({
            task,
            date: createdDate,
            type: 'created',
            position: position as 'past' | 'today' | 'future'
          })
        }
      }

      // Add due date if exists
      if (task.dueDate) {
        const dueDate = parseISO(task.dueDate)
        if (isValid(dueDate)) {
          const position = dueDate < todayStart ? 'past' : 
                         dueDate <= endOfDay(today) ? 'today' : 'future'
          items.push({
            task,
            date: dueDate,
            type: 'due',
            position: position as 'past' | 'today' | 'future'
          })
        }
      }

      // Add updated date for recent updates (within last 7 days)
      if (task.updatedAt) {
        const updatedDate = parseISO(task.updatedAt)
        if (isValid(updatedDate) && differenceInDays(today, updatedDate) <= 7) {
          const position = updatedDate < todayStart ? 'past' : 
                         updatedDate <= endOfDay(today) ? 'today' : 'future'
          items.push({
            task,
            date: updatedDate,
            type: 'updated',
            position: position as 'past' | 'today' | 'future'
          })
        }
      }
    })

    // Sort by date (most recent first)
    return items.sort((a, b) => b.date.getTime() - a.date.getTime())
  }, [tasks])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400'
      case 'blocked':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400'
      case 'review':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-400'
      default:
        return 'bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-400'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 dark:text-red-400'
      case 'high':
        return 'text-orange-600 dark:text-orange-400'
      case 'medium':
        return 'text-blue-600 dark:text-blue-400'
      case 'low':
        return 'text-gray-600 dark:text-gray-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getTimelineIcon = (type: string, position: string) => {
    const baseClasses = "w-3 h-3"
    const colorClasses = position === 'past' ? 'text-gray-400' : 
                        position === 'today' ? 'text-blue-600 dark:text-blue-400' : 
                        'text-green-600 dark:text-green-400'
    
    switch (type) {
      case 'created':
        return <CalendarIcon className={`${baseClasses} ${colorClasses}`} />
      case 'due':
        return <ClockIcon className={`${baseClasses} ${colorClasses}`} />
      case 'updated':
        return <LinkIcon className={`${baseClasses} ${colorClasses}`} />
      default:
        return <CalendarIcon className={`${baseClasses} ${colorClasses}`} />
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'created': return 'Created'
      case 'due': return 'Due'
      case 'updated': return 'Updated'
      default: return 'Event'
    }
  }

  const formatDate = (date: Date) => {
    const today = startOfDay(new Date())
    const itemDate = startOfDay(date)
    
    if (itemDate.getTime() === today.getTime()) {
      return `Today at ${format(date, 'h:mm a')}`
    } else if (differenceInDays(today, itemDate) === 1) {
      return `Yesterday at ${format(date, 'h:mm a')}`
    } else if (differenceInDays(today, itemDate) === -1) {
      return `Tomorrow at ${format(date, 'h:mm a')}`
    } else if (Math.abs(differenceInDays(today, itemDate)) <= 7) {
      return format(date, 'EEEE \'at\' h:mm a')
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a')
    }
  }

  if (timelineItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 text-center">
        <div>
          <CalendarIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Timeline Data</h3>
          <p className="text-muted-foreground max-w-sm">
            Tasks need creation dates, due dates, or recent updates to appear in the timeline view.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="space-y-8">
          {timelineItems.map((item, index) => (
            <div key={`${item.task.id}-${item.type}-${item.date.getTime()}`} className="relative">
              {/* Timeline line */}
              {index < timelineItems.length - 1 && (
                <div className="absolute left-4 top-12 w-0.5 h-16 bg-border" />
              )}
              
              {/* Timeline dot */}
              <div className={`absolute left-2.5 top-6 w-3 h-3 rounded-full border-2 ${
                item.position === 'past' ? 'bg-gray-300 border-gray-400' :
                item.position === 'today' ? 'bg-blue-500 border-blue-600 dark:bg-blue-400 dark:border-blue-500' :
                'bg-green-500 border-green-600 dark:bg-green-400 dark:border-green-500'
              }`} />

              {/* Content */}
              <div className="ml-10">
                <div className="bg-card rounded-lg shadow-sm border border-border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getTimelineIcon(item.type, item.position)}
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {getTypeLabel(item.type)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(item.date)}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-medium text-foreground mb-2">
                        {item.task.title}
                      </h3>
                      
                      {item.task.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {item.task.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Status */}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.task.status)}`}>
                          {item.task.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>

                        {/* Priority */}
                        <div className="flex items-center gap-1">
                          <FlagIcon className={`w-4 h-4 ${getPriorityColor(item.task.priority)}`} />
                          <span className={`text-xs font-medium ${getPriorityColor(item.task.priority)}`}>
                            {item.task.priority}
                          </span>
                        </div>

                        {/* Project */}
                        {item.task.projectName && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>📁</span>
                            <span>{item.task.projectName}</span>
                          </div>
                        )}

                        {/* Assigned */}
                        {item.task.assignedTo && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserIcon className="w-3 h-3" />
                            <span>Assigned</span>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {item.task.tags && item.task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {item.task.tags.slice(0, 4).map((tag) => (
                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-secondary text-secondary-foreground">
                              #{tag}
                            </span>
                          ))}
                          {item.task.tags.length > 4 && (
                            <span className="text-xs text-muted-foreground">+{item.task.tags.length - 4} more</span>
                          )}
                        </div>
                      )}

                      {/* Dependencies */}
                      {item.task.dependencies && item.task.dependencies.length > 0 && (
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                          🔗 {item.task.dependencies.length} dependencies
                        </div>
                      )}
                    </div>

                    {/* Action button */}
                    <button
                      onClick={() => {/* Could open task details modal */}}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      title="View task details"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary stats at bottom */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="bg-secondary/50 dark:bg-secondary/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-foreground">
                {timelineItems.filter(item => item.position === 'past').length}
              </div>
              <div className="text-sm text-muted-foreground">Past Events</div>
            </div>
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="text-2xl font-bold text-primary">
                {timelineItems.filter(item => item.position === 'today').length}
              </div>
              <div className="text-sm text-muted-foreground">Today</div>
            </div>
            <div className="bg-green-100 dark:bg-green-900/20 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {timelineItems.filter(item => item.position === 'future').length}
              </div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}