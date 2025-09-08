import { NextRequest } from 'next/server'
import { broadcastSSEEvent } from '../route'

// Test endpoint to broadcast SSE events
export async function POST(request: NextRequest) {
  try {
    const { type, projectId, data } = await request.json()
    
    // Broadcast the test event
    broadcastSSEEvent({
      type: type || 'test-event',
      projectId,
      data: data || { message: 'This is a test SSE event!', timestamp: new Date().toISOString() }
    })
    
    return Response.json({ 
      success: true, 
      message: 'Test event broadcasted',
      event: { type, projectId, data }
    })
  } catch (error) {
    console.error('Error broadcasting test event:', error)
    return Response.json({ 
      success: false, 
      error: 'Failed to broadcast test event' 
    }, { status: 500 })
  }
}

export async function GET() {
  return Response.json({
    message: 'SSE Test Endpoint',
    usage: 'POST to this endpoint with { type, projectId?, data? } to broadcast test events',
    example: {
      type: 'test-event',
      projectId: 'optional-project-id',
      data: { message: 'Hello World!' }
    }
  })
}