'use client';

import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function ForceLogoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cookies, setCookies] = useState<string[]>([]);
  const [clearing, setClearing] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Get all cookies
    const allCookies = document.cookie.split(';').map(c => c.trim());
    setCookies(allCookies);
  }, []);

  const handleForceLogout = async () => {
    setClearing(true);
    setStep(1);
    
    try {
      // Step 1: NextAuth signOut
      setStep(2);
      await signOut({ redirect: false });
      
      // Step 2: Clear localStorage and sessionStorage
      setStep(3);
      localStorage.clear();
      sessionStorage.clear();
      
      // Step 3: Force clear all cookies via API
      setStep(4);
      await fetch('/api/auth/force-logout', { method: 'POST' });
      
      // Step 4: Manual cookie clearing
      setStep(5);
      const cookieNames = [
        'next-auth.session-token',
        'next-auth.csrf-token',
        'next-auth.callback-url',
        '__Secure-next-auth.session-token',
        '__Secure-next-auth.csrf-token',
        '__Host-next-auth.csrf-token'
      ];
      
      cookieNames.forEach(name => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/api/auth;`;
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.honercloud.com;`;
      });
      
      setStep(6);
      
      // Step 5: Hard refresh the page
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      
    } catch (error) {
      console.error('Force logout error:', error);
      setStep(0);
    }
  };

  const stepMessages = [
    'Ready to force logout',
    'Starting force logout...',
    'Calling NextAuth signOut...',
    'Clearing browser storage...',
    'Clearing server cookies...',
    'Manually deleting cookies...',
    'Complete! Redirecting...'
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow p-6 max-w-2xl w-full">
        <h1 className="text-2xl font-bold mb-6 text-red-600">🚨 Force Logout Debug Tool</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="font-bold mb-2">Current Session Status:</h2>
            <div className="bg-gray-100 p-3 rounded">
              <p><strong>Status:</strong> {status}</p>
              {session && (
                <div className="mt-2">
                  <strong>Session Data:</strong>
                  <pre className="text-xs mt-1 bg-yellow-50 p-2 rounded overflow-auto">
                    {JSON.stringify(session, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="font-bold mb-2">Current Cookies:</h2>
            <div className="bg-gray-100 p-3 rounded max-h-40 overflow-auto">
              {cookies.length > 0 ? (
                <ul className="text-sm space-y-1">
                  {cookies.map((cookie, i) => (
                    <li key={i} className="font-mono">{cookie}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500">No cookies found</p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-bold text-yellow-800 mb-2">⚠️ What this will do:</h3>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>1. Call NextAuth signOut()</li>
              <li>2. Clear all localStorage and sessionStorage</li>
              <li>3. Delete all authentication cookies via API</li>
              <li>4. Manually delete cookies with JavaScript</li>
              <li>5. Hard redirect to homepage</li>
            </ul>
          </div>

          {clearing ? (
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent mr-3"></div>
                <span className="text-blue-800">{stepMessages[step]}</span>
              </div>
            </div>
          ) : (
            <button
              onClick={handleForceLogout}
              className="w-full bg-red-600 text-white py-3 px-4 rounded font-bold hover:bg-red-700"
            >
              🚨 FORCE LOGOUT NOW
            </button>
          )}
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700"
          >
            Cancel - Go Home
          </button>
        </div>
      </div>
    </div>
  );
}