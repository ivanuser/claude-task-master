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

  const handleSave = async () => {
    // API call would go here
    console.log('Saving team settings:', { teamInfo, settings })
    onUpdate()
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Team Settings</h3>
        <p className="text-sm text-gray-500">
          Manage your team configuration and preferences
        </p>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">General</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
            <input
              type="text"
              value={teamInfo.name}
              onChange={(e) => setTeamInfo({ ...teamInfo, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={teamInfo.description}
              onChange={(e) => setTeamInfo({ ...teamInfo, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Team URL Slug</label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                /team/
              </span>
              <input
                type="text"
                value={teamInfo.slug}
                onChange={(e) => setTeamInfo({ ...teamInfo, slug: e.target.value })}
                className="flex-1 border border-gray-300 rounded-r-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Member Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Member Permissions</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Allow member invites</label>
              <p className="text-sm text-gray-500">Members can invite other users to the team</p>
            </div>
            <input
              type="checkbox"
              checked={settings.allowMemberInvites}
              onChange={(e) => setSettings({ ...settings, allowMemberInvites: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Require approval</label>
              <p className="text-sm text-gray-500">New members need admin approval</p>
            </div>
            <input
              type="checkbox"
              checked={settings.requireApproval}
              onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default role for new members</label>
            <select
              value={settings.defaultRole}
              onChange={(e) => setSettings({ ...settings, defaultRole: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="viewer">Viewer</option>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Integrations</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-purple-100 rounded flex items-center justify-center">
                <span className="text-purple-600 font-semibold">S</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">Slack</div>
                <div className="text-xs text-gray-500">Get notifications in Slack</div>
              </div>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              {settings.integrations.slack?.enabled ? 'Configure' : 'Connect'}
            </button>
          </div>
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
                <span className="text-white font-semibold">G</span>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900">GitHub</div>
                <div className="text-xs text-gray-500">Sync with GitHub repositories</div>
              </div>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800">
              {settings.integrations.github?.enabled ? 'Configure' : 'Connect'}
            </button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Save Changes
        </button>
      </div>
    </div>
  )
}