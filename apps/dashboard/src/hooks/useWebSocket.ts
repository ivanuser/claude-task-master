import { useEffect, useRef, useCallback } from 'react'

interface UseWebSocketReturn {
  subscribe: (channel: string, callback: (data: any) => void) => void
  unsubscribe: (channel: string, callback: (data: any) => void) => void
  isConnected: boolean
  send: (message: any) => void
}

export function useWebSocket(): UseWebSocketReturn {
  const ws = useRef<WebSocket | null>(null)
  const callbacks = useRef<Map<string, Set<(data: any) => void>>>(new Map())
  const isConnected = useRef<boolean>(false)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const wsUrl = `${protocol}//${window.location.host}/api/ws`
      
      ws.current = new WebSocket(wsUrl)

      ws.current.onopen = () => {
        isConnected.current = true
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

      ws.current.onclose = () => {
        isConnected.current = false
        console.log('WebSocket disconnected')
        // Attempt to reconnect after 3 seconds
        setTimeout(() => {
          connect()
        }, 3000)
      }

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error)
        isConnected.current = false
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      isConnected.current = false
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

  useEffect(() => {
    connect()
    
    return () => {
      if (ws.current) {
        ws.current.close()
      }
    }
  }, [connect])

  return {
    subscribe,
    unsubscribe,
    isConnected: isConnected.current,
    send,
  }
}