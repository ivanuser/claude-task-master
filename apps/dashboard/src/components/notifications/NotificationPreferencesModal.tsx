import React, { useState, useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { NotificationPreferences } from '@/types/team'
import { X, Save, Bell, Mail, Smartphone, Clock } from 'lucide-react'

interface NotificationPreferencesModalProps {
  onClose: () => void
}

export function NotificationPreferencesModal({ onClose }: NotificationPreferencesModalProps) {
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
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (preferences) {
      setFormData(preferences)
    }
  }, [preferences])

  const handleSave = async () => {
    setLoading(true)
    try {
      await updatePreferences(formData)
      onClose()
    } catch (error) {
      console.error('Failed to save preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFieldChange = (field: keyof NotificationPreferences, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Bell className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Push Notifications */}
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <Smartphone className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Push Notifications</h3>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">Enable Push Notifications</label>
                <p className="text-sm text-gray-500">Receive real-time notifications in your browser</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.pushEnabled}
                  onChange={(e) => handleFieldChange('pushEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Email Notifications */}
          <div className="space-y-4">
            <div className="flex items-center mb-4">
              <Mail className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Digest</label>
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
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Task Notifications</h3>
            
            <div className="space-y-3">
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
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Team & Project Notifications</h3>
            
            <div className="space-y-3">
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
            <div className="space-y-4">
              <div className="flex items-center mb-4">
                <Clock className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Quiet Hours</h3>
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Enable Quiet Hours</label>
                  <p className="text-sm text-gray-500">Don't send notifications during specific hours</p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.quietHours.enabled}
                  onChange={(e) => handleFieldChange('quietHours', {
                    ...formData.quietHours,
                    enabled: e.target.checked
                  })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>

              {formData.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={formData.quietHours.start}
                      onChange={(e) => handleFieldChange('quietHours', {
                        ...formData.quietHours,
                        start: e.target.value
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={formData.quietHours.end}
                      onChange={(e) => handleFieldChange('quietHours', {
                        ...formData.quietHours,
                        end: e.target.value
                      })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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