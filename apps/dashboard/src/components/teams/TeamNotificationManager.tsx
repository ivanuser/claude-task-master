'use client'

import React, { useState } from 'react'
import { 
  BellIcon, 
  TrashIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface TeamNotificationManagerProps {
  projectId: string
  isAdmin: boolean
}

export function TeamNotificationManager({ projectId, isAdmin }: TeamNotificationManagerProps) {
  const [processing, setProcessing] = useState(false)
  const [selectedAction, setSelectedAction] = useState<'mark-read' | 'delete' | null>(null)
  const [deleteOlderThan, setDeleteOlderThan] = useState(30)

  const handleMarkAllRead = async () => {
    if (!isAdmin) {
      toast.error('Only admins can perform bulk operations')
      return
    }

    setProcessing(true)
    setSelectedAction('mark-read')

    try {
      const response = await fetch(`/api/teams/${projectId}/notifications/bulk`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark-read',
        }),
      })

      if (response.ok) {
        toast.success('All team notifications marked as read')
      } else {
        throw new Error('Failed to mark notifications as read')
      }
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      toast.error('Failed to mark notifications as read')
    } finally {
      setProcessing(false)
      setSelectedAction(null)
    }
  }

  const handleDeleteOld = async () => {
    if (!isAdmin) {
      toast.error('Only admins can perform bulk operations')
      return
    }

    setProcessing(true)
    setSelectedAction('delete')

    try {
      const response = await fetch(
        `/api/teams/${projectId}/notification-policy?olderThanDays=${deleteOlderThan}`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        toast.success(`Deleted notifications older than ${deleteOlderThan} days`)
      } else {
        throw new Error('Failed to delete old notifications')
      }
    } catch (error) {
      console.error('Error deleting old notifications:', error)
      toast.error('Failed to delete old notifications')
    } finally {
      setProcessing(false)
      setSelectedAction(null)
    }
  }

  const handleClearActivity = async () => {
    if (!isAdmin) {
      toast.error('Only admins can perform bulk operations')
      return
    }

    const confirmed = window.confirm(
      'Are you sure you want to clear all activity history? This action cannot be undone.'
    )

    if (!confirmed) return

    setProcessing(true)

    try {
      const response = await fetch(
        `/api/teams/${projectId}/notification-policy?olderThanDays=0`,
        {
          method: 'DELETE',
        }
      )

      if (response.ok) {
        toast.success('All activity history cleared')
      } else {
        throw new Error('Failed to clear activity history')
      }
    } catch (error) {
      console.error('Error clearing activity history:', error)
      toast.error('Failed to clear activity history')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center">
          <BellIcon className="h-5 w-5 text-muted-foreground mr-2" />
          <h3 className="text-lg font-medium text-foreground">Notification Management</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage team notifications and activity history
        </p>
        {!isAdmin && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
            Only team admins can perform bulk operations
          </p>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Mark All as Read */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <CheckCircleIcon className="h-6 w-6 text-green-500 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground">Mark All as Read</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Mark all team notifications as read for all members
            </p>
            <button
              onClick={handleMarkAllRead}
              disabled={!isAdmin || processing}
              className={cn(
                'mt-3 px-4 py-2 text-sm font-medium rounded-md',
                isAdmin && !processing
                  ? 'bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              {processing && selectedAction === 'mark-read' 
                ? 'Processing...' 
                : 'Mark All Read'}
            </button>
          </div>
        </div>

        {/* Delete Old Notifications */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <TrashIcon className="h-6 w-6 text-orange-500 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground">Delete Old Notifications</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Remove notifications older than specified days
            </p>
            <div className="mt-3 flex items-center space-x-3">
              <select
                value={deleteOlderThan}
                onChange={(e) => setDeleteOlderThan(parseInt(e.target.value))}
                disabled={!isAdmin || processing}
                className={cn(
                  'rounded-md border-border bg-background text-foreground text-sm',
                  !isAdmin && 'opacity-50 cursor-not-allowed'
                )}
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
              <button
                onClick={handleDeleteOld}
                disabled={!isAdmin || processing}
                className={cn(
                  'px-4 py-2 text-sm font-medium rounded-md',
                  isAdmin && !processing
                    ? 'bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {processing && selectedAction === 'delete' 
                  ? 'Deleting...' 
                  : 'Delete Old'}
              </button>
            </div>
          </div>
        </div>

        {/* Clear All Activity */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground">Clear All Activity</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Permanently delete all team notifications and activity history
            </p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              Warning: This action cannot be undone
            </p>
            <button
              onClick={handleClearActivity}
              disabled={!isAdmin || processing}
              className={cn(
                'mt-3 px-4 py-2 text-sm font-medium rounded-md',
                isAdmin && !processing
                  ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600'
                  : 'bg-muted text-muted-foreground cursor-not-allowed'
              )}
            >
              Clear All Activity
            </button>
          </div>
        </div>

        {/* Archive Settings */}
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <ArchiveBoxIcon className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-foreground">Auto-Archive</h4>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically archive notifications older than 90 days
            </p>
            <div className="mt-3">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  disabled={!isAdmin}
                  className={cn(
                    'rounded border-border text-primary focus:ring-primary',
                    !isAdmin && 'opacity-50 cursor-not-allowed'
                  )}
                />
                <span className={cn(
                  'ml-2 text-sm',
                  isAdmin ? 'text-foreground' : 'text-muted-foreground'
                )}>
                  Enable auto-archive
                </span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="px-6 py-4 bg-secondary/50 dark:bg-secondary/20 border-t border-border">
        <h4 className="text-sm font-medium text-foreground mb-3">Activity Statistics</h4>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-semibold text-foreground">--</p>
            <p className="text-xs text-muted-foreground">Total Notifications</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">--</p>
            <p className="text-xs text-muted-foreground">Unread</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-foreground">--</p>
            <p className="text-xs text-muted-foreground">This Week</p>
          </div>
        </div>
      </div>
    </div>
  )
}