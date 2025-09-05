'use client'

import { io, Socket } from 'socket.io-client'

export interface HeartbeatOptions {
  interval: number
  timeout: number
  maxMissedHeartbeats: number
}

export interface ConnectionEvents {
  onConnect?: () => void
  onDisconnect?: (reason: string) => void
  onReconnect?: (attemptNumber: number) => void
  onReconnectFailed?: () => void
  onHeartbeatTimeout?: () => void
}

export class EnhancedSocketClient {
  private socket: Socket | null = null
  private heartbeatInterval: NodeJS.Timeout | null = null
  private heartbeatTimeout: NodeJS.Timeout | null = null
  private missedHeartbeats: number = 0
  private isConnected: boolean = false
  private connectionEvents: ConnectionEvents = {}

  private heartbeatOptions: HeartbeatOptions = {
    interval: 25000, // 25 seconds
    timeout: 60000, // 60 seconds
    maxMissedHeartbeats: 3,
  }

  constructor(
    private url: string,
    private options?: Partial<HeartbeatOptions>,
    events?: ConnectionEvents
  ) {
    if (options) {
      this.heartbeatOptions = { ...this.heartbeatOptions, ...options }
    }
    if (events) {
      this.connectionEvents = events
    }
  }

  connect(token?: string): Socket {
    if (this.socket?.connected) {
      return this.socket
    }

    this.socket = io(this.url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      auth: token ? { token } : undefined,
    })

    this.setupEventListeners()
    this.startHeartbeat()

    return this.socket
  }

  private setupEventListeners() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.isConnected = true
      this.missedHeartbeats = 0
      this.connectionEvents.onConnect?.()
      this.startHeartbeat()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.isConnected = false
      this.stopHeartbeat()
      this.connectionEvents.onDisconnect?.(reason)
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
      this.isConnected = true
      this.missedHeartbeats = 0
      this.connectionEvents.onReconnect?.(attemptNumber)
      this.startHeartbeat()
    })

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed')
      this.isConnected = false
      this.connectionEvents.onReconnectFailed?.()
    })

    // Heartbeat handlers
    this.socket.on('pong', () => {
      this.handlePong()
    })

    this.socket.on('heartbeat', () => {
      this.handleHeartbeat()
    })
  }

  private startHeartbeat() {
    this.stopHeartbeat()

    this.heartbeatInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.sendHeartbeat()
        this.startHeartbeatTimeout()
      }
    }, this.heartbeatOptions.interval)
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
    
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  private sendHeartbeat() {
    if (!this.socket?.connected) return

    this.socket.emit('ping', { timestamp: Date.now() })
    this.socket.emit('heartbeat', { timestamp: Date.now() })
  }

  private startHeartbeatTimeout() {
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
    }

    this.heartbeatTimeout = setTimeout(() => {
      this.missedHeartbeats++
      console.warn(`Heartbeat timeout. Missed heartbeats: ${this.missedHeartbeats}`)

      if (this.missedHeartbeats >= this.heartbeatOptions.maxMissedHeartbeats) {
        console.error('Max heartbeat timeouts reached. Connection may be dead.')
        this.connectionEvents.onHeartbeatTimeout?.()
        
        // Force reconnection
        if (this.socket) {
          this.socket.disconnect()
          setTimeout(() => {
            this.socket?.connect()
          }, 1000)
        }
      }
    }, this.heartbeatOptions.timeout)
  }

  private handlePong() {
    this.missedHeartbeats = 0
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
  }

  private handleHeartbeat() {
    this.missedHeartbeats = 0
    if (this.heartbeatTimeout) {
      clearTimeout(this.heartbeatTimeout)
      this.heartbeatTimeout = null
    }
    
    // Send heartbeat acknowledgment
    if (this.socket?.connected) {
      this.socket.emit('heartbeat-ack', { timestamp: Date.now() })
    }
  }

  disconnect() {
    this.stopHeartbeat()
    
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    
    this.isConnected = false
  }

  getSocket(): Socket | null {
    return this.socket
  }

  getConnectionStatus(): boolean {
    return this.isConnected && this.socket?.connected === true
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      this.socket.emit(event, data)
      return true
    }
    return false
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback)
  }

  off(event: string, callback?: (...args: any[]) => void) {
    if (callback) {
      this.socket?.off(event, callback)
    } else {
      this.socket?.off(event)
    }
  }

  once(event: string, callback: (...args: any[]) => void) {
    this.socket?.once(event, callback)
  }
}

// Singleton instance for global use
let globalSocketClient: EnhancedSocketClient | null = null

export function getSocketClient(): EnhancedSocketClient {
  if (!globalSocketClient) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001'
    globalSocketClient = new EnhancedSocketClient(wsUrl)
  }
  return globalSocketClient
}