'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function ClearSessionPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearAll = async () => {
    setClearing(true);
    try {
      // Clear NextAuth session
      await signOut({ redirect: false });
      
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Force clear cookies by calling our API
      await fetch('/api/debug/force-signout', { method: 'POST' });
      
      setCleared(true);
      
      // Redirect to home after a delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error clearing session:', error);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-6 max-w-md w-full">
        <h1 className="text-xl font-bold mb-4">Clear Session Debug Page</h1>
        
        <div className="space-y-4">
          <div>
            <strong>Session Status:</strong> {status}
          </div>
          
          {session && (
            <div className="bg-yellow-50 p-3 rounded">
              <strong>Current Session:</strong>
              <pre className="text-sm mt-2">{JSON.stringify(session, null, 2)}</pre>
            </div>
          )}
          
          {cleared ? (
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <p className="text-green-800">✅ Session cleared successfully! Redirecting...</p>
            </div>
          ) : (
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:opacity-50"
            >
              {clearing ? 'Clearing...' : 'Clear All Session Data'}
            </button>
          )}
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
          >
            Go to Home Page
          </button>
        </div>
      </div>
    </div>
  );
}