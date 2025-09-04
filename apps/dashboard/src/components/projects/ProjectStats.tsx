'use client';

import React from 'react';
import { Project } from '@/types/project';
import { Task } from '@/types/task';
import {
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  GitBranch,
  Layers
} from 'lucide-react';

interface ProjectStatsProps {
  project: Project;
  tasks: Task[];
  className?: string;
}

export function ProjectStats({ project, tasks, className = '' }: ProjectStatsProps) {
  // Calculate task statistics
  const stats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'done').length,
    inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
    blockedTasks: tasks.filter(t => t.status === 'blocked').length,
    reviewTasks: tasks.filter(t => t.status === 'review').length,
    pendingTasks: tasks.filter(t => t.status === 'pending').length,
    criticalTasks: tasks.filter(t => t.priority === 'critical').length,
    highPriorityTasks: tasks.filter(t => t.priority === 'high').length,
    tasksWithSubtasks: tasks.filter(t => t.subtasks && t.subtasks.length > 0).length,
    totalSubtasks: tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0),
  };

  const completionPercentage = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const healthScore = (() => {
    if (stats.blockedTasks > stats.totalTasks * 0.2) return 'poor';
    if (stats.blockedTasks > stats.totalTasks * 0.1) return 'fair';
    if (completionPercentage > 70) return 'excellent';
    if (completionPercentage > 40) return 'good';
    return 'fair';
  })();

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-600 bg-green-100';
      case 'good': return 'text-blue-600 bg-blue-100';
      case 'fair': return 'text-yellow-600 bg-yellow-100';
      case 'poor': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const statCards = [
    {
      title: 'Total Progress',
      value: `${completionPercentage}%`,
      subtitle: `${stats.completedTasks} of ${stats.totalTasks} tasks`,
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'In Progress',
      value: stats.inProgressTasks,
      subtitle: 'Active tasks',
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      subtitle: 'Finished tasks',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Blocked',
      value: stats.blockedTasks,
      subtitle: 'Need attention',
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className={className}>
      {/* Progress Bar */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Overall Progress</h3>
            <p className="text-sm text-gray-600 mt-1">
              {stats.completedTasks} of {stats.totalTasks} tasks completed
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(healthScore)}`}>
            {healthScore.charAt(0).toUpperCase() + healthScore.slice(1)} Health
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
            style={{ width: `${completionPercentage}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.pendingTasks}</p>
            <p className="text-xs text-gray-500">Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{stats.inProgressTasks}</p>
            <p className="text-xs text-gray-500">In Progress</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.reviewTasks}</p>
            <p className="text-xs text-gray-500">In Review</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{stats.completedTasks}</p>
            <p className="text-xs text-gray-500">Completed</p>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 ${stat.bgColor} rounded-lg`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {stats.criticalTasks} Critical
              </p>
              <p className="text-xs text-gray-500">
                {stats.highPriorityTasks} high priority tasks
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <Layers className="w-5 h-5 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {stats.tasksWithSubtasks} Parent Tasks
              </p>
              <p className="text-xs text-gray-500">
                {stats.totalSubtasks} total subtasks
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center">
            <GitBranch className="w-5 h-5 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                {project.gitBranch || 'main'} Branch
              </p>
              <p className="text-xs text-gray-500">
                {project.syncEnabled ? 'Sync enabled' : 'Sync disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}