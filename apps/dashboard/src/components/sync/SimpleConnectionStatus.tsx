'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle } from 'lucide-react';

export function SimpleConnectionStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [lastPing, setLastPing] = useState<Date | null>(null);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pingTimeout: NodeJS.Timeout | null = null;

    const connect = () => {
      try {
        eventSource = new EventSource('/api/sse');
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connected' || data.type === 'ping') {
              setStatus('connected');
              setLastPing(new Date());
              
              // Reset ping timeout
              if (pingTimeout) clearTimeout(pingTimeout);
              pingTimeout = setTimeout(() => {
                setStatus('error');
              }, 60000); // Consider disconnected if no ping for 60 seconds
            }
          } catch (e) {
            console.error('SSE parse error:', e);
          }
        };
        
        eventSource.onerror = () => {
          setStatus('error');
          // Browser will auto-reconnect
        };
      } catch (error) {
        console.error('SSE connection error:', error);
        setStatus('error');
      }
    };
    
    connect();
    
    return () => {
      if (pingTimeout) clearTimeout(pingTimeout);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  return (
    <div className="flex items-center space-x-2 text-sm">
      {status === 'connected' ? (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-green-600">Real-time sync active</span>
        </>
      ) : status === 'error' ? (
        <>
          <AlertCircle className="w-4 h-4 text-yellow-500" />
          <span className="text-yellow-600">Reconnecting...</span>
        </>
      ) : (
        <>
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Connecting...</span>
        </>
      )}
    </div>
  );
}