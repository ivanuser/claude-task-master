'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Project } from '@/types/project';
import { formatDistanceToNow } from 'date-fns';
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
} from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  isSyncing: boolean;
  lastSync: string | null;
  onUpdate: () => void;
  className?: string;
}

export function ProjectCard({
  project,
  isSyncing,
  lastSync,
  onUpdate,
  className = '',
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusColor = () => {
    if (project.status === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
    if (project.status === 'paused') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    if (project.status === 'completed') return 'bg-primary/10 text-primary';
    return 'bg-muted text-muted-foreground';
  };

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-green-500';
    if (percentage >= 50) return 'bg-primary';
    if (percentage >= 25) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const completionPercentage = project.totalTasks > 0
    ? Math.round((project.completedTasks / project.totalTasks) * 100)
    : 0;

  const getHealthIndicator = () => {
    const daysSinceActivity = project.lastActivity
      ? Math.floor((Date.now() - new Date(project.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceActivity < 7) return { icon: CheckCircle, color: 'text-green-500', label: 'Healthy' };
    if (daysSinceActivity < 30) return { icon: Clock, color: 'text-yellow-500', label: 'Needs attention' };
    return { icon: AlertCircle, color: 'text-red-500', label: 'Inactive' };
  };

  const health = getHealthIndicator();
  const HealthIcon = health.icon;

  return (
    <div className={`bg-card rounded-lg shadow-sm border border-border hover:shadow-md transition-all duration-200 ${className}`}>
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Link href={`/projects/${project.id}`}>
              <h3 className="text-lg font-semibold text-foreground hover:text-primary transition-colors line-clamp-1">
                {project.name}
              </h3>
            </Link>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description || 'No description provided'}
            </p>
          </div>

          {/* Actions Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-accent transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-muted-foreground" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-md shadow-lg z-10">
                <button
                  onClick={async () => {
                    setShowMenu(false);
                    try {
                      const response = await fetch(`/api/projects/${project.id}/sync`, {
                        method: 'POST',
                        credentials: 'include',
                      });
                      
                      if (response.ok) {
                        const data = await response.json();
                        console.log('✅ Manual sync completed:', data);
                        onUpdate(); // Refresh the UI after sync
                      } else {
                        const error = await response.json();
                        console.error('❌ Sync failed:', error);
                        alert(`Sync failed: ${error.error}`);
                      }
                    } catch (error) {
                      console.error('❌ Sync request failed:', error);
                      alert('Sync request failed. Please try again.');
                    }
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync Now
                </button>
                <Link
                  href={`/projects/${project.id}`}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Details
                </Link>
                <Link
                  href={`/projects/${project.id}/settings`}
                  className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    // Handle delete
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Status and Health */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor()}`}>
              {project.status}
            </span>
            <div className="flex items-center" title={health.label}>
              <HealthIcon className={`w-4 h-4 ${health.color}`} />
            </div>
          </div>
          
          {isSyncing && (
            <div className="flex items-center text-xs text-primary">
              <RefreshCw className="w-3 h-3 animate-spin mr-1" />
              Syncing
            </div>
          )}
        </div>

        {/* Task Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Tasks</span>
            <span className="text-foreground font-medium">
              {project.completedTasks} / {project.totalTasks}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getCompletionColor(completionPercentage)}`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">
            {completionPercentage}% complete
          </div>
        </div>

        {/* Project Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center text-muted-foreground">
            <GitBranch className="w-4 h-4 mr-1" />
            <span className="truncate">{project.gitBranch || 'main'}</span>
          </div>
          <div className="flex items-center text-muted-foreground">
            <Users className="w-4 h-4 mr-1" />
            <span>{project.memberCount || 1} member{project.memberCount !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Tags */}
        {project.tags && project.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {project.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
            {project.tags.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary text-muted-foreground">
                +{project.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Last Activity */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Last activity {project.lastActivity
                ? formatDistanceToNow(new Date(project.lastActivity), { addSuffix: true })
                : 'Never'}
            </span>
            {lastSync && (
              <span className="text-green-600">
                Synced {formatDistanceToNow(new Date(lastSync), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}