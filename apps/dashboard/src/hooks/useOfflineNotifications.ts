'use client'

import { useEffect } from 'react'
import { useConnection } from '@/contexts/ConnectionContext'
import { toast } from 'react-hot-toast'

export function useOfflineNotifications() {
  const connection = useConnection()

  useEffect(() => {
    let isFirstLoad = true
    let wasOffline = false

    const handleStatusChange = () => {
      if (isFirstLoad) {
        isFirstLoad = false
        return
      }

      switch (connection.status) {
        case 'offline':
          wasOffline = true
          toast.error(
            'You are offline. Changes will be saved locally and synced when connection is restored.',
            {
              duration: 5000,
              icon: '🔌',
              id: 'offline-notification',
            }
          )
          break

        case 'online':
          if (wasOffline) {
            wasOffline = false
            
            if (connection.pendingSyncCount > 0) {
              toast.success(
                `Connection restored! Syncing ${connection.pendingSyncCount} pending changes...`,
                {
                  duration: 4000,
                  icon: '✅',
                  id: 'online-notification',
                }
              )
            } else {
              toast.success(
                'Connection restored!',
                {
                  duration: 3000,
                  icon: '✅',
                  id: 'online-notification',
                }
              )
            }
          }
          break

        case 'reconnecting':
          if (connection.reconnectAttempts === 1) {
            toast.loading(
              `Reconnecting... (Attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`,
              {
                id: 'reconnecting-notification',
              }
            )
          } else if (connection.reconnectAttempts > 1) {
            // Update existing toast
            toast.loading(
              `Reconnecting... (Attempt ${connection.reconnectAttempts}/${connection.maxReconnectAttempts})`,
              {
                id: 'reconnecting-notification',
              }
            )
          }
          
          if (connection.reconnectAttempts >= connection.maxReconnectAttempts) {
            toast.dismiss('reconnecting-notification')
            toast.error(
              'Unable to reconnect. Please check your internet connection.',
              {
                duration: 0, // Persistent until manually dismissed
                id: 'reconnect-failed',
              }
            )
          }
          break
      }
    }

    handleStatusChange()

    // Clean up toasts when connection is restored
    if (connection.status === 'online') {
      toast.dismiss('reconnecting-notification')
      toast.dismiss('reconnect-failed')
    }

  }, [connection.status, connection.reconnectAttempts, connection.pendingSyncCount, connection.maxReconnectAttempts])

  // Listen for sync events
  useEffect(() => {
    const handleSyncEvent = (event: MessageEvent) => {
      if (event.data.type === 'sync-success') {
        toast.success('Changes synced successfully', {
          duration: 2000,
          icon: '🔄',
        })
      } else if (event.data.type === 'sync-failed') {
        toast.error('Failed to sync some changes. They will be retried automatically.', {
          duration: 4000,
          icon: '⚠️',
        })
      }
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSyncEvent)
      
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSyncEvent)
      }
    }
  }, [])

  // Monitor sync queue
  useEffect(() => {
    if (connection.pendingSyncCount > 5) {
      toast(
        `${connection.pendingSyncCount} changes waiting to sync`,
        {
          icon: '📦',
          duration: 3000,
          id: 'sync-queue-notification',
        }
      )
    }
  }, [connection.pendingSyncCount])

  return {
    isOnline: connection.isOnline,
    status: connection.status,
    pendingSyncCount: connection.pendingSyncCount,
  }
}

// Service Worker Registration Hook
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js')
        
        console.log('Service Worker registered:', registration)

        // Check for updates periodically
        setInterval(() => {
          registration.update()
        }, 60000) // Check every minute

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                toast(
                  'New version available! Refresh to update.',
                  {
                    duration: 0,
                    action: {
                      label: 'Refresh',
                      onClick: () => window.location.reload(),
                    },
                  }
                )
              }
            })
          }
        })
      } catch (error) {
        console.error('Service Worker registration failed:', error)
      }
    }

    registerServiceWorker()

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload()
    })

  }, [])
}