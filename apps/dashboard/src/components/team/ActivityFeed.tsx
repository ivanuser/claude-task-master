'use client';

import React, { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  UserIcon,
  BriefcaseIcon,
  ClipboardDocumentCheckIcon,
  ChatBubbleLeftIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { ActivityFeedItem, ActivityType } from '@/types/team';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ActivityFeedProps {
  teamId: string;
  limit?: number;
  showFilters?: boolean;
  compact?: boolean;
}

const activityIcons: Record<ActivityType, React.ElementType> = {
  task_created: ClipboardDocumentCheckIcon,
  task_updated: ClipboardDocumentCheckIcon,
  task_completed: ClipboardDocumentCheckIcon,
  task_deleted: ClipboardDocumentCheckIcon,
  task_assigned: UserIcon,
  task_comment: ChatBubbleLeftIcon,
  project_created: BriefcaseIcon,
  project_updated: BriefcaseIcon,
  project_archived: BriefcaseIcon,
  member_joined: UserGroupIcon,
  member_left: UserGroupIcon,
  member_role_changed: UserGroupIcon,
  team_settings_updated: Cog6ToothIcon,
};

const activityColors: Record<ActivityType, string> = {
  task_created: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  task_updated: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  task_completed: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  task_deleted: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  task_assigned: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  task_comment: 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
  project_created: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
  project_updated: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  project_archived: 'bg-secondary text-secondary-foreground',
  member_joined: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  member_left: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  member_role_changed: 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
  team_settings_updated: 'bg-secondary text-secondary-foreground',
};

export function ActivityFeed({
  teamId,
  limit = 20,
  showFilters = false,
  compact = false,
}: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [filteredActivities, setFilteredActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ActivityType | 'all'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const socket = useWebSocket();

  // Fetch initial activities
  useEffect(() => {
    fetchActivities();
  }, [teamId]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!socket || !autoRefresh) return;

    const handleNewActivity = (activity: ActivityFeedItem) => {
      if (activity.teamId === teamId) {
        setActivities(prev => [activity, ...prev].slice(0, 100)); // Keep last 100
      }
    };

    socket.on('activity:new', handleNewActivity);

    return () => {
      socket.off('activity:new', handleNewActivity);
    };
  }, [socket, teamId, autoRefresh]);

  // Apply filters
  useEffect(() => {
    if (filter === 'all') {
      setFilteredActivities(activities.slice(0, limit));
    } else {
      setFilteredActivities(
        activities
          .filter(a => a.type === filter)
          .slice(0, limit)
      );
    }
  }, [activities, filter, limit]);

  const fetchActivities = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // For now, use mock data
      const mockActivities: ActivityFeedItem[] = [
        {
          id: '1',
          teamId,
          userId: '1',
          user: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'light',
              language: 'en',
              emailNotifications: true,
              pushNotifications: true,
              weeklyDigest: true,
            },
          },
          type: 'task_completed',
          action: 'completed task',
          target: {
            type: 'task',
            id: '123',
            name: 'Implement user authentication',
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          isRead: false,
        },
        {
          id: '2',
          teamId,
          userId: '2',
          user: {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'dark',
              language: 'en',
              emailNotifications: true,
              pushNotifications: false,
              weeklyDigest: true,
            },
          },
          type: 'task_comment',
          action: 'commented on task',
          target: {
            type: 'task',
            id: '124',
            name: 'Fix login bug',
          },
          metadata: {
            comment: 'I found the issue - it was a typo in the validation logic.',
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          isRead: true,
        },
        {
          id: '3',
          teamId,
          userId: '3',
          user: {
            id: '3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            emailVerified: true,
            twoFactorEnabled: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'light',
              language: 'en',
              emailNotifications: false,
              pushNotifications: true,
              weeklyDigest: false,
            },
          },
          type: 'member_joined',
          action: 'joined the team',
          target: {
            type: 'team',
            id: teamId,
            name: 'Development Team',
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          isRead: true,
        },
        {
          id: '4',
          teamId,
          projectId: '1',
          userId: '1',
          user: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'light',
              language: 'en',
              emailNotifications: true,
              pushNotifications: true,
              weeklyDigest: true,
            },
          },
          type: 'task_assigned',
          action: 'assigned task to Jane Smith',
          target: {
            type: 'task',
            id: '125',
            name: 'Update dashboard layout',
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
          isRead: true,
        },
        {
          id: '5',
          teamId,
          projectId: '2',
          userId: '2',
          user: {
            id: '2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            preferences: {
              theme: 'dark',
              language: 'en',
              emailNotifications: true,
              pushNotifications: false,
              weeklyDigest: true,
            },
          },
          type: 'project_created',
          action: 'created new project',
          target: {
            type: 'project',
            id: '2',
            name: 'Mobile App Development',
          },
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
          isRead: true,
        },
      ];

      setActivities(mockActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchActivities();
  };

  const renderActivityItem = (activity: ActivityFeedItem) => {
    const Icon = activityIcons[activity.type];
    const colorClass = activityColors[activity.type];

    if (compact) {
      return (
        <div
          key={activity.id}
          className={`flex items-center space-x-2 py-2 px-3 ${
            !activity.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
          } hover:bg-accent transition-colors`}
        >
          <div className={`p-1 rounded ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">
              <span className="font-medium">{activity.user.name}</span>
              {' '}
              <span className="text-muted-foreground">{activity.action}</span>
              {activity.target && (
                <>
                  {' '}
                  <span className="font-medium text-foreground">
                    {activity.target.name}
                  </span>
                </>
              )}
            </p>
          </div>
          <time className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
          </time>
        </div>
      );
    }

    return (
      <div
        key={activity.id}
        className={`flex space-x-3 p-4 ${
          !activity.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''
        } hover:bg-accent transition-colors`}
      >
        <div className={`p-2 rounded-lg ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm text-foreground">
                <span className="font-medium">{activity.user.name}</span>
                {' '}
                <span className="text-muted-foreground">{activity.action}</span>
                {activity.target && (
                  <>
                    {' '}
                    <a
                      href={`/${activity.target.type}s/${activity.target.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {activity.target.name}
                    </a>
                  </>
                )}
              </p>
              {activity.metadata?.comment && (
                <p className="mt-1 text-sm text-muted-foreground">
                  &quot;{activity.metadata.comment}&quot;
                </p>
              )}
            </div>
            <time className="text-xs text-muted-foreground whitespace-nowrap ml-2">
              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
            </time>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex space-x-3">
                <div className="w-10 h-10 bg-secondary rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-secondary rounded w-3/4"></div>
                  <div className="h-3 bg-secondary rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border">
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Activity Feed</h3>
          <div className="flex items-center space-x-2">
            {showFilters && (
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as ActivityType | 'all')}
                className="text-sm border-border bg-background text-foreground rounded-md"
              >
                <option value="all">All Activities</option>
                <option value="task_created">Tasks Created</option>
                <option value="task_completed">Tasks Completed</option>
                <option value="task_comment">Comments</option>
                <option value="member_joined">Members Joined</option>
                <option value="project_created">Projects Created</option>
              </select>
            )}
            <button
              onClick={handleRefresh}
              className="p-1 text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <label className="flex items-center text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-1"
              />
              Auto-refresh
            </label>
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No activities to display
          </div>
        ) : (
          filteredActivities.map(renderActivityItem)
        )}
      </div>
      
      {activities.length > limit && (
        <div className="px-4 py-3 border-t border-border text-center">
          <button className="text-sm text-primary hover:text-primary/80">
            View all activities →
          </button>
        </div>
      )}
    </div>
  );
}