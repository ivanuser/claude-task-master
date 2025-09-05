'use client'

import React, { useState } from 'react'
import { Shield, Smartphone, Key, Clock, Globe, Monitor, Trash2, CheckCircle, AlertTriangle, QrCode } from 'lucide-react'

interface Session {
  id: string
  device: string
  browser: string
  location: string
  ipAddress: string
  lastActive: string
  isCurrent: boolean
}

interface LoginAttempt {
  id: string
  timestamp: string
  location: string
  ipAddress: string
  success: boolean
  userAgent: string
}

const mockSessions: Session[] = [
  {
    id: '1',
    device: 'MacBook Pro',
    browser: 'Chrome 120',
    location: 'San Francisco, CA',
    ipAddress: '192.168.1.100',
    lastActive: '2024-01-20T14:30:00Z',
    isCurrent: true,
  },
  {
    id: '2',
    device: 'iPhone 15',
    browser: 'Safari Mobile',
    location: 'San Francisco, CA',
    ipAddress: '192.168.1.101',
    lastActive: '2024-01-20T10:15:00Z',
    isCurrent: false,
  },
  {
    id: '3',
    device: 'Windows PC',
    browser: 'Firefox 121',
    location: 'New York, NY',
    ipAddress: '203.0.113.45',
    lastActive: '2024-01-19T16:45:00Z',
    isCurrent: false,
  },
]

const mockLoginAttempts: LoginAttempt[] = [
  {
    id: '1',
    timestamp: '2024-01-20T14:30:00Z',
    location: 'San Francisco, CA',
    ipAddress: '192.168.1.100',
    success: true,
    userAgent: 'Chrome 120 on macOS',
  },
  {
    id: '2',
    timestamp: '2024-01-20T10:15:00Z',
    location: 'San Francisco, CA',
    ipAddress: '192.168.1.101',
    success: true,
    userAgent: 'Safari Mobile on iOS',
  },
  {
    id: '3',
    timestamp: '2024-01-19T23:22:00Z',
    location: 'Unknown',
    ipAddress: '198.51.100.42',
    success: false,
    userAgent: 'Chrome 119 on Windows',
  },
]

