import { useState, useEffect, useCallback } from 'react'
import { Notification, NotificationType, NotificationPreferences } from '@/types/team'
import { NotificationServiceSimple as NotificationService } from '@/lib/services/notification.service.simple'

export interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  preferences: NotificationPreferences | null
  stats: any | null
  
  // Actions
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  loadNotifications: (options?: {
    unreadOnly?: boolean
    type?: NotificationType
    limit?: number
    offset?: number
  }) => Promise<void>
  updatePreferences: (preferences: NotificationPreferences) => Promise<void>
  refreshStats: () => Promise<void>
}

interface UseNotificationsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
  initialLoad?: boolean
}

export function useNotifications(options: UseNotificationsOptions = {}): UseNotificationsReturn {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    initialLoad = true
  } = options

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [stats, setStats] = useState<any>(null)

  // Load notifications from API
  const loadNotifications = useCallback(async (options: {
    unreadOnly?: boolean
    type?: NotificationType
    limit?: number
    offset?: number
  } = {}) => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.unreadOnly) params.set('unreadOnly', 'true')
      if (options.type) params.set('type', options.type)
      if (options.limit) params.set('limit', options.limit.toString())
      if (options.offset) params.set('offset', options.offset.toString())

      const response = await fetch(`/api/notifications?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      setNotifications(data.notifications)
      
      // Load unread count
      await refreshUnreadCount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh unread count
  const refreshUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err)
    }
  }, [])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' })
      })

      if (!response.ok) {
        throw new Error('Failed to mark notification as read')
      }

      // Update local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true, readAt: new Date().toISOString() }
            : notification
        )
      )

      // Refresh unread count
      await refreshUnreadCount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark notification as read')
    }
  }, [refreshUnreadCount])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      })

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read')
      }

      // Update local state
      const now = new Date().toISOString()
      setNotifications(prev => 
        prev.map(notification => ({ 
          ...notification, 
          read: true, 
          readAt: notification.readAt || now 
        }))
      )

      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark all notifications as read')
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete notification')
      }

      // Update local state
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      await refreshUnreadCount()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete notification')
    }
  }, [refreshUnreadCount])

  // Load notification preferences
  const loadPreferences = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
      }
    } catch (err) {
      console.error('Failed to load notification preferences:', err)
    }
  }, [])

  // Update notification preferences
  const updatePreferences = useCallback(async (newPreferences: NotificationPreferences) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      })

      if (!response.ok) {
        throw new Error('Failed to update preferences')
      }

      setPreferences(newPreferences)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences')
    }
  }, [])

  // Refresh notification stats
  const refreshStats = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load notification stats:', err)
    }
  }, [])

  // Set up real-time updates subscription
  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((newNotification: Notification) => {
      // Add new notification to the list
      setNotifications(prev => [newNotification, ...prev])
      
      // Update unread count if notification is unread
      if (!newNotification.read) {
        setUnreadCount(prev => prev + 1)
      }
    })

    return unsubscribe
  }, [])

  // Initial load
  useEffect(() => {
    if (initialLoad) {
      loadNotifications()
      loadPreferences()
      refreshStats()
    }
  }, [initialLoad, loadNotifications, loadPreferences, refreshStats])

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      loadNotifications()
      refreshUnreadCount()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loadNotifications, refreshUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    preferences,
    stats,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    loadNotifications,
    updatePreferences,
    refreshStats,
  }
}