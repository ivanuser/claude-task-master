import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import { Notification, NotificationType } from '@/types/team'
import { useNotifications } from '@/hooks/useNotifications'
import { 
  CheckSquare, 
  MessageCircle, 
  Users, 
  Clock, 
  AlertTriangle,
  FileText,
  Settings,
  Megaphone,
  X,
  ExternalLink,
  Trash2
} from 'lucide-react'

interface NotificationItemProps {
  notification: Notification
}

const notificationIcons: Record<NotificationType, React.ComponentType<any>> = {
  task_assigned: CheckSquare,
  task_mentioned: MessageCircle,
  task_due_soon: Clock,
  task_overdue: AlertTriangle,
  comment_reply: MessageCircle,
  team_invitation: Users,
  role_changed: Settings,
  project_shared: FileText,
  report_ready: FileText,
  system_announcement: Megaphone,
}

const notificationColors: Record<NotificationType, string> = {
  task_assigned: 'text-blue-600 bg-blue-100',
  task_mentioned: 'text-purple-600 bg-purple-100',
  task_due_soon: 'text-orange-600 bg-orange-100',
  task_overdue: 'text-red-600 bg-red-100',
  comment_reply: 'text-green-600 bg-green-100',
  team_invitation: 'text-indigo-600 bg-indigo-100',
  role_changed: 'text-gray-600 bg-gray-100',
  project_shared: 'text-cyan-600 bg-cyan-100',
  report_ready: 'text-emerald-600 bg-emerald-100',
  system_announcement: 'text-yellow-600 bg-yellow-100',
}

export function NotificationItem({ notification }: NotificationItemProps) {
  const { markAsRead, deleteNotification } = useNotifications({ initialLoad: false })

  const IconComponent = notificationIcons[notification.type]
  const iconColorClass = notificationColors[notification.type]

  const handleMarkAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!notification.read) {
      await markAsRead(notification.id)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await deleteNotification(notification.id)
  }

  const handleActionClick = () => {
    // Mark as read when clicking action
    if (!notification.read) {
      markAsRead(notification.id)
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank')
    }
  }

  const timeAgo = formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })

  return (
    <div
      className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer group ${
        !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
      onClick={handleMarkAsRead}
    >
      <div className="flex items-start space-x-3">
        {/* Notification Icon */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${iconColorClass}`}>
          <IconComponent className="w-4 h-4" />
        </div>

        {/* Notification Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className={`text-sm font-medium ${!notification.read ? 'text-gray-900' : 'text-gray-700'}`}>
                {notification.title}
              </h4>
              <p className={`mt-1 text-sm ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}>
                {notification.message}
              </p>
              
              <div className="mt-2 flex items-center text-xs text-gray-500 space-x-4">
                <span>{timeAgo}</span>
                {!notification.read && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    New
                  </span>
                )}
                {notification.expiresAt && (
                  <span className="text-orange-600">
                    Expires {formatDistanceToNow(new Date(notification.expiresAt), { addSuffix: true })}
                  </span>
                )}
              </div>

              {/* Action Button */}
              {notification.actionUrl && notification.actionLabel && (
                <button
                  onClick={handleActionClick}
                  className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  {notification.actionLabel}
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {!notification.read && (
                <button
                  onClick={handleMarkAsRead}
                  className="p-1 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                  title="Mark as read"
                >
                  <CheckSquare className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={handleDelete}
                className="p-1 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100 transition-colors"
                title="Delete notification"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}