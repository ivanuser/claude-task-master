'use client'

import React, { useState, useEffect } from 'react'
import { Bell, Mail, Smartphone, Clock, Save, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { NotificationPreferences } from '@/types/team'
import { useNotifications } from '@/hooks/useNotifications'
import { pushNotifications } from '@/lib/push-notifications'

export function NotificationPreferencesSection() {
  const { preferences, updatePreferences } = useNotifications({ initialLoad: false })
  const [formData, setFormData] = useState<NotificationPreferences>({
    taskAssigned: true,
    taskUpdated: true,
    taskComment: true,
    taskDue: true,
    teamUpdates: true,
    weeklyReport: true,
    emailDigest: 'daily',
    pushEnabled: true,
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'America/Los_Angeles',
    }
  })
  const [loading, setLoading] = useState(false)
  const [pushStatus, setPushStatus] = useState<{
    supported: boolean;
    permission: NotificationPermission;
    subscribed: boolean;
    checking: boolean;
  }>({
    supported: false,
    permission: 'default',
    subscribed: false,
    checking: true
  })
  const [pushError, setPushError] = useState<string | null>(null)

  useEffect(() => {
    if (preferences) {
      setFormData(preferences)
    }
  }, [preferences])

  // Check push notification status on mount
  useEffect(() => {
    checkPushStatus()
  }, [])

  const checkPushStatus = async () => {
    setPushStatus(prev => ({ ...prev, checking: true }))
    setPushError(null)

    try {
      const supported = pushNotifications.isSupported()
      const permission = pushNotifications.getPermissionStatus()
      
      if (supported) {
        const { subscribed } = await pushNotifications.checkSubscription()
        setPushStatus({
          supported,
          permission,
          subscribed,
          checking: false
        })
      } else {
        setPushStatus({
          supported: false,
          permission: 'denied',
          subscribed: false,
          checking: false
        })
      }
    } catch (error) {
      console.error('Error checking push status:', error)
      setPushStatus(prev => ({ ...prev, checking: false }))
    }
  }

  const handlePushToggle = async (enabled: boolean) => {
    setPushError(null)
    
    if (!pushStatus.supported) {
      setPushError('Push notifications are not supported in your browser')
      return
    }

    try {
      if (enabled) {
        // Request permission if needed
        if (pushStatus.permission === 'default') {
          const permission = await pushNotifications.requestPermission()
          setPushStatus(prev => ({ ...prev, permission }))
          
          if (permission === 'denied') {
            setPushError('Push notification permission was denied')
            handleFieldChange('pushEnabled', false)
            return
          }
        } else if (pushStatus.permission === 'denied') {
          setPushError('Push notifications are blocked. Please enable them in your browser settings.')
          handleFieldChange('pushEnabled', false)
          return
        }

        // Subscribe to push notifications
        await pushNotifications.initialize()
        await pushNotifications.subscribe()
        
        // Save subscription to server
        const saved = await pushNotifications.saveSubscription([
          'tasks',
          'comments',
          'updates',
          'reminders'
        ])
        
        if (saved) {
          setPushStatus(prev => ({ ...prev, subscribed: true }))
          handleFieldChange('pushEnabled', true)
          
          // Send test notification
          await pushNotifications.sendTestNotification(
            'Push Notifications Enabled',
            'You will now receive Task Master notifications!',
            {
              icon: '/icon-192x192.png',
              badge: '/icon-72x72.png',
              url: '/settings'
            }
          )
        } else {
          throw new Error('Failed to save subscription')
        }
      } else {
        // Unsubscribe from push notifications
        const unsubscribed = await pushNotifications.unsubscribe()
        if (unsubscribed) {
          setPushStatus(prev => ({ ...prev, subscribed: false }))
          handleFieldChange('pushEnabled', false)
        }
      }
    } catch (error: any) {
      console.error('Error toggling push notifications:', error)
      setPushError(error.message || 'Failed to update push notification settings')
      handleFieldChange('pushEnabled', !enabled)
    }
  }

  const handleFieldChange = (field: keyof NotificationPreferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleQuietHoursChange = (field: keyof NonNullable<NotificationPreferences['quietHours']>, value: any) => {
    setFormData(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours!,
        [field]: value
      }
    }))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updatePreferences(formData)
      console.log('Notification preferences updated successfully')
    } catch (error) {
      console.error('Failed to update notification preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6">
      <div className="border-b border-gray-200 pb-4 mb-6">
        <h2 className="text-lg font-medium text-gray-900">Notification Preferences</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure how and when you receive notifications.
        </p>
      </div>

      <div className="space-y-8">
        {/* Push Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
          </div>
          
          <div className="space-y-4">
            {/* Status indicator */}
            {pushStatus.checking ? (
              <div className="flex items-center text-gray-500">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                Checking push notification status...
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                {pushStatus.supported ? (
                  pushStatus.subscribed ? (
                    <>
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span className="text-sm text-green-600">Push notifications are active</span>
                    </>
                  ) : pushStatus.permission === 'denied' ? (
                    <>
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm text-red-600">Push notifications are blocked</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-yellow-500" />
                      <span className="text-sm text-yellow-600">Push notifications are available</span>
                    </>
                  )
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-500">Push notifications not supported</span>
                  </>
                )}
              </div>
            )}

            {/* Error message */}
            {pushError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{pushError}</p>
              </div>
            )}

            {/* Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Push Notifications</label>
                <p className="text-sm text-gray-500">
                  {pushStatus.supported 
                    ? 'Receive real-time notifications in your browser'
                    : 'Not available in your current browser'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pushStatus.subscribed || formData.pushEnabled}
                  onChange={(e) => handlePushToggle(e.target.checked)}
                  disabled={!pushStatus.supported || pushStatus.checking}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
              </label>
            </div>

            {/* Test notification button */}
            {pushStatus.subscribed && (
              <button
                onClick={async () => {
                  try {
                    await pushNotifications.sendTestNotification(
                      'Test Notification',
                      'This is a test notification from Task Master!',
                      {
                        icon: '/icon-192x192.png',
                        badge: '/icon-72x72.png',
                        url: '/settings'
                      }
                    )
                  } catch (error) {
                    console.error('Failed to send test notification:', error)
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Send test notification
              </button>
            )}
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Mail className="w-5 h-5 text-green-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Digest Frequency</label>
            <select
              value={formData.emailDigest}
              onChange={(e) => handleFieldChange('emailDigest', e.target.value as 'instant' | 'daily' | 'weekly' | 'never')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="instant">Instant (as they happen)</option>
              <option value="daily">Daily digest</option>
              <option value="weekly">Weekly digest</option>
              <option value="never">Never</option>
            </select>
            <p className="text-sm text-gray-500 mt-1">Choose how often you receive email notifications</p>
          </div>
        </div>

        {/* Task Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Task Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Task Assignments</label>
                <p className="text-sm text-gray-500">When you're assigned to a task</p>
              </div>
              <input
                type="checkbox"
                checked={formData.taskAssigned}
                onChange={(e) => handleFieldChange('taskAssigned', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Task Updates</label>
                <p className="text-sm text-gray-500">When tasks you're involved with are updated</p>
              </div>
              <input
                type="checkbox"
                checked={formData.taskUpdated}
                onChange={(e) => handleFieldChange('taskUpdated', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Comments & Mentions</label>
                <p className="text-sm text-gray-500">When someone comments or mentions you</p>
              </div>
              <input
                type="checkbox"
                checked={formData.taskComment}
                onChange={(e) => handleFieldChange('taskComment', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Due Dates</label>
                <p className="text-sm text-gray-500">When tasks are due soon or overdue</p>
              </div>
              <input
                type="checkbox"
                checked={formData.taskDue}
                onChange={(e) => handleFieldChange('taskDue', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Team & Project Notifications */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-indigo-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Team & Project Notifications</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Team Updates</label>
                <p className="text-sm text-gray-500">Invitations, role changes, and team announcements</p>
              </div>
              <input
                type="checkbox"
                checked={formData.teamUpdates}
                onChange={(e) => handleFieldChange('teamUpdates', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Weekly Reports</label>
                <p className="text-sm text-gray-500">Weekly summary of your tasks and progress</p>
              </div>
              <input
                type="checkbox"
                checked={formData.weeklyReport}
                onChange={(e) => handleFieldChange('weeklyReport', e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Quiet Hours */}
        {formData.quietHours && (
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Clock className="w-5 h-5 text-orange-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Quiet Hours</label>
                  <p className="text-sm text-gray-500">Don't send notifications during specific hours</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.quietHours.enabled}
                  onChange={(e) => handleQuietHoursChange('enabled', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {formData.quietHours.enabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                    <select
                      value={formData.quietHours.timezone}
                      onChange={(e) => handleQuietHoursChange('timezone', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                      <option value="Europe/Paris">Central European Time (CET)</option>
                      <option value="Asia/Tokyo">Japan Standard Time (JST)</option>
                      <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}