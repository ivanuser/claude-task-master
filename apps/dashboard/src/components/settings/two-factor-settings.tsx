'use client'

import { useState, useEffect } from 'react'
import { Shield, Smartphone, Key, AlertTriangle, Check, X, Copy, RefreshCw, Download } from 'lucide-react'
import { toast } from 'sonner'

interface TwoFactorStatus {
  enabled: boolean
  configured: boolean
  verifiedAt?: string
  preferredMethod?: string
  backupCodesRemaining?: number
  trustedDeviceCount?: number
  lastUsedAt?: string
}

interface SetupData {
  qrCode: string
  secret: string
  backupCodes: string[]
}

export default function TwoFactorSettings() {
  const [status, setStatus] = useState<TwoFactorStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [setupStep, setSetupStep] = useState<'idle' | 'setup' | 'verify' | 'complete'>('idle')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [trustDevice, setTrustDevice] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [showDisableConfirm, setShowDisableConfirm] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  useEffect(() => {
    fetchStatus()
  }, [])

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/user/two-factor/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
        if (data.configured) {
          setSetupStep('complete')
        }
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error)
      toast.error('Failed to load 2FA status')
    } finally {
      setLoading(false)
    }
  }

  const handleSetup = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/two-factor/setup', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSetupData(data)
        setSetupStep('setup')
        toast.success('2FA setup initiated')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to setup 2FA')
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toast.error('Failed to setup 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a 6-digit verification code')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/two-factor/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationCode,
          trustDevice,
          deviceId: trustDevice ? generateDeviceId() : undefined,
        }),
      })

      if (response.ok) {
        setSetupStep('complete')
        setShowBackupCodes(true)
        toast.success('Two-factor authentication enabled successfully!')
        await fetchStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Invalid verification code')
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast.error('Failed to verify 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!disablePassword) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/user/two-factor/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: disablePassword }),
      })

      if (response.ok) {
        setStatus({ enabled: false, configured: false })
        setSetupStep('idle')
        setShowDisableConfirm(false)
        setDisablePassword('')
        toast.success('Two-factor authentication disabled')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to disable 2FA')
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toast.error('Failed to disable 2FA')
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateBackupCodes = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/user/two-factor/backup-codes', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        setSetupData(prev => prev ? { ...prev, backupCodes: data.backupCodes } : null)
        setShowBackupCodes(true)
        toast.success('Backup codes regenerated')
        await fetchStatus()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to regenerate backup codes')
      }
    } catch (error) {
      console.error('Error regenerating backup codes:', error)
      toast.error('Failed to regenerate backup codes')
    } finally {
      setLoading(false)
    }
  }

  const generateDeviceId = () => {
    return `device_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Failed to copy')
    }
  }

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return

    const content = `Task Master - Two-Factor Authentication Backup Codes
Generated: ${new Date().toLocaleString()}

IMPORTANT: Keep these codes in a safe place.
Each code can only be used once.

${setupData.backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

Use these codes to access your account if you lose your authenticator device.`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'taskmaster-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Backup codes downloaded')
  }

  if (loading && !status) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Two-Factor Authentication</h3>
        <p className="text-sm text-gray-500 mt-1">
          Add an extra layer of security to your account using a mobile authenticator app
        </p>
      </div>

      {/* Status Card */}
      {status?.configured && setupStep === 'complete' && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-start space-x-4">
            <div className={`p-3 rounded-lg ${status.enabled ? 'bg-green-100' : 'bg-yellow-100'}`}>
              <Shield className={`h-6 w-6 ${status.enabled ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
            <div className="flex-1">
              <h4 className="font-medium">
                {status.enabled ? '2FA is Active' : '2FA is Configured but Disabled'}
              </h4>
              <p className="text-sm text-gray-500 mt-1">
                {status.enabled 
                  ? 'Your account is protected with two-factor authentication'
                  : 'Two-factor authentication is configured but currently disabled'}
              </p>
              
              {status.enabled && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Backup codes remaining:</span>
                    <span className="font-medium">{status.backupCodesRemaining || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Trusted devices:</span>
                    <span className="font-medium">{status.trustedDeviceCount || 0}</span>
                  </div>
                  {status.lastUsedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last used:</span>
                      <span className="font-medium">
                        {new Date(status.lastUsedAt).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                {status.enabled && (
                  <>
                    <button
                      onClick={handleRegenerateBackupCodes}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4 inline mr-2" />
                      New Backup Codes
                    </button>
                    <button
                      onClick={() => setShowDisableConfirm(true)}
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50"
                    >
                      Disable 2FA
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Setup Flow */}
      {setupStep === 'idle' && !status?.configured && (
        <div className="bg-white p-6 rounded-lg border">
          <div className="text-center">
            <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="font-medium mb-2">Secure Your Account</h4>
            <p className="text-sm text-gray-500 mb-6">
              Two-factor authentication adds an extra layer of security to your account
            </p>
            <button
              onClick={handleSetup}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              Enable Two-Factor Authentication
            </button>
          </div>
        </div>
      )}

      {/* QR Code Setup */}
      {setupStep === 'setup' && setupData && (
        <div className="bg-white p-6 rounded-lg border">
          <h4 className="font-medium mb-4">Step 1: Scan QR Code</h4>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
              </p>
              <div className="bg-white p-4 border rounded-lg inline-block">
                <img src={setupData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Or enter this secret key manually:
              </p>
              <div className="bg-gray-50 p-3 rounded-lg font-mono text-sm break-all">
                {setupData.secret}
              </div>
              <button
                onClick={() => copyToClipboard(setupData.secret)}
                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Copy className="h-4 w-4 inline mr-1" />
                Copy Secret Key
              </button>

              <div className="mt-6">
                <label className="block text-sm font-medium mb-2">
                  Enter Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full px-3 py-2 border rounded-lg text-center font-mono text-lg"
                  maxLength={6}
                />
                
                <label className="flex items-center mt-3">
                  <input
                    type="checkbox"
                    checked={trustDevice}
                    onChange={(e) => setTrustDevice(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm">Trust this device for 30 days</span>
                </label>

                <button
                  onClick={handleVerify}
                  disabled={loading || verificationCode.length !== 6}
                  className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  Verify and Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Display */}
      {showBackupCodes && setupData?.backupCodes && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-yellow-900">Save Your Backup Codes</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Store these codes in a safe place. You can use them to access your account if you lose your authenticator device.
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-4 bg-white p-4 rounded-lg border border-yellow-200">
                {setupData.backupCodes.map((code, i) => (
                  <div key={i} className="font-mono text-sm">
                    {i + 1}. {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => copyToClipboard(setupData.backupCodes.join('\n'))}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200"
                >
                  <Copy className="h-4 w-4 inline mr-2" />
                  Copy All
                </button>
                <button
                  onClick={downloadBackupCodes}
                  className="px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-100 rounded-lg hover:bg-yellow-200"
                >
                  <Download className="h-4 w-4 inline mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setShowBackupCodes(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 bg-white rounded-lg hover:bg-gray-50 border"
                >
                  I've Saved Them
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Disable Confirmation */}
      {showDisableConfirm && (
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
          <h4 className="font-medium text-red-900 mb-2">Disable Two-Factor Authentication?</h4>
          <p className="text-sm text-red-700 mb-4">
            This will make your account less secure. You'll need to enter your password to confirm.
          </p>
          
          <input
            type="password"
            value={disablePassword}
            onChange={(e) => setDisablePassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full px-3 py-2 border rounded-lg mb-4"
          />

          <div className="flex gap-3">
            <button
              onClick={handleDisable}
              disabled={loading || !disablePassword}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              Disable 2FA
            </button>
            <button
              onClick={() => {
                setShowDisableConfirm(false)
                setDisablePassword('')
              }}
              className="px-4 py-2 bg-white text-gray-600 rounded-lg hover:bg-gray-50 border"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}