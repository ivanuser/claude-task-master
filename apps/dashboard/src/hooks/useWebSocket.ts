import { useEffect, useRef, useCallback, useState } from 'react'
import { useSession } from 'next-auth/react'

interface UseWebSocketState {
  connected: boolean
}

interface UseWebSocketReturn {
  socket: EventSource | null
  state: UseWebSocketState
  subscribeToProject: (projectId: string) => Promise<void>
  unsubscribeFromProject: (projectId: string) => void
  triggerSync: (projectId: string) => Promise<void>
  getSyncStatus: (projectId: string) => void
  on: (event: string, callback: (data: any) => void) => void
  off: (event: string, callback: (data: any) => void) => void
  subscribe: (channel: string, callback: (data: any) => void) => void
  unsubscribe: (channel: string, callback: (data: any) => void) => void
  isConnected: boolean
  send: (message: any) => void
}

export function useWebSocket(): UseWebSocketReturn {
  const eventSource = useRef<EventSource | null>(null)
  const callbacks = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const { data: session } = useSession()
  const subscribedProjects = useRef<Set<string>>(new Set())

  const connect = useCallback(() => {
    if (eventSource.current?.readyState === EventSource.OPEN) return
    if (!session?.user?.id) return

    try {
      console.log('🔌 Connecting to SSE...')
      eventSource.current = new EventSource('/api/sse')

      // EventSource doesn't fire onopen immediately, we need to listen for the first message
      eventSource.current.addEventListener('open', () => {
        console.log('✅ SSE connection opened')
      })

      eventSource.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log('📨 SSE message received:', data)
          
          // Handle different message types
          if (data.type === 'connected') {
            console.log('🎉 SSE connection established')
            setIsConnected(true)
            
            // Re-subscribe to projects after reconnection
            subscribedProjects.current.forEach(projectId => {
              subscribeToProjectSSE(projectId)
            })
            return
          }
          
          if (data.type === 'ping') {
            return // Ignore ping messages
          }
          
          // Determine the channel based on message type
          let channel = data.type
          if (data.projectId) {
            channel = `project-${data.projectId}`
          }
          
          const channelCallbacks = callbacks.current.get(channel)
          if (channelCallbacks) {
            channelCallbacks.forEach(callback => {
              try {
                callback(data)
              } catch (error) {
                console.error('SSE callback error:', error)
              }
            })
          }
          
          // Also trigger generic event listeners
          const genericCallbacks = callbacks.current.get(data.type)
          if (genericCallbacks) {
            genericCallbacks.forEach(callback => {
              try {
                callback(data)
              } catch (error) {
                console.error('SSE generic callback error:', error)
              }
            })
          }
        } catch (error) {
          console.error('SSE message parsing error:', error)
        }
      }

      eventSource.current.onerror = (error) => {
        console.log('❌ SSE connection error, reconnecting...')
        setIsConnected(false)
        
        // Close current connection
        if (eventSource.current) {
          eventSource.current.close()
          eventSource.current = null
        }
        
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          connect()
        }, 5000)
      }
    } catch (error) {
      console.error('SSE connection failed:', error)
      setIsConnected(false)
    }
  }, [session?.user?.id])

  // Helper function for SSE project subscription
  const subscribeToProjectSSE = useCallback(async (projectId: string) => {
    if (!session?.user?.id) return
    
    // Just track locally - server-side will handle subscription when connection is established
    subscribedProjects.current.add(projectId)
    console.log(`📡 Subscribed to project ${projectId} via SSE`)
  }, [session?.user?.id])

  const subscribe = useCallback((channel: string, callback: (data: any) => void) => {
    if (!callbacks.current.has(channel)) {
      callbacks.current.set(channel, new Set())
    }
    callbacks.current.get(channel)!.add(callback)
  }, [])

  const unsubscribe = useCallback((channel: string, callback: (data: any) => void) => {
    const channelCallbacks = callbacks.current.get(channel)
    if (channelCallbacks) {
      channelCallbacks.delete(callback)
      if (channelCallbacks.size === 0) {
        callbacks.current.delete(channel)
      }
    }
  }, [])

  const send = useCallback((message: any) => {
    // SSE is one-way, but we could send messages via HTTP POST if needed
    console.warn('SSE is one-way communication, cannot send message:', message)
  }, [])

  // Additional methods expected by useRealtimeSync
  const subscribeToProject = useCallback(async (projectId: string): Promise<void> => {
    await subscribeToProjectSSE(projectId)
  }, [subscribeToProjectSSE])

  const unsubscribeFromProject = useCallback(async (projectId: string) => {
    if (!session?.user?.id) return
    
    // Just track locally - server-side will handle unsubscription
    subscribedProjects.current.delete(projectId)
    console.log(`📡 Unsubscribed from project ${projectId} via SSE`)
  }, [session?.user?.id])

  const triggerSync = useCallback(async (projectId: string): Promise<void> => {
    if (!session?.user?.id) return
    
    // For now, just log the sync trigger until the actual endpoint is implemented
    console.log(`🔄 Triggered sync for project ${projectId}`)
  }, [session?.user?.id])

  const getSyncStatus = useCallback(async (projectId: string) => {
    if (!session?.user?.id) return
    
    // For now, return a mock status until the actual endpoint is implemented
    console.log(`📊 Sync status for project ${projectId}: simulated`)
    return { status: 'synced', projectId }
  }, [session?.user?.id])

  const on = useCallback((event: string, callback: (data: any) => void) => {
    subscribe(event, callback)
  }, [subscribe])

  const off = useCallback((event: string, callback: (data: any) => void) => {
    unsubscribe(event, callback)
  }, [unsubscribe])

  useEffect(() => {
    if (session?.user?.id) {
      console.log('🚀 Starting SSE connection for authenticated user')
      connect()
    } else {
      console.log('⚠️ No authenticated session, skipping SSE connection')
      setIsConnected(false)
    }
    
    return () => {
      if (eventSource.current) {
        console.log('🔌 Closing SSE connection')
        eventSource.current.close()
        eventSource.current = null
        setIsConnected(false)
      }
    }
  }, [connect, session?.user?.id])

  return {
    socket: eventSource.current,
    state: { connected: isConnected },
    subscribeToProject,
    unsubscribeFromProject,
    triggerSync,
    getSyncStatus,
    on,
    off,
    subscribe,
    unsubscribe,
    isConnected,
    send,
  }
}