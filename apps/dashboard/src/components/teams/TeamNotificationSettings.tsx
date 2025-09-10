'use client'

import React, { useState, useEffect } from 'react'
import { Switch } from '@headlessui/react'
import { BellIcon, ClockIcon, EnvelopeIcon } from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TeamNotificationPolicy {
  quietHoursEnabled: boolean
  quietHoursStart: string | null
  quietHoursEnd: string | null
  allowAnnouncements: boolean
  allowMilestoneNotifications: boolean
  allowMemberNotifications: boolean
  allowStatusNotifications: boolean
  digestFrequency: 'instant' | 'daily' | 'weekly'
}

interface TeamNotificationSettingsProps {
  projectId: string
  isAdmin: boolean
}

export function TeamNotificationSettings({ projectId, isAdmin }: TeamNotificationSettingsProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [policy, setPolicy] = useState<TeamNotificationPolicy>({
    quietHoursEnabled: false,
    quietHoursStart: null,
    quietHoursEnd: null,
    allowAnnouncements: true,
    allowMilestoneNotifications: true,
    allowMemberNotifications: true,
    allowStatusNotifications: true,
    digestFrequency: 'instant',
  })

  // Fetch current policy
  const fetchPolicy = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/teams/${projectId}/notification-policy`)
      if (response.ok) {
        const data = await response.json()
        setPolicy(data)
      }
    } catch (error) {
      console.error('Failed to fetch notification policy:', error)
      toast.error('Failed to load notification settings')
    } finally {
      setLoading(false)
    }
  }

  // Save policy
  const savePolicy = async () => {
    if (!isAdmin) {
      toast.error('Only admins can update team notification settings')
      return
    }

    try {
      setSaving(true)
      const response = await fetch(`/api/teams/${projectId}/notification-policy`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(policy),
      })

      if (response.ok) {
        toast.success('Team notification settings saved')
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Failed to save notification policy:', error)
      toast.error('Failed to save notification settings')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    fetchPolicy()
  }, [projectId])

  const updatePolicy = (key: keyof TeamNotificationPolicy, value: any) => {
    setPolicy(prev => ({ ...prev, [key]: value }))
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-secondary rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-secondary rounded"></div>
            <div className="h-4 bg-secondary rounded"></div>
            <div className="h-4 bg-secondary rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center">
          <BellIcon className="h-5 w-5 text-muted-foreground mr-2" />
          <h3 className="text-lg font-medium text-foreground">Team Notification Settings</h3>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure notification preferences for the entire team
        </p>
        {!isAdmin && (
          <p className="mt-2 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
            Only team admins can modify these settings
          </p>
        )}
      </div>

      <div className="px-6 py-4 space-y-6">
        {/* Notification Types */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-foreground">Notification Types</h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Announcements</label>
                <p className="text-sm text-muted-foreground">Team-wide announcements from admins</p>
              </div>
              <Switch
                checked={policy.allowAnnouncements}
                onChange={(checked) => updatePolicy('allowAnnouncements', checked)}
                disabled={!isAdmin}
                className={cn(
                  policy.allowAnnouncements ? 'bg-primary' : 'bg-secondary',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  !isAdmin && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    policy.allowAnnouncements ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Milestone Completions</label>
                <p className="text-sm text-muted-foreground">Notifications when milestones are reached</p>
              </div>
              <Switch
                checked={policy.allowMilestoneNotifications}
                onChange={(checked) => updatePolicy('allowMilestoneNotifications', checked)}
                disabled={!isAdmin}
                className={cn(
                  policy.allowMilestoneNotifications ? 'bg-primary' : 'bg-secondary',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  !isAdmin && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    policy.allowMilestoneNotifications ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Member Updates</label>
                <p className="text-sm text-muted-foreground">When members join, leave, or change roles</p>
              </div>
              <Switch
                checked={policy.allowMemberNotifications}
                onChange={(checked) => updatePolicy('allowMemberNotifications', checked)}
                disabled={!isAdmin}
                className={cn(
                  policy.allowMemberNotifications ? 'bg-primary' : 'bg-secondary',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  !isAdmin && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    policy.allowMemberNotifications ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-foreground">Project Status Changes</label>
                <p className="text-sm text-muted-foreground">When project status is updated</p>
              </div>
              <Switch
                checked={policy.allowStatusNotifications}
                onChange={(checked) => updatePolicy('allowStatusNotifications', checked)}
                disabled={!isAdmin}
                className={cn(
                  policy.allowStatusNotifications ? 'bg-primary' : 'bg-secondary',
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  !isAdmin && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span
                  className={cn(
                    policy.allowStatusNotifications ? 'translate-x-6' : 'translate-x-1',
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                  )}
                />
              </Switch>
            </div>
          </div>
        </div>

        {/* Email Digest */}
        <div className="space-y-4">
          <div className="flex items-center">
            <EnvelopeIcon className="h-4 w-4 text-muted-foreground mr-2" />
            <h4 className="text-sm font-medium text-foreground">Email Digest</h4>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Digest Frequency
            </label>
            <select
              value={policy.digestFrequency}
              onChange={(e) => updatePolicy('digestFrequency', e.target.value as any)}
              disabled={!isAdmin}
              className={cn(
                'w-full border border-border rounded-lg px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-primary',
                !isAdmin && 'opacity-50 cursor-not-allowed'
              )}
            >
              <option value="instant">Instant (as they happen)</option>
              <option value="daily">Daily summary</option>
              <option value="weekly">Weekly summary</option>
            </select>
            <p className="text-sm text-muted-foreground mt-1">
              How often team members receive email notifications
            </p>
          </div>
        </div>

        {/* Team Quiet Hours */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-4 w-4 text-muted-foreground mr-2" />
              <div>
                <h4 className="text-sm font-medium text-foreground">Team Quiet Hours</h4>
                <p className="text-sm text-muted-foreground">Pause notifications during specific hours</p>
              </div>
            </div>
            <Switch
              checked={policy.quietHoursEnabled}
              onChange={(checked) => updatePolicy('quietHoursEnabled', checked)}
              disabled={!isAdmin}
              className={cn(
                policy.quietHoursEnabled ? 'bg-primary' : 'bg-secondary',
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                !isAdmin && 'opacity-50 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  policy.quietHoursEnabled ? 'translate-x-6' : 'translate-x-1',
                  'inline-block h-4 w-4 transform rounded-full bg-white transition-transform'
                )}
              />
            </Switch>
          </div>

          {policy.quietHoursEnabled && (
            <div className="flex items-center space-x-4 pl-6">
              <div>
                <label htmlFor="quiet-start" className="text-sm text-foreground">
                  Start Time
                </label>
                <input
                  type="time"
                  id="quiet-start"
                  value={policy.quietHoursStart || '22:00'}
                  onChange={(e) => updatePolicy('quietHoursStart', e.target.value)}
                  className="mt-1 block w-full rounded-md border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!isAdmin}
                />
              </div>
              <div>
                <label htmlFor="quiet-end" className="text-sm text-foreground">
                  End Time
                </label>
                <input
                  type="time"
                  id="quiet-end"
                  value={policy.quietHoursEnd || '08:00'}
                  onChange={(e) => updatePolicy('quietHoursEnd', e.target.value)}
                  className="mt-1 block w-full rounded-md border-border bg-background text-foreground shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
                  disabled={!isAdmin}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      {isAdmin && (
        <div className="px-6 py-4 bg-secondary/50 dark:bg-secondary/20 border-t border-border">
          <div className="flex justify-end">
            <button
              onClick={savePolicy}
              disabled={saving}
              className={cn(
                'px-4 py-2 text-sm font-medium text-white rounded-md',
                saving
                  ? 'bg-muted cursor-not-allowed'
                  : 'bg-primary hover:bg-primary/90'
              )}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}