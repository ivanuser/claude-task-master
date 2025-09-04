import React from 'react'
import { NotificationItem } from './NotificationItem'
import { Notification } from '@/types/team'
import { Loader2 } from 'lucide-react'

interface NotificationListProps {
  notifications: Notification[]
  loading?: boolean
}

export function NotificationList({ notifications, loading }: NotificationListProps) {
  if (loading && notifications.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading notifications...</span>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="divide-y divide-gray-200">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
          />
        ))}
      </div>
    </div>
  )
}