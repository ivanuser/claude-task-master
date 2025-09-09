'use client'

import { useEffect, useState } from 'react'

export default function TestSSE() {
  const [status, setStatus] = useState('Disconnected')
  const [messages, setMessages] = useState<string[]>([])

  useEffect(() => {
    const eventSource = new EventSource('/api/sse')
    
    eventSource.onopen = () => {
      console.log('SSE opened')
      setStatus('Connected (onopen)')
    }
    
    eventSource.onmessage = (event) => {
      console.log('SSE message:', event.data)
      const data = JSON.parse(event.data)
      setMessages(prev => [...prev, `${data.type}: ${JSON.stringify(data)}`].slice(-10))
      
      if (data.type === 'connected') {
        setStatus('Connected (received connected message)')
      } else if (data.type === 'ping') {
        setStatus('Connected (receiving pings)')
      }
    }
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      setStatus('Error/Reconnecting')
    }
    
    return () => {
      eventSource.close()
    }
  }, [])
  
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">SSE Connection Test</h1>
      <p className="mb-4">Status: <span className="font-mono">{status}</span></p>
      <div className="border p-4 rounded">
        <h2 className="font-bold mb-2">Recent Messages:</h2>
        {messages.map((msg, i) => (
          <div key={i} className="font-mono text-sm">{msg}</div>
        ))}
      </div>
    </div>
  )
}