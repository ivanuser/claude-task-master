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
  syncState?: RealtimeSyncState;
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
    if (status === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (status === 'paused') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    if (status === 'completed') return 'bg-primary/10 text-primary';
    return 'bg-muted text-muted-foreground';
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
      <div className="bg-card shadow-sm rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Team
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Last Activity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Sync Status
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {projects.map((project) => {
              const isSyncing = syncState?.syncStatuses?.get(project.id)?.isRunning || false;
              const lastSync = syncState?.syncStatuses?.get(project.id)?.lastSync || null;
              const health = getHealthIcon(project);
              const HealthIcon = health.icon;
              const completionPercentage = project.totalTasks > 0
                ? Math.round((project.completedTasks / project.totalTasks) * 100)
                : 0;

              return (
                <tr key={project.id} className="hover:bg-accent transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-3">
                        <HealthIcon className={`w-5 h-5 ${health.color}`} />
                      </div>
                      <div>
                        <Link href={`/projects/${project.id}`}>
                          <div className="text-sm font-medium text-foreground hover:text-primary transition-colors">
                            {project.name}
                          </div>
                        </Link>
                        <div className="text-sm text-muted-foreground max-w-xs truncate">
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
                        <div className="text-sm text-foreground">
                          {project.completedTasks} / {project.totalTasks} tasks
                        </div>
                        <div className="w-32 bg-muted rounded-full h-1.5 mt-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              completionPercentage >= 75 ? 'bg-green-500' :
                              completionPercentage >= 50 ? 'bg-primary' :
                              completionPercentage >= 25 ? 'bg-yellow-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${completionPercentage}%` }}
                          />
                        </div>
                      </div>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {completionPercentage}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {project.memberCount || 1}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    {project.lastActivity
                      ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
                      : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isSyncing ? (
                      <div className="flex items-center text-sm text-primary">
                        <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                        Syncing
                      </div>
                    ) : lastSync ? (
                      <div className="text-sm text-green-600">
                        Synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Never synced</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => onProjectUpdate()}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        title="Sync project"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <Link
                        href={`/projects/${project.id}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
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