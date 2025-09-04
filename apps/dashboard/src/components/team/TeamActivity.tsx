import React from 'react'
import { Team } from '@/types/team'

interface TeamActivityProps {
  team: Team
}

export function TeamActivity({ team }: TeamActivityProps) {
  const mockActivities = [
    {
      id: '1',
      user: 'John Doe',
      action: 'completed task',
      target: 'Implement authentication',
      time: '2 hours ago',
      type: 'task_completed'
    },
    {
      id: '2',
      user: 'Sarah Smith',
      action: 'invited',
      target: 'mike@company.com',
      time: '4 hours ago',
      type: 'member_invited'
    },
    {
      id: '3',
      user: 'Mike Johnson',
      action: 'created project',
      target: 'Mobile App Redesign',
      time: '1 day ago',
      type: 'project_created'
    }
  ]

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_completed':
        return '✓'
      case 'member_invited':
        return '📧'
      case 'project_created':
        return '🎆'
      default:
        return '•'
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Team Activity</h3>
        <p className="text-sm text-gray-500">
          Recent activity and member engagement
        </p>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Recent Activity</h4>
          <div className="flow-root">
            <ul className="-mb-8">
              {mockActivities.map((activity, index) => (
                <li key={activity.id}>
                  <div className="relative pb-8">
                    {index !== mockActivities.length - 1 ? (
                      <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" />
                    ) : null}
                    <div className="relative flex space-x-3">
                      <div className="h-8 w-8 bg-gray-100 rounded-full flex items-center justify-center">
                        <span className="text-sm">{getActivityIcon(activity.type)}</span>
                      </div>
                      <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                        <div>
                          <p className="text-sm text-gray-500">
                            <span className="font-medium text-gray-900">{activity.user}</span>{' '}
                            {activity.action}{' '}
                            <span className="font-medium text-gray-900">{activity.target}</span>
                          </p>
                        </div>
                        <div className="text-right text-sm whitespace-nowrap text-gray-500">
                          {activity.time}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">24</div>
          <div className="text-sm text-gray-500">Tasks This Week</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">18</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">5</div>
          <div className="text-sm text-gray-500">Active Members</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">3</div>
          <div className="text-sm text-gray-500">Projects</div>
        </div>
      </div>
    </div>
  )
}