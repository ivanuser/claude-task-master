'use client';

import React from 'react';
import Link from 'next/link';
import { Project } from '@/types/project';
import { RealtimeSyncState } from '@/hooks/useRealtimeSync';
import { formatDistanceToNow } from 'date-fns';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
  GitBranch,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreVertical,
  RefreshCw,
  ExternalLink,
  Settings,
  Trash2,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface ProjectListProps {
  projects: Project[];
  onProjectUpdate: () => void;
  syncState: RealtimeSyncState;
  enableInfiniteScroll?: boolean;
  loadMore?: () => Promise<void>;
  hasMore?: boolean;
}

export function ProjectList({
  projects,
  onProjectUpdate,
  syncState,
  enableInfiniteScroll = true,
  loadMore,
  hasMore = false,
}: ProjectListProps) {
  const { loadMoreRef, isLoadingMore } = useInfiniteScroll({
    enabled: enableInfiniteScroll && hasMore,
    onLoadMore: loadMore || (() => Promise.resolve()),
  });

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'bg-green-100 text-green-800';
    if (status === 'paused') return 'bg-yellow-100 text-yellow-800';
    if (status === 'completed') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getHealthIcon = (project: Project) => {
    const daysSinceActivity = project.lastActivity
      ? Math.floor((Date.now() - new Date(project.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity < 7) return { icon: CheckCircle, color: 'text-green-500' };
    if (daysSinceActivity < 30) return { icon: Clock, color: 'text-yellow-500' };
    return { icon: AlertCircle, color: 'text-red-500' };
  };

  return (
    <>
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sync Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {projects.map((project) => {
              const isSyncing = syncState.syncStatuses.get(project.id)?.isRunning || false;
              const lastSync = syncState.syncStatuses.get(project.id)?.lastSync || null;
              const health = getHealthIcon(project);
              const HealthIcon = health.icon;
              const completionPercentage = project.totalTasks > 0
                ? Math.round((project.completedTasks / project.totalTasks) * 100)
                : 0;

              return (
                <tr key={project.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-3">
                        <HealthIcon className={`w-5 h-5 ${health.color}`} />
                      </div>
                      <div>
                        <Link href={`/projects/${project.id}`}>
                          <div className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                            {project.name}
                          </div>
                        </Link>
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {project.description || 'No description'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="text-sm text-gray-900">
                          {project.completedTasks} / {project.totalTasks} tasks
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              completionPercentage >= 75 ? 'bg-green-500' :
                              completionPercentage >= 50 ? 'bg-blue-500' :
                              completionPercentage >= 25 ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="ml-2 text-xs text-gray-500">
                        {completionPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Users className="w-4 h-4 mr-1" />
                      {project.memberCount || 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.lastActivity
                      ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isSyncing ? (
                      <div className="flex items-center text-sm text-blue-600">
                        <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                        Syncing
                      </div>
                    ) : lastSync ? (
                      <div className="text-sm text-green-600">
                        Synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400">Never synced</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onProjectUpdate()}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                        title="Sync project"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Infinite Scroll Loader */}
      {enableInfiniteScroll && hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-8">
          {isLoadingMore && (
            <>
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading more projects...</span>
            </>
          )}
        </div>
      )}
    </>
  );
}