export function SecuritySection() {
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [sessions, setSessions] = useState(mockSessions)
  const [loginHistory] = useState(mockLoginAttempts)
  const [loading, setLoading] = useState<string | null>(null)

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const generateBackupCodes = () => {
    const codes = []
    for (let i = 0; i < 8; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase()
      codes.push(code)
    }
    return codes
  }

  const handleEnable2FA = async () => {
    setLoading('2fa-enable')
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setShowQRCode(true)
      setBackupCodes(generateBackupCodes())
      console.log('2FA setup initiated')
    } catch (error) {
      console.error('Failed to setup 2FA:', error)
      alert('Failed to setup two-factor authentication')
    } finally {
      setLoading(null)
    }
  }

  const handleConfirm2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert('Please enter a valid 6-digit code')
      return
    }

    setLoading('2fa-confirm')
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTwoFactorEnabled(true)
      setShowQRCode(false)
      setVerificationCode('')
      console.log('2FA enabled successfully')
    } catch (error) {
      console.error('Failed to confirm 2FA:', error)
      alert('Failed to confirm two-factor authentication')
    } finally {
      setLoading(null)
    }
  }

  const handleDisable2FA = async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    setLoading('2fa-disable')
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setTwoFactorEnabled(false)
      setBackupCodes([])
      console.log('2FA disabled')
    } catch (error) {
      console.error('Failed to disable 2FA:', error)
      alert('Failed to disable two-factor authentication')
    } finally {
      setLoading(null)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) {
      return
    }

    setLoading(`session-${sessionId}`)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      console.log('Session revoked:', sessionId)
    } catch (error) {
      console.error('Failed to revoke session:', error)
      alert('Failed to revoke session')
    } finally {
      setLoading(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (!confirm('Are you sure you want to sign out of all other devices? You will need to sign in again on those devices.')) {
      return
    }

    setLoading('revoke-all')
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSessions(prev => prev.filter(s => s.isCurrent))
      console.log('All other sessions revoked')
    } catch (error) {
      console.error('Failed to revoke sessions:', error)
      alert('Failed to revoke sessions')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900">Security Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Manage your account security, two-factor authentication, and active sessions.
        </p>
      </div>

      <div className="space-y-8">
        {/* Two-Factor Authentication */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
          </div>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-700">
                {twoFactorEnabled 
                  ? 'Two-factor authentication is enabled and protecting your account.' 
                  : 'Add an extra layer of security to your account with two-factor authentication.'
                }
              </p>
              {twoFactorEnabled && (
                <div className="flex items-center mt-2 text-sm text-green-700">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Protected with authenticator app
                </div>
              )}
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
            }`}>
              {twoFactorEnabled ? 'Enabled' : 'Disabled'}
            </div>
          </div>

          {!twoFactorEnabled && !showQRCode && (
            <button
              onClick={handleEnable2FA}
              disabled={loading === '2fa-enable'}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === '2fa-enable' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Enable 2FA
                </>
              )}
            </button>
          )}

          {showQRCode && (
            <div className="border border-gray-200 rounded-lg p-6 bg-white">
              <h4 className="font-medium text-gray-900 mb-4">Set up your authenticator app</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-4">
                    1. Install an authenticator app like Google Authenticator or Authy<br/>
                    2. Scan this QR code with your app<br/>
                    3. Enter the 6-digit code below
                  </p>
                  
                  <div className="bg-gray-100 p-4 rounded-lg text-center mb-4">
                    <QrCode className="w-32 h-32 mx-auto text-gray-400" />
                    <p className="text-xs text-gray-500 mt-2">QR Code for authentication setup</p>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="000000"
                    maxLength={6}
                  />
                  
                  <div className="flex space-x-3 mt-4">
                    <button
                      onClick={() => {
                        setShowQRCode(false)
                        setVerificationCode('')
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirm2FA}
                      disabled={loading === '2fa-confirm' || verificationCode.length !== 6}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading === '2fa-confirm' ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                      ) : (
                        'Verify & Enable'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {twoFactorEnabled && (
            <div>
              {backupCodes.length > 0 && (
                <div className="border border-yellow-200 rounded-lg p-4 bg-yellow-50 mb-4">
                  <div className="flex items-center mb-2">
                    <Key className="w-4 h-4 text-yellow-600 mr-2" />
                    <h4 className="font-medium text-yellow-800">Backup Codes</h4>
                  </div>
                  <p className="text-sm text-yellow-700 mb-3">
                    Save these backup codes in a safe place. You can use them to access your account if you lose your phone.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {backupCodes.map((code, index) => (
                      <code key={index} className="bg-white p-2 rounded text-center text-sm font-mono">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={handleDisable2FA}
                disabled={loading === '2fa-disable'}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === '2fa-disable' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Disabling...
                  </>
                ) : (
                  'Disable 2FA'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Active Sessions */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Monitor className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Active Sessions</h3>
            </div>
            {sessions.filter(s => !s.isCurrent).length > 0 && (
              <button
                onClick={handleRevokeAllSessions}
                disabled={loading === 'revoke-all'}
                className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === 'revoke-all' ? 'Revoking...' : 'Sign out all devices'}
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`bg-white border rounded-lg p-4 ${
                  session.isCurrent ? 'border-green-200 bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <Monitor className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="font-medium text-gray-900">{session.device}</span>
                      {session.isCurrent && (
                        <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                          Current session
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>{session.browser}</p>
                      <div className="flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        <span>{session.location} • {session.ipAddress}</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>Last active: {formatDate(session.lastActive)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {!session.isCurrent && (
                    <button
                      onClick={() => handleRevokeSession(session.id)}
                      disabled={loading === `session-${session.id}`}
                      className="ml-4 p-2 text-red-400 hover:text-red-600 disabled:opacity-50"
                      title="Sign out this device"
                    >
                      {loading === `session-${session.id}` ? (
                        <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Login History */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Clock className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Recent Login Activity</h3>
          </div>
          
          <div className="space-y-3">
            {loginHistory.map((attempt) => (
              <div key={attempt.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    {attempt.success ? (
                      <CheckCircle className="w-4 h-4 text-green-600 mr-3" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-red-600 mr-3" />
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {attempt.success ? 'Successful login' : 'Failed login attempt'}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatDate(attempt.timestamp)} • {attempt.location} • {attempt.ipAddress}
                      </div>
                      <div className="text-xs text-gray-500">{attempt.userAgent}</div>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    attempt.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {attempt.success ? 'Success' : 'Failed'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}