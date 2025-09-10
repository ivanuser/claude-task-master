import React from 'react'
import { Bell, CheckCircle, Clock, Users, TrendingUp } from 'lucide-react'

interface NotificationStatsProps {
  stats: {
    total: number
    unread: number
    byType: Record<string, number>
    lastWeek: number
    lastMonth: number
  } | null
}

export function NotificationStats({ stats }: NotificationStatsProps) {
  if (!stats) {
    return (
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Statistics</h3>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-secondary rounded w-3/4"></div>
          <div className="h-4 bg-secondary rounded w-1/2"></div>
          <div className="h-4 bg-secondary rounded w-2/3"></div>
        </div>
      </div>
    )
  }

  const readPercentage = stats.total > 0 ? Math.round(((stats.total - stats.unread) / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Overall Stats */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Overview</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{stats.total}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400 mr-2" />
              <span className="text-sm text-muted-foreground">Unread</span>
            </div>
            <span className="text-lg font-semibold text-orange-600 dark:text-orange-400">{stats.unread}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
              <span className="text-sm text-muted-foreground">Read</span>
            </div>
            <span className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.total - stats.unread}</span>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-muted-foreground mb-1">
              <span>Read Progress</span>
              <span>{readPercentage}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-green-600 dark:bg-green-400 h-2 rounded-full transition-all duration-300"
                style={{ width: `${readPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-medium text-foreground mb-4">Activity</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
              <span className="text-sm text-muted-foreground">This Week</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{stats.lastWeek}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400 mr-2" />
              <span className="text-sm text-muted-foreground">This Month</span>
            </div>
            <span className="text-lg font-semibold text-foreground">{stats.lastMonth}</span>
          </div>
        </div>
      </div>

      {/* By Type Stats */}
      {Object.keys(stats.byType).length > 0 && (
        <div className="bg-card rounded-lg border border-border p-6">
          <h3 className="text-lg font-medium text-foreground mb-4">By Type</h3>
          
          <div className="space-y-3">
            {Object.entries(stats.byType)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 5)
              .map(([type, count]) => {
                const typeLabel = type.split('_').map(word => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')
                
                return (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground truncate">{typeLabel}</span>
                    <div className="flex items-center">
                      <div className="w-16 bg-secondary rounded-full h-1.5 mr-2">
                        <div 
                          className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                          style={{ width: `${(count / Math.max(...Object.values(stats.byType))) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-foreground w-8 text-right">{count}</span>
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}