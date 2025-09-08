import { NextRequest } from 'next/server'
import { WebSocketServer, WebSocket } from 'ws'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'

// Global WebSocket server instance
let wss: WebSocketServer | null = null
let server: any = null

// Connection management
interface WebSocketConnection {
  ws: WebSocket
  userId: string
  sessionId: string
  subscribedProjects: Set<string>
  lastPing: number
}

const connections = new Map<string, WebSocketConnection>()

// Message types
interface WebSocketMessage {
  type: 'subscribe' | 'unsubscribe' | 'sync-trigger' | 'ping' | 'pong'
  projectId?: string
  data?: any
}

interface SyncEvent {
  type: 'sync-started' | 'sync-completed' | 'sync-failed' | 'task-updated' | 'project-updated'
  projectId: string
  timestamp: string
  data?: any
}

// Initialize WebSocket server
function initializeWebSocketServer() {
  if (wss) return wss

  console.log('🔌 Initializing WebSocket server...')
  
  wss = new WebSocketServer({ 
    port: 0, // Let the system assign a port
    perMessageDeflate: false 
  })

  wss.on('connection', async (ws, request) => {
    console.log('📡 New WebSocket connection attempt')
    
    // Extract session token from query or headers
    const url = new URL(request.url!, `http://${request.headers.host}`)
    const token = url.searchParams.get('token') || request.headers.authorization?.replace('Bearer ', '')
    
    if (!token) {
      console.log('❌ WebSocket connection rejected: No authentication token')
      ws.close(1008, 'Authentication required')
      return
    }

    try {
      // Validate session - this is a simplified approach
      // In a production app, you'd properly verify JWT tokens
      const sessionId = generateSessionId()
      const userId = await validateToken(token)
      
      if (!userId) {
        console.log('❌ WebSocket connection rejected: Invalid token')
        ws.close(1008, 'Invalid authentication')
        return
      }

      // Store connection
      const connection: WebSocketConnection = {
        ws,
        userId,
        sessionId,
        subscribedProjects: new Set(),
        lastPing: Date.now()
      }
      
      connections.set(sessionId, connection)
      console.log(`✅ WebSocket connection established for user ${userId} (${connections.size} total connections)`)

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        timestamp: new Date().toISOString()
      }))

      // Handle messages
      ws.on('message', async (data) => {
        try {
          const message: WebSocketMessage = JSON.parse(data.toString())
          await handleMessage(sessionId, message)
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error)
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }))
        }
      })

      // Handle connection close
      ws.on('close', () => {
        console.log(`🔌 WebSocket connection closed for user ${userId}`)
        connections.delete(sessionId)
      })

      // Handle errors
      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
        connections.delete(sessionId)
      })

    } catch (error) {
      console.error('❌ Error setting up WebSocket connection:', error)
      ws.close(1011, 'Internal server error')
    }
  })

  // Heartbeat to detect stale connections
  const heartbeat = setInterval(() => {
    const now = Date.now()
    const staleTimeout = 60000 // 1 minute

    for (const [sessionId, connection] of connections.entries()) {
      if (now - connection.lastPing > staleTimeout) {
        console.log(`🧹 Cleaning up stale connection: ${sessionId}`)
        connection.ws.terminate()
        connections.delete(sessionId)
      } else {
        // Send ping
        if (connection.ws.readyState === WebSocket.OPEN) {
          connection.ws.ping()
        }
      }
    }
  }, 30000) // Check every 30 seconds

  wss.on('close', () => {
    clearInterval(heartbeat)
  })

  console.log(`🚀 WebSocket server initialized with ${connections.size} connections`)
  return wss
}

// Handle incoming messages
async function handleMessage(sessionId: string, message: WebSocketMessage) {
  const connection = connections.get(sessionId)
  if (!connection) return

  console.log(`📨 Received message from ${connection.userId}:`, message.type)

  switch (message.type) {
    case 'subscribe':
      if (message.projectId) {
        // Verify user has access to project
        const hasAccess = await verifyProjectAccess(connection.userId, message.projectId)
        if (hasAccess) {
          connection.subscribedProjects.add(message.projectId)
          connection.ws.send(JSON.stringify({
            type: 'subscribed',
            projectId: message.projectId,
            timestamp: new Date().toISOString()
          }))
          console.log(`📡 User ${connection.userId} subscribed to project ${message.projectId}`)
        } else {
          connection.ws.send(JSON.stringify({
            type: 'error',
            error: 'Access denied to project'
          }))
        }
      }
      break

    case 'unsubscribe':
      if (message.projectId) {
        connection.subscribedProjects.delete(message.projectId)
        connection.ws.send(JSON.stringify({
          type: 'unsubscribed',
          projectId: message.projectId,
          timestamp: new Date().toISOString()
        }))
        console.log(`📡 User ${connection.userId} unsubscribed from project ${message.projectId}`)
      }
      break

    case 'sync-trigger':
      if (message.projectId) {
        // Trigger sync for project
        await triggerProjectSync(message.projectId, connection.userId)
      }
      break

    case 'ping':
      connection.lastPing = Date.now()
      connection.ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString()
      }))
      break
  }
}

// Broadcast sync events to subscribed clients
export function broadcastSyncEvent(event: SyncEvent) {
  console.log(`📡 Broadcasting sync event: ${event.type} for project ${event.projectId}`)
  
  for (const connection of connections.values()) {
    if (connection.subscribedProjects.has(event.projectId) && 
        connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify({
        channel: 'sync-event',
        ...event
      }))
    }
  }
}

// Utility functions
function generateSessionId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

async function validateToken(token: string): Promise<string | null> {
  // This is a simplified token validation
  // In production, you'd properly validate JWT tokens
  try {
    // For now, we'll assume the token is the user's session token
    // You'd integrate with NextAuth's session validation here
    return token // Return user ID if valid
  } catch {
    return null
  }
}

async function verifyProjectAccess(userId: string, projectId: string): Promise<boolean> {
  try {
    const projectAccess = await prisma.projectMember.findFirst({
      where: {
        userId,
        projectId,
      },
    })
    
    return !!projectAccess
  } catch (error) {
    console.error('Error verifying project access:', error)
    return false
  }
}

async function triggerProjectSync(projectId: string, userId: string) {
  console.log(`🔄 Triggering sync for project ${projectId} by user ${userId}`)
  
  // Broadcast sync started event
  broadcastSyncEvent({
    type: 'sync-started',
    projectId,
    timestamp: new Date().toISOString(),
    data: { initiatedBy: userId }
  })

  // Here you would implement actual sync logic
  // For now, we'll simulate it
  setTimeout(() => {
    broadcastSyncEvent({
      type: 'sync-completed',
      projectId,
      timestamp: new Date().toISOString(),
      data: { success: true }
    })
  }, 2000)
}

// HTTP handler for regular requests
export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade')
  const connection = request.headers.get('connection')
  
  if (upgrade === 'websocket' && connection?.toLowerCase().includes('upgrade')) {
    // Initialize WebSocket server if not already done
    initializeWebSocketServer()
    
    return new Response('WebSocket Upgrade', {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    })
  }

  // Regular HTTP request - return status
  return Response.json({
    message: 'WebSocket endpoint active',
    status: 'WebSocket server running',
    connections: connections.size,
    timestamp: new Date().toISOString(),
    info: 'Connect using WebSocket protocol with authentication token'
  })
}

// Export for use in other parts of the application
export { connections, broadcastSyncEvent }