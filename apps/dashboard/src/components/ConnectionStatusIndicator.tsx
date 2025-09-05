'use client'

import React, { useState, useEffect } from 'react'
import { Wifi, WifiOff, RefreshCw, CloudOff, Cloud, AlertTriangle } from 'lucide-react'
import { useConnection } from '@/contexts/ConnectionContext'
import { getSyncQueueManager } from '@/lib/offline/sync-queue-manager'

export function ConnectionStatusIndicator() {
  const connection = useConnection()
  const [syncStatus, setSyncStatus] = useState({
    pending: 0,
    syncing: 0,
    failed: 0,
    total: 0,
  })
  const [showDetails, setShowDetails] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)

  useEffect(() => {
    const syncManager = getSyncQueueManager()
    
    const updateSyncStatus = async () => {
      const status = await syncManager.getQueueStatus()
      setSyncStatus(status)
    }

    // Update sync status on mount and when connection changes
    updateSyncStatus()
    
    // Update periodically when offline
    const interval = connection.status === 'offline' 
      ? setInterval(updateSyncStatus, 5000) 
      : null

    // Listen to sync progress
    const unsubscribe = syncManager.onProgress((progress) => {
      setSyncStatus(prev => ({
        ...prev,
        total: progress.total,
        failed: progress.failed,
        syncing: progress.inProgress,
      }))
    })

    return () => {
      if (interval) clearInterval(interval)
      unsubscribe()
    }
  }, [connection.status])

  const handleRetry = async () => {
    setIsRetrying(true)
    const syncManager = getSyncQueueManager()
    
    try {
      if (connection.status === 'offline') {
        // Force reconnect attempt
        connection.forceReconnect()
      } else {
        // Retry failed sync items
        await syncManager.retryFailed()
      }
    } finally {
      setTimeout(() => setIsRetrying(false), 2000)
    }
  }

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'online':
        return syncStatus.total > 0 
          ? <Cloud className="w-4 h-4 text-yellow-500" />
          : <Wifi className="w-4 h-4 text-green-500" />
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />
      case 'reconnecting':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusText = () => {
    if (connection.status === 'online' && syncStatus.total > 0) {
      return `Syncing ${syncStatus.total} items...`
    }
    
    switch (connection.status) {
      case 'online':
        return 'Connected'
      case 'offline':
        return 'Offline'
      case 'reconnecting':
        return `Reconnecting... (Attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = () => {
    switch (connection.status) {
      case 'online':
        return syncStatus.total > 0 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
      case 'offline':
        return 'bg-red-100 text-red-800'
      case 'reconnecting':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never'
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / 60000),
      'minute'
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${getStatusColor()}`}
      >
        {getStatusIcon()}
        <span>{getStatusText()}</span>
        {connection.pendingSyncCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-white bg-opacity-50 rounded-full text-xs">
            {connection.pendingSyncCount}
          </span>
        )}
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900">Connection Details</h3>
          </div>

          <div className="p-4 space-y-3">
            {/* Connection Status */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-600">Status</span>
                <span className={`text-sm font-medium ${
                  connection.status === 'online' ? 'text-green-600' :
                  connection.status === 'offline' ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                </span>
              </div>
              
              {connection.status === 'reconnecting' && (
                <div className="mt-1">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>Attempt {connection.reconnectAttempts} of {connection.maxReconnectAttempts}</span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className="bg-yellow-500 h-1 rounded-full transition-all"
                      style={{ 
                        width: `${(connection.reconnectAttempts / connection.maxReconnectAttempts) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Last Connected */}
            {connection.lastOnlineAt && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last connected</span>
                <span className="text-sm text-gray-900">
                  {formatTime(connection.lastOnlineAt)}
                </span>
              </div>
            )}

            {/* Sync Queue Status */}
            {(syncStatus.total > 0 || connection.status === 'offline') && (
              <div className="pt-3 border-t border-gray-100">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Sync Queue</h4>
                
                {syncStatus.total > 0 && (
                  <div className="space-y-2">
                    {syncStatus.pending > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Pending</span>
                        <span className="text-yellow-600 font-medium">{syncStatus.pending}</span>
                      </div>
                    )}
                    
                    {syncStatus.syncing > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Syncing</span>
                        <span className="text-blue-600 font-medium">{syncStatus.syncing}</span>
                      </div>
                    )}
                    
                    {syncStatus.failed > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Failed</span>
                        <span className="text-red-600 font-medium">{syncStatus.failed}</span>
                      </div>
                    )}
                  </div>
                )}

                {connection.status === 'offline' && syncStatus.total === 0 && (
                  <p className="text-sm text-gray-500">
                    Changes will be synced when connection is restored
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="pt-3 border-t border-gray-100 flex space-x-2">
              {connection.status === 'offline' && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    'Try Reconnect'
                  )}
                </button>
              )}

              {syncStatus.failed > 0 && connection.status === 'online' && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="flex-1 px-3 py-1.5 bg-yellow-600 text-white text-sm rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    `Retry ${syncStatus.failed} Failed`
                  )}
                </button>
              )}

              <button
                onClick={() => setShowDetails(false)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ConnectionStatusBanner() {
  const connection = useConnection()
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // Show banner when going offline or having connection issues
    if (connection.status === 'offline' || 
        (connection.status === 'reconnecting' && connection.reconnectAttempts > 3)) {
      setShowBanner(true)
    } else if (connection.status === 'online') {
      // Hide banner after a delay when back online
      const timeout = setTimeout(() => setShowBanner(false), 3000)
      return () => clearTimeout(timeout)
    }
  }, [connection.status, connection.reconnectAttempts])

  if (!showBanner) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
      connection.status === 'offline' 
        ? 'bg-red-600 text-white' 
        : connection.status === 'reconnecting'
        ? 'bg-yellow-500 text-white'
        : 'bg-green-600 text-white'
    }`}>
      <div className="flex items-center justify-center">
        {connection.status === 'offline' ? (
          <>
            <CloudOff className="w-4 h-4 mr-2" />
            You're offline. Changes will be saved locally and synced when connection is restored.
          </>
        ) : connection.status === 'reconnecting' ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Attempting to reconnect... ({connection.reconnectAttempts}/{connection.maxReconnectAttempts})
          </>
        ) : (
          <>
            <Wifi className="w-4 h-4 mr-2" />
            Connection restored. Syncing changes...
          </>
        )}
      </div>
    </div>
  )
}