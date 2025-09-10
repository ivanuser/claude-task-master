import React, { useState } from 'react'
import { Team, TeamSettings as TeamSettingsType } from '@/types/team'

interface TeamSettingsProps {
  team: Team
  onUpdate: () => void
}

export function TeamSettings({ team, onUpdate }: TeamSettingsProps) {
  const [settings, setSettings] = useState<TeamSettingsType>(team.settings)
  const [teamInfo, setTeamInfo] = useState({
    name: team.name,
    description: team.description || '',
    slug: team.slug
  })

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const response = await fetch(`/api/teams/${team.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: teamInfo.name,
          description: teamInfo.description,
          settings: settings
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save settings')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000) // Hide success message after 3 seconds
      onUpdate() // Refresh the parent component data
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-foreground">Team Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your team configuration and preferences
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-lg font-medium text-foreground mb-4">General</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Team Name</label>
            <input
              type="text"
              value={teamInfo.name}
              onChange={(e) => setTeamInfo({ ...teamInfo, name: e.target.value })}
              className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={teamInfo.description}
              onChange={(e) => setTeamInfo({ ...teamInfo, description: e.target.value })}
              className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Team URL Slug</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-border bg-secondary text-muted-foreground text-sm">
                /team/
              </span>
              <input
                type="text"
                value={teamInfo.slug}
                onChange={(e) => setTeamInfo({ ...teamInfo, slug: e.target.value })}
                className="flex-1 border border-border bg-background text-foreground rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Member Settings */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-lg font-medium text-foreground mb-4">Member Permissions</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Allow member invites</label>
              <p className="text-sm text-muted-foreground">Members can invite other users to the team</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowMemberInvites}
              onChange={(e) => setSettings({ ...settings, allowMemberInvites: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground">Require approval</label>
              <p className="text-sm text-muted-foreground">New members need admin approval</p>
            </div>
            <input
              type="checkbox"
              checked={settings.requireApproval}
              onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
              className="rounded border-border text-primary focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Default role for new members</label>
            <select
              value={settings.defaultRole}
              onChange={(e) => setSettings({ ...settings, defaultRole: e.target.value as any })}
              className="w-full border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h4 className="text-lg font-medium text-foreground mb-4">Integrations</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <span className="text-purple-600 font-semibold">S</span>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">Slack</div>
                <div className="text-xs text-muted-foreground">Get notifications in Slack</div>
              </div>
            </div>
            <button className="text-sm text-primary hover:text-primary/80">
              {settings.integrations.slack?.enabled ? 'Configure' : 'Connect'}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                <span className="text-white font-semibold">G</span>
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">GitHub</div>
                <div className="text-xs text-muted-foreground">Sync with GitHub repositories</div>
              </div>
            </div>
            <button className="text-sm text-primary hover:text-primary/80">
              {settings.integrations.github?.enabled ? 'Configure' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {saveError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className="text-sm text-red-800 dark:text-red-400">{saveError}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {saveSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-800 dark:text-green-400">Settings saved successfully!</p>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-4 py-2 text-sm font-medium text-primary-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
            saving 
              ? 'bg-muted cursor-not-allowed' 
              : 'bg-primary hover:bg-primary/90'
          }`}
        >
          {saving ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </div>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}