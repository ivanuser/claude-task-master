'use client';

import React from 'react';
import { Project } from '@/types/project';
import { 
  Briefcase, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  AlertCircle,
  Users,
  GitBranch,
  Activity
} from 'lucide-react';

interface DashboardStatsProps {
  projects: Project[];
  className?: string;
}

interface StatCard {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ElementType;
  iconColor: string;
}

export function DashboardStats({ projects, className = '' }: DashboardStatsProps) {
  // Calculate statistics
  const stats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    totalTasks: projects.reduce((sum, p) => sum + p.totalTasks, 0),
    completedTasks: projects.reduce((sum, p) => sum + p.completedTasks, 0),
    totalMembers: projects.reduce((sum, p) => sum + (p.memberCount || 1), 0),
    healthyProjects: projects.filter(p => {
      const daysSinceActivity = p.lastActivity
        ? Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      return daysSinceActivity < 7;
    }).length,
  };

  const overallCompletionRate = stats.totalTasks > 0 
    ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
    : 0;

  const healthPercentage = projects.length > 0
    ? Math.round((stats.healthyProjects / projects.length) * 100)
    : 0;

  const statCards: StatCard[] = [
    {
      title: 'Active Projects',
      value: stats.activeProjects,
      change: `${stats.activeProjects} of ${stats.totalProjects} total`,
      changeType: 'neutral',
      icon: Briefcase,
      iconColor: 'text-primary',
    },
    {
      title: 'Overall Progress',
      value: `${overallCompletionRate}%`,
      change: `${stats.completedTasks} of ${stats.totalTasks} tasks`,
      changeType: overallCompletionRate >= 50 ? 'positive' : 'negative',
      icon: TrendingUp,
      iconColor: 'text-green-600',
    },
    {
      title: 'Project Health',
      value: `${healthPercentage}%`,
      change: `${stats.healthyProjects} projects active`,
      changeType: healthPercentage >= 70 ? 'positive' : healthPercentage >= 40 ? 'neutral' : 'negative',
      icon: Activity,
      iconColor: healthPercentage >= 70 ? 'text-green-600' : healthPercentage >= 40 ? 'text-yellow-600' : 'text-red-600',
    },
    {
      title: 'Team Members',
      value: stats.totalMembers,
      change: 'Across all projects',
      changeType: 'neutral',
      icon: Users,
      iconColor: 'text-purple-600',
    },
  ];

  return (
    <div className={className}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-card rounded-lg shadow-sm border border-border p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 bg-muted rounded-lg ${stat.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {stat.changeType && (
                  <span className={`text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {stat.changeType === 'positive' && '↑'}
                    {stat.changeType === 'negative' && '↓'}
                  </span>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                {stat.change && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Insights */}
      {projects.length > 0 && (
        <div className="mt-6 bg-card rounded-lg shadow-sm border border-border p-6">
          <h3 className="text-sm font-medium text-foreground mb-4">Quick Insights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              <span className="text-sm text-muted-foreground">
                {projects.filter(p => p.status === 'completed').length} projects completed
              </span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-yellow-500 mr-2" />
              <span className="text-sm text-muted-foreground">
                {projects.filter(p => p.status === 'paused').length} projects paused
              </span>
            </div>
            <div className="flex items-center">
              <AlertCircle className="w-4 h-4 text-red-500 mr-2" />
              <span className="text-sm text-muted-foreground">
                {projects.filter(p => {
                  const daysSinceActivity = p.lastActivity
                    ? Math.floor((Date.now() - new Date(p.lastActivity).getTime()) / (1000 * 60 * 60 * 24))
                    : 999;
                  return daysSinceActivity > 30;
                }).length} projects inactive
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}