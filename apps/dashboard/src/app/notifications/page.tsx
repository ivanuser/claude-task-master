'use client'

import React, { useState, useEffect } from 'react'
import { NotificationList } from '@/components/notifications/NotificationList'
import { NotificationFilters } from '@/components/notifications/NotificationFilters'
import { NotificationStats } from '@/components/notifications/NotificationStats'
import { NotificationPreferencesModal } from '@/components/notifications/NotificationPreferencesModal'
import { NotificationSettings } from '@/components/notifications/NotificationSettings'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationType } from '@/types/team'
import BackButton from '@/components/ui/BackButton'
import { 
  Bell, 
  Settings, 
  CheckCheck, 
  Trash2, 
  Filter,
  Search,
  Loader2,
  AlertCircle 
} from 'lucide-react'

export interface NotificationFilters {
  type?: NotificationType
  unreadOnly: boolean
  dateRange?: 'today' | 'week' | 'month' | 'all'
  search: string
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    stats,
    markAllAsRead,
    loadNotifications,
    refreshStats
  } = useNotifications()

  const [filters, setFilters] = useState<NotificationFilters>({
    unreadOnly: false,
    search: '',
    dateRange: 'all'
  })
  
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [activeTab, setActiveTab] = useState('notifications')

  // Filter notifications based on current filters
  const filteredNotifications = notifications.filter(notification => {
    // Type filter
    if (filters.type && notification.type !== filters.type) return false

    // Unread filter
    if (filters.unreadOnly && notification.read) return false

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      if (
        !notification.title.toLowerCase().includes(searchLower) &&
        !notification.message.toLowerCase().includes(searchLower)
      ) {
        return false
      }
    }

    // Date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const notificationDate = new Date(notification.createdAt)
      const now = new Date()
      let cutoffDate: Date

      switch (filters.dateRange) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          return true
      }

      if (notificationDate < cutoffDate) return false
    }

    return true
  })

  const handleFilterChange = (newFilters: Partial<NotificationFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)

    // Reload notifications with new filters if needed
    if (newFilters.type !== undefined || newFilters.unreadOnly !== undefined) {
      loadNotifications({
        type: updatedFilters.type,
        unreadOnly: updatedFilters.unreadOnly
      })
    }
  }

  const handleMarkAllAsRead = async () => {
    await markAllAsRead()
    // Refresh stats after marking all as read
    refreshStats()
  }

  if (loading && notifications.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading notifications...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="bg-card rounded-lg shadow-lg p-8 max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground text-center mb-4">
            Error Loading Notifications
          </h2>
          <p className="text-muted-foreground text-center mb-4">{error}</p>
          <button
            onClick={() => loadNotifications()}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BackButton href="/dashboard" label="Back to Dashboard" className="mr-4" />
              <Bell className="w-8 h-8 text-primary mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
                {unreadCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Mark all as read */}
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  <CheckCheck className="w-4 h-4 mr-2" />
                  Mark all read
                </button>
              )}

              {/* Filters toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </button>

              {/* Tab buttons */}
              <div className="flex rounded-lg border border-border overflow-hidden">
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'notifications'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  <Bell className="w-4 h-4 mr-2 inline" />
                  Notifications
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    activeTab === 'settings'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent'
                  }`}
                >
                  <Settings className="w-4 h-4 mr-2 inline" />
                  Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'settings' ? (
          <NotificationSettings />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Stats Sidebar */}
            <div className="lg:col-span-1">
              <NotificationStats stats={stats} />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
            {/* Filters */}
            {showFilters && (
              <div className="mb-6">
                <NotificationFilters
                  filters={filters}
                  onFilterChange={handleFilterChange}
                />
              </div>
            )}

            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                />
              </div>
            </div>

            {/* Notifications List */}
            <NotificationList 
              notifications={filteredNotifications}
              loading={loading}
            />

            {/* Empty State */}
            {filteredNotifications.length === 0 && !loading && (
              <div className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No notifications found
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {filters.search || filters.type || filters.unreadOnly
                    ? 'Try adjusting your filters or search query.'
                    : "You're all caught up! No new notifications."}
                </p>
                {(filters.search || filters.type || filters.unreadOnly) && (
                  <button
                    onClick={() => setFilters({ unreadOnly: false, search: '', dateRange: 'all' })}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
            </div>
          </div>
        )}
      </div>

      {/* Preferences Modal */}
      {showPreferencesModal && (
        <NotificationPreferencesModal
          onClose={() => setShowPreferencesModal(false)}
        />
      )}
    </div>
  )
}