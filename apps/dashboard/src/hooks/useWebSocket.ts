import { useEffect, useRef, useCallback, useState } from 'react'

interface UseWebSocketState {
  connected: boolean
}

interface UseWebSocketReturn {
  socket: WebSocket | null
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
  const ws = useRef<WebSocket | null>(null)
  const callbacks = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const [isConnected, setIsConnected] = useState<boolean>(false)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws`
      
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        setIsConnected(true)
        console.log('WebSocket connected')
      }

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          const { channel, ...payload } = data
          
          const channelCallbacks = callbacks.current.get(channel)
          if (channelCallbacks) {
            channelCallbacks.forEach(callback => {
              try {
                callback(payload)
              } catch (error) {
                console.error('WebSocket callback error:', error)
              }
            })
          }
        } catch (error) {
          console.error('WebSocket message parsing error:', error)
        }
      }

      ws.current.onclose = (event) => {
        setIsConnected(false)
        // Only log and retry if it's not a 501 (Not Implemented) status
        if (event.code !== 1006) {
          console.log('WebSocket disconnected:', event.reason)
          // Attempt to reconnect after 5 seconds, but with backoff
          setTimeout(() => {
            connect()
          }, 5000)
        } else {
          console.log('WebSocket functionality not yet implemented, skipping reconnection attempts')
        }
      }

      ws.current.onerror = (error) => {
        console.log('WebSocket connection failed (this is expected until WebSocket server is implemented)')
        setIsConnected(false)
      }
    } catch (error) {
      console.log('WebSocket connection skipped (not yet implemented)')
      setIsConnected(false)
    }
  }, [])

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
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, message not sent:', message)
    }
  }, [])

  // Additional methods expected by useRealtimeSync
  const subscribeToProject = useCallback(async (projectId: string): Promise<void> => {
    // For now, this is a no-op since we don't have a real WebSocket server
    console.log('Subscribing to project:', projectId)
  }, [])

  const unsubscribeFromProject = useCallback((projectId: string) => {
    console.log('Unsubscribing from project:', projectId)
  }, [])

  const triggerSync = useCallback(async (projectId: string): Promise<void> => {
    console.log('Triggering sync for project:', projectId)
  }, [])

  const getSyncStatus = useCallback((projectId: string) => {
    console.log('Getting sync status for project:', projectId)
  }, [])

  const on = useCallback((event: string, callback: (data: any) => void) => {
    subscribe(event, callback)
  }, [subscribe])

  const off = useCallback((event: string, callback: (data: any) => void) => {
    unsubscribe(event, callback)
  }, [unsubscribe])

  useEffect(() => {
    // Temporarily disable WebSocket connections to prevent errors
    // TODO: Re-enable when WebSocket server is properly implemented
    console.log('WebSocket connections temporarily disabled')
    
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [connect])

  return {
    socket: ws.current,
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