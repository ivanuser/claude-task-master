'use client'

import React, { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { 
  UserPlusIcon, 
  UserMinusIcon,
  ShieldCheckIcon,
  FlagIcon,
  MegaphoneIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ArchiveBoxIcon,
  BellIcon
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'

interface ActivityItem {
  id: string
  type: string
  title: string
  message: string
  priority: string
  metadata: any
  createdAt: string
  read: boolean
  user?: {
    id: string
    name: string | null
    email: string
    image: string | null
  }
}

interface ProjectActivityFeedProps {
  projectId: string
  className?: string
}

export function ProjectActivityFeed({ projectId, className }: ProjectActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const limit = 20

  const fetchActivities = async (reset = false) => {
    try {
      const offset = reset ? 0 : page * limit
      const response = await fetch(
        `/api/teams/${projectId}/notifications?limit=${limit}&offset=${offset}`
      )
      
      if (response.ok) {
        const data = await response.json()
        if (reset) {
          setActivities(data.activities)
        } else {
          setActivities(prev => [...prev, ...data.activities])
        }
        setHasMore(data.activities.length === limit)
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities(true)
  }, [projectId])

  const loadMore = () => {
    setPage(prev => prev + 1)
    fetchActivities()
  }

  const getActivityIcon = (metadata: any) => {
    if (metadata?.milestone) return <FlagIcon className="h-5 w-5" />
    if (metadata?.announcementId) return <MegaphoneIcon className="h-5 w-5" />
    if (metadata?.newRole) return <ShieldCheckIcon className="h-5 w-5" />
    if (metadata?.targetUserId && metadata?.actorId) {
      if (metadata.targetUserName) return <UserPlusIcon className="h-5 w-5" />
      return <UserMinusIcon className="h-5 w-5" />
    }
    if (metadata?.newStatus) {
      switch (metadata.newStatus) {
        case 'COMPLETED':
          return <CheckCircleIcon className="h-5 w-5" />
        case 'ARCHIVED':
          return <ArchiveBoxIcon className="h-5 w-5" />
        default:
          return <ArrowPathIcon className="h-5 w-5" />
      }
    }
    return <BellIcon className="h-5 w-5" />
  }

  const getActivityColor = (priority: string, type: string) => {
    if (type === 'SYSTEM' || priority === 'CRITICAL') return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
    if (priority === 'HIGH') return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
    if (priority === 'MEDIUM') return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
    return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
  }

  if (loading) {
    return (
      <div className={cn('bg-card rounded-lg shadow-sm border border-border p-6', className)}>
        <h3 className="text-lg font-semibold mb-4 text-foreground">Project Activity</h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-secondary rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-secondary rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-secondary rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('bg-card rounded-lg shadow-sm border border-border', className)}>
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">Project Activity</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Recent updates and notifications
        </p>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            <BellIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p>No activity yet</p>
            <p className="text-sm text-muted-foreground/75 mt-1">
              Team activities will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className={cn(
                  'p-4 hover:bg-accent transition-colors',
                  !activity.read && 'bg-blue-50 dark:bg-blue-900/20'
                )}
              >
                <div className="flex items-start space-x-3">
                  <div className={cn(
                    'p-2 rounded-full flex-shrink-0',
                    getActivityColor(activity.priority, activity.type)
                  )}>
                    {getActivityIcon(activity.metadata)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {activity.title}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {activity.message}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-muted-foreground">
                      {activity.user && (
                        <>
                          <span>{activity.user.name || activity.user.email}</span>
                          <span className="mx-1">•</span>
                        </>
                      )}
                      <span>
                        {formatDistanceToNow(new Date(activity.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasMore && activities.length > 0 && (
        <div className="p-4 border-t border-border">
          <button
            onClick={loadMore}
            className="w-full text-sm text-primary hover:text-primary/90 font-medium"
          >
            Load more activities
          </button>
        </div>
      )}
    </div>
  )
}