'use client'

import React, { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'
import { BellIcon, DevicePhoneMobileIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NotificationPreferences {
  enabled: boolean
  inApp: boolean
  email: boolean
  push: boolean
  sms: boolean
  slack: boolean
  discord: boolean
  mobileApp: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  notificationTypes: {
    TASK_ASSIGNED: boolean
    TASK_COMPLETED: boolean
    TASK_DUE: boolean
    TASK_OVERDUE: boolean
    PROJECT_UPDATE: boolean
    MENTION: boolean
    SYSTEM: boolean
  }
  soundEnabled: boolean
  vibrationEnabled: boolean
}

const notificationTypeLabels = {
  TASK_ASSIGNED: 'Task Assigned',
  TASK_COMPLETED: 'Task Completed',
  TASK_DUE: 'Task Due Soon',
  TASK_OVERDUE: 'Task Overdue',
  PROJECT_UPDATE: 'Project Updates',
  MENTION: 'Mentions',
  SYSTEM: 'System Notifications',
}

export function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    enabled: true,
    inApp: true,
    email: false,
    push: false,
    sms: false,
    slack: false,
    discord: false,
    mobileApp: false,
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    notificationTypes: {
      TASK_ASSIGNED: true,
      TASK_COMPLETED: true,
      TASK_DUE: true,
      TASK_OVERDUE: true,
      PROJECT_UPDATE: true,
      MENTION: true,
      SYSTEM: true,
    },
    soundEnabled: true,
    vibrationEnabled: true,
  })

  // Fetch current preferences
  const fetchPreferences = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/notification-preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Failed to fetch notification preferences:', error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  // Save preferences
  const savePreferences = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/user/notification-preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      })

      if (response.ok) {
        toast.success('Notification preferences saved')
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Failed to save notification preferences:', error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences()
  }, [])

  // Update preference helper
  const updatePreference = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }))
  }

  // Update notification type preference
  const updateNotificationType = (type: keyof typeof notificationTypeLabels, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      notificationTypes: {
        ...prev.notificationTypes,
        [type]: value,
      },
    }))
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Notification Preferences</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage how and when you receive notifications
        </p>
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Master Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <BellIcon className="h-5 w-5 text-gray-400 mr-3" />
            <div>
              <label htmlFor="notifications-enabled" className="text-sm font-medium text-gray-900">
                Enable Notifications
              </label>
              <p className="text-sm text-gray-500">
                Turn on/off all notifications
              </p>
            </div>
          </div>
          <Switch
            checked={preferences.enabled}
            onChange={(checked) => updatePreference('enabled', checked)}
            className={cn(
              preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
              'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
            )}
          >
            <span
              className={cn(
                preferences.enabled ? 'translate-x-6' : 'translate-x-1',
                'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
              )}
            />
          </Switch>
        </div>

        {/* Notification Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Notification Channels</h4>
          
          <div className="space-y-3">
            {/* In-App */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">In-App Notifications</label>
              <Switch
                checked={preferences.inApp}
                onChange={(checked) => updatePreference('inApp', checked)}
                disabled={!preferences.enabled}
                className={cn(
                  preferences.inApp && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
                )}
              >
                <span
                  className={cn(
                    preferences.inApp ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Email Notifications</label>
              <Switch
                checked={preferences.email}
                onChange={(checked) => updatePreference('email', checked)}
                disabled={!preferences.enabled}
                className={cn(
                  preferences.email && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
                )}
              >
                <span
                  className={cn(
                    preferences.email ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>

            {/* Push */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Push Notifications</label>
              <Switch
                checked={preferences.push}
                onChange={(checked) => updatePreference('push', checked)}
                disabled={!preferences.enabled}
                className={cn(
                  preferences.push && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
                )}
              >
                <span
                  className={cn(
                    preferences.push ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>

            {/* Mobile App */}
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Mobile App Notifications</label>
              <Switch
                checked={preferences.mobileApp}
                onChange={(checked) => updatePreference('mobileApp', checked)}
                disabled={!preferences.enabled}
                className={cn(
                  preferences.mobileApp && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
                )}
              >
                <span
                  className={cn(
                    preferences.mobileApp ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-900">Notification Types</h4>
          <p className="text-sm text-gray-500">Choose which activities you want to be notified about</p>
          
          <div className="space-y-3">
            {Object.entries(notificationTypeLabels).map(([type, label]) => (
              <div key={type} className="flex items-center justify-between">
                <label className="text-sm text-gray-700">{label}</label>
                <Switch
                  checked={preferences.notificationTypes[type as keyof typeof notificationTypeLabels]}
                  onChange={(checked) => updateNotificationType(type as keyof typeof notificationTypeLabels, checked)}
                  disabled={!preferences.enabled}
                  className={cn(
                    preferences.notificationTypes[type as keyof typeof notificationTypeLabels] && preferences.enabled
                      ? 'bg-taskmaster-600'
                      : 'bg-gray-200',
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
                  )}
                >
                  <span
                    className={cn(
                      preferences.notificationTypes[type as keyof typeof notificationTypeLabels]
                        ? 'translate-x-6'
                        : 'translate-x-1',
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                    )}
                  />
                </Switch>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">Quiet Hours</h4>
              <p className="text-sm text-gray-500">Pause notifications during specific hours</p>
            </div>
            <Switch
              checked={preferences.quietHoursEnabled}
              onChange={(checked) => updatePreference('quietHoursEnabled', checked)}
              disabled={!preferences.enabled}
              className={cn(
                preferences.quietHoursEnabled && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
              )}
            >
              <span
                className={cn(
                  preferences.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1',
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                )}
              />
            </Switch>
          </div>

          {preferences.quietHoursEnabled && (
            <div className="flex items-center space-x-4 pl-4">
              <div>
                <label htmlFor="quiet-start" className="text-sm text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  id="quiet-start"
                  value={preferences.quietHoursStart || '22:00'}
                  onChange={(e) => updatePreference('quietHoursStart', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                  disabled={!preferences.enabled}
                />
              </div>
              <div>
                <label htmlFor="quiet-end" className="text-sm text-gray-700">
                  End Time
                </label>
                <input
                  type="time"
                  id="quiet-end"
                  value={preferences.quietHoursEnd || '08:00'}
                  onChange={(e) => updatePreference('quietHoursEnd', e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-taskmaster-500 focus:ring-taskmaster-500 sm:text-sm"
                  disabled={!preferences.enabled}
                />
              </div>
            </div>
          )}
        </div>

        {/* Additional Settings */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-900">Additional Settings</h4>
          
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Sound</label>
            <Switch
              checked={preferences.soundEnabled}
              onChange={(checked) => updatePreference('soundEnabled', checked)}
              disabled={!preferences.enabled}
              className={cn(
                preferences.soundEnabled && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
              )}
            >
              <span
                className={cn(
                  preferences.soundEnabled ? 'translate-x-6' : 'translate-x-1',
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                )}
              />
            </Switch>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-700">Vibration</label>
            <Switch
              checked={preferences.vibrationEnabled}
              onChange={(checked) => updatePreference('vibrationEnabled', checked)}
              disabled={!preferences.enabled}
              className={cn(
                preferences.vibrationEnabled && preferences.enabled ? 'bg-taskmaster-600' : 'bg-gray-200',
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors'
              )}
            >
              <span
                className={cn(
                  preferences.vibrationEnabled ? 'translate-x-6' : 'translate-x-1',
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                )}
              />
            </Switch>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-end">
          <button
            onClick={savePreferences}
            disabled={saving}
            className={cn(
              'px-4 py-2 text-sm font-medium text-white rounded-md',
              saving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-taskmaster-600 hover:bg-taskmaster-700'
            )}
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>
    </div>
  )
}