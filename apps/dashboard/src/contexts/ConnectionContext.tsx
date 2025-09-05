'use client'

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

export type ConnectionStatus = 'online' | 'offline' | 'reconnecting'

interface ConnectionState {
  status: ConnectionStatus
  isOnline: boolean
  lastOnlineAt: Date | null
  lastOfflineAt: Date | null
  pendingSyncCount: number
  reconnectAttempts: number
  maxReconnectAttempts: number
}

interface ConnectionContextValue extends ConnectionState {
  checkConnection: () => Promise<boolean>
  forceReconnect: () => void
  addToSyncQueue: (item: any) => void
  clearSyncQueue: () => void
  getSyncQueue: () => any[]
}

const ConnectionContext = createContext<ConnectionContextValue | undefined>(undefined)

const HEARTBEAT_INTERVAL = 30000 // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000 // 1 second
const MAX_RECONNECT_DELAY = 60000 // 1 minute
const MAX_RECONNECT_ATTEMPTS = 10

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>({
    status: 'online',
    isOnline: true,
    lastOnlineAt: new Date(),
    lastOfflineAt: null,
    pendingSyncCount: 0,
    reconnectAttempts: 0,
    maxReconnectAttempts: MAX_RECONNECT_ATTEMPTS,
  })

  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>()
  const syncQueueRef = useRef<any[]>([])
  const currentReconnectDelay = useRef(INITIAL_RECONNECT_DELAY)

  // Check connection by attempting to reach a health endpoint
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      return response.ok
    } catch (error) {
      return false
    }
  }, [])

  // Handle going online
  const handleOnline = useCallback(() => {
    console.log('Connection restored')
    setState(prev => ({
      ...prev,
      status: 'online',
      isOnline: true,
      lastOnlineAt: new Date(),
      reconnectAttempts: 0,
    }))
    currentReconnectDelay.current = INITIAL_RECONNECT_DELAY

    // Trigger sync of queued items
    if (syncQueueRef.current.length > 0) {
      console.log(`Syncing ${syncQueueRef.current.length} queued items`)
      // This would trigger actual sync logic
    }
  }, [])

  // Handle going offline
  const handleOffline = useCallback(() => {
    console.log('Connection lost')
    setState(prev => ({
      ...prev,
      status: 'offline',
      isOnline: false,
      lastOfflineAt: new Date(),
    }))

    // Start reconnection attempts
    startReconnection()
  }, [])

  // Exponential backoff reconnection logic
  const startReconnection = useCallback(() => {
    setState(prev => ({ ...prev, status: 'reconnecting' }))

    const attemptReconnect = async () => {
      if (state.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached')
        setState(prev => ({ ...prev, status: 'offline' }))
        return
      }

      setState(prev => ({ ...prev, reconnectAttempts: prev.reconnectAttempts + 1 }))
      
      const isConnected = await checkConnection()
      
      if (isConnected) {
        handleOnline()
      } else {
        // Exponential backoff with jitter
        const jitter = Math.random() * 1000
        const delay = Math.min(currentReconnectDelay.current * 2 + jitter, MAX_RECONNECT_DELAY)
        currentReconnectDelay.current = delay

        console.log(`Reconnection attempt ${state.reconnectAttempts + 1} failed. Retrying in ${delay}ms`)

        reconnectTimeoutRef.current = setTimeout(() => {
          attemptReconnect()
        }, delay)
      }
    }

    attemptReconnect()
  }, [state.reconnectAttempts, checkConnection, handleOnline])

  // Force reconnect
  const forceReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    setState(prev => ({ ...prev, reconnectAttempts: 0 }))
    currentReconnectDelay.current = INITIAL_RECONNECT_DELAY
    startReconnection()
  }, [startReconnection])

  // Sync queue management
  const addToSyncQueue = useCallback((item: any) => {
    syncQueueRef.current.push({
      ...item,
      queuedAt: new Date().toISOString(),
      id: Date.now().toString(),
    })
    setState(prev => ({ ...prev, pendingSyncCount: syncQueueRef.current.length }))
  }, [])

  const clearSyncQueue = useCallback(() => {
    syncQueueRef.current = []
    setState(prev => ({ ...prev, pendingSyncCount: 0 }))
  }, [])

  const getSyncQueue = useCallback(() => {
    return [...syncQueueRef.current]
  }, [])

  // Setup heartbeat monitoring
  useEffect(() => {
    const startHeartbeat = () => {
      heartbeatIntervalRef.current = setInterval(async () => {
        if (state.status === 'online') {
          const isConnected = await checkConnection()
          if (!isConnected && state.isOnline) {
            handleOffline()
          }
        }
      }, HEARTBEAT_INTERVAL)
    }

    startHeartbeat()

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [state.status, state.isOnline, checkConnection, handleOffline])

  // Listen to browser online/offline events
  useEffect(() => {
    const handleBrowserOnline = async () => {
      const isActuallyOnline = await checkConnection()
      if (isActuallyOnline) {
        handleOnline()
      }
    }

    const handleBrowserOffline = () => {
      handleOffline()
    }

    window.addEventListener('online', handleBrowserOnline)
    window.addEventListener('offline', handleBrowserOffline)

    // Check initial connection status
    checkConnection().then(isOnline => {
      if (!isOnline) {
        handleOffline()
      }
    })

    return () => {
      window.removeEventListener('online', handleBrowserOnline)
      window.removeEventListener('offline', handleBrowserOffline)
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
    }
  }, [checkConnection, handleOnline, handleOffline])

  const value: ConnectionContextValue = {
    ...state,
    checkConnection,
    forceReconnect,
    addToSyncQueue,
    clearSyncQueue,
    getSyncQueue,
  }

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  )
}

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (!context) {
    throw new Error('useConnection must be used within ConnectionProvider')
  }
  return context
}