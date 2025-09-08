'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, XCircle, AlertCircle, Mail } from 'lucide-react'

export default function UnsubscribePage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'invalid'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('invalid')
      setMessage('Invalid unsubscribe link. Please check your email for the correct link.')
      return
    }

    // Process unsubscribe
    handleUnsubscribe(token)
  }, [token])

  const handleUnsubscribe = async (unsubscribeToken: string) => {
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: unsubscribeToken }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage('You have been successfully unsubscribed from email notifications.')
      } else {
        const data = await response.json()
        setStatus('error')
        setMessage(data.error || 'Failed to unsubscribe. Please try again.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred while processing your request.')
    }
  }

  const handleResubscribe = async () => {
    setStatus('loading')
    try {
      const response = await fetch('/api/user/email-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailDigest: 'DAILY',
          taskAssigned: true,
          taskUpdated: true,
          taskComment: true,
          taskDue: true,
          teamUpdates: true,
          weeklyReport: true,
        }),
      })

      if (response.ok) {
        setStatus('success')
        setMessage('You have been successfully resubscribed to email notifications.')
      } else {
        setStatus('error')
        setMessage('Failed to resubscribe. Please try again.')
      }
    } catch (error) {
      setStatus('error')
      setMessage('An error occurred while processing your request.')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Mail className="w-12 h-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Email Preferences
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {status === 'loading' && (
            <div className="text-center">
              <div className="inline-flex items-center">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                <span className="text-gray-600">Processing your request...</span>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{message}</p>
              
              {message.includes('unsubscribed') && (
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Changed your mind? You can resubscribe anytime.
                  </p>
                  <button
                    onClick={handleResubscribe}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Resubscribe to Emails
                  </button>
                </div>
              )}
              
              <Link
                href="/dashboard/settings"
                className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
              >
                Manage email preferences →
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Oops!</h3>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => token && handleUnsubscribe(token)}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
                
                <Link
                  href="/dashboard/settings"
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go to Settings
                </Link>
              </div>
            </div>
          )}

          {status === 'invalid' && (
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Invalid Link</h3>
              <p className="text-gray-600 mb-6">{message}</p>
              
              <Link
                href="/dashboard/settings"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Manage Preferences in Settings
              </Link>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:support@taskmaster.dev" className="text-blue-600 hover:text-blue-500">
                support@taskmaster.dev
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}