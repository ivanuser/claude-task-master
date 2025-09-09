import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/database'
import { getFileWatcher, type TaskChangeEvent } from '@/lib/services/file-watcher'

// Store active SSE connections
interface SSEConnection {
  controller: ReadableStreamDefaultController
  userId: string
  sessionId: string
  subscribedProjects: Set<string>
  lastPing: number
}

const connections = new Map<string, SSEConnection>()

// Server-Sent Events endpoint
export async function GET(request: NextRequest) {
  console.log('🔌 New SSE connection attempt')

  // Get session to authenticate the user
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  const userId = session.user.id
  const sessionId = `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  
  console.log(`✅ SSE connection established for user ${userId}`)

  // Create a readable stream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      const connection: SSEConnection = {
        controller,
        userId,
        sessionId,
        subscribedProjects: new Set(),
        lastPing: Date.now()
      }
      
      connections.set(sessionId, connection)
      console.log(`📡 SSE connection stored (${connections.size} total connections)`)

      // Send initial connection message
      const welcomeData = {
        type: 'connected',
        sessionId,
        timestamp: new Date().toISOString(),
        message: 'SSE connection established'
      }
      
      controller.enqueue(`data: ${JSON.stringify(welcomeData)}\n\n`)

      // Send periodic ping to keep connection alive
      const pingInterval = setInterval(() => {
        if (connections.has(sessionId)) {
          const pingData = {
            type: 'ping',
            timestamp: new Date().toISOString()
          }
          
          try {
            controller.enqueue(`data: ${JSON.stringify(pingData)}\n\n`)
            connection.lastPing = Date.now()
          } catch (error) {
            console.log(`🧹 Removing stale SSE connection: ${sessionId}`)
            clearInterval(pingInterval)
            connections.delete(sessionId)
          }
        } else {
          clearInterval(pingInterval)
        }
      }, 30000) // Ping every 30 seconds
    },
    
    cancel() {
      console.log(`🔌 SSE connection closed for user ${userId}`)
      connections.delete(sessionId)
    }
  })

  // Return SSE response with proper headers
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}

// Broadcast events to subscribed clients
export function broadcastSSEEvent(event: {
  type: string
  projectId?: string
  data?: any
  timestamp?: string
}) {
  const eventData = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString()
  }

  console.log(`📡 Broadcasting SSE event: ${event.type} for project ${event.projectId}`)
  
  let broadcastCount = 0
  
  for (const [sessionId, connection] of connections.entries()) {
    // If projectId is specified, only send to subscribers of that project
    if (event.projectId && !connection.subscribedProjects.has(event.projectId)) {
      continue
    }
    
    try {
      connection.controller.enqueue(`data: ${JSON.stringify(eventData)}\n\n`)
      broadcastCount++
    } catch (error) {
      console.log(`🧹 Removing failed SSE connection: ${sessionId}`)
      connections.delete(sessionId)
    }
  }
  
  console.log(`📡 Broadcasted to ${broadcastCount} SSE connections`)
}

// Subscribe a user to project updates
export function subscribeToProject(userId: string, projectId: string) {
  for (const connection of connections.values()) {
    if (connection.userId === userId) {
      connection.subscribedProjects.add(projectId)
      
      // Send subscription confirmation
      const confirmData = {
        type: 'subscribed',
        projectId,
        timestamp: new Date().toISOString()
      }
      
      try {
        connection.controller.enqueue(`data: ${JSON.stringify(confirmData)}\n\n`)
      } catch (error) {
        // Connection might be closed, will be cleaned up later
      }
      
      console.log(`📡 User ${userId} subscribed to project ${projectId}`)
    }
  }
}

// Unsubscribe a user from project updates
export function unsubscribeFromProject(userId: string, projectId: string) {
  for (const connection of connections.values()) {
    if (connection.userId === userId) {
      connection.subscribedProjects.delete(projectId)
      
      // Send unsubscription confirmation
      const confirmData = {
        type: 'unsubscribed',
        projectId,
        timestamp: new Date().toISOString()
      }
      
      try {
        connection.controller.enqueue(`data: ${JSON.stringify(confirmData)}\n\n`)
      } catch (error) {
        // Connection might be closed, will be cleaned up later
      }
      
      console.log(`📡 User ${userId} unsubscribed from project ${projectId}`)
    }
  }
}

// Get connection stats
export function getSSEStats() {
  return {
    totalConnections: connections.size,
    connections: Array.from(connections.entries()).map(([sessionId, conn]) => ({
      sessionId,
      userId: conn.userId,
      subscribedProjects: Array.from(conn.subscribedProjects),
      lastPing: conn.lastPing
    }))
  }
}

// Cleanup stale connections
setInterval(() => {
  const now = Date.now()
  const staleTimeout = 120000 // 2 minutes
  
  for (const [sessionId, connection] of connections.entries()) {
    if (now - connection.lastPing > staleTimeout) {
      console.log(`🧹 Cleaning up stale SSE connection: ${sessionId}`)
      try {
        connection.controller.close()
      } catch (error) {
        // Connection might already be closed
      }
      connections.delete(sessionId)
    }
  }
}, 60000) // Check every minute

// Export for use in other parts of the application
export { connections, broadcastSSEEvent as broadcastSyncEvent }