'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { MetricCard } from '@/components/analytics/MetricCard';
import { ChartWidget } from '@/components/analytics/ChartWidget';
import BackButton from '@/components/ui/BackButton';

interface AnalyticsData {
  summary: {
    overview: {
      totalProjects: number;
      totalTasks: number;
      completedTasks: number;
      inProgressTasks: number;
      teamMembers: number;
    };
    performance: {
      completionRate: number;
      averageVelocity: number;
      blockedTasks: number;
      overdueTasks: number;
    };
  };
  projectMetrics: Array<{
    id: string;
    name: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    healthScore: number;
    memberCount: number;
    lastActivity: string;
    status: string;
  }>;
  taskMetrics: {
    statusDistribution: Record<string, number>;
    priorityDistribution: Record<string, number>;
    averageComplexity: number;
    totalTasks: number;
  };
  teamMetrics: {
    totalMembers: number;
    averageTasksPerMember: number;
    topPerformers: Array<{
      id: string;
      name: string;
      email: string;
      tasksAssigned: number;
      tasksCompleted: number;
      completionRate: number;
    }>;
    members: Array<{
      id: string;
      name: string;
      email: string;
      tasksAssigned: number;
      tasksCompleted: number;
      completionRate: number;
    }>;
  };
  velocityData: Array<{
    period: string;
    tasksCompleted: number;
    velocity: number;
  }>;
  burndownData: Array<{
    date: string;
    planned: number;
    actual: number;
  }>;
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, [timeRange]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }
      
      const data = await response.json();
      setAnalyticsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) {
    return <div>No analytics data available</div>;
  }

  const { summary, projectMetrics, taskMetrics, teamMetrics, velocityData, burndownData } = analyticsData;

  return (
    <div className="space-y-6 p-6">
      {/* Back Button */}
      <BackButton href="/dashboard" label="Back to Dashboard" />
      
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Track productivity, project health, and team performance
          </p>
        </div>
        <div className="flex space-x-3">
          {/* Time Range Selector */}
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={summary.overview.totalProjects}
          change={0}
          trend="neutral"
          icon={<ChartBarIcon className="w-8 h-8" />}
          color="blue"
        />
        <MetricCard
          title="Completion Rate"
          value={`${summary.performance.completionRate.toFixed(1)}%`}
          change={0}
          trend="neutral"
          icon={<ClipboardDocumentListIcon className="w-8 h-8" />}
          color="green"
        />
        <MetricCard
          title="Team Velocity"
          value={`${summary.performance.averageVelocity.toFixed(1)}/day`}
          changeLabel="tasks per day"
          trend="stable"
          icon={<ArrowTrendingUpIcon className="w-8 h-8" />}
          color="purple"
        />
        <MetricCard
          title="Team Members"
          value={teamMetrics.totalMembers}
          change={0}
          trend="neutral"
          icon={<UserGroupIcon className="w-8 h-8" />}
          color="yellow"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget
          title="Task Distribution by Status"
          description="Current status of all tasks across projects"
          data={{
            labels: Object.keys(taskMetrics.statusDistribution),
            datasets: [{
              data: Object.values(taskMetrics.statusDistribution),
              backgroundColor: [
                '#10b981', // green for DONE
                '#3b82f6', // blue for IN_PROGRESS
                '#fbbf24', // yellow for PENDING
                '#ef4444', // red for BLOCKED
                '#8b5cf6', // purple for REVIEW
                '#6b7280', // gray for CANCELLED
                '#f59e0b', // orange for DEFERRED
              ],
            }]
          }}
          config={{
            chartType: 'doughnut',
            showLegend: true,
          }}
        />
        <ChartWidget
          title="Task Priority Breakdown"
          description="Distribution of tasks by priority level"
          data={{
            labels: Object.keys(taskMetrics.priorityDistribution),
            datasets: [{
              data: Object.values(taskMetrics.priorityDistribution),
              backgroundColor: [
                '#10b981', // green for LOW
                '#3b82f6', // blue for MEDIUM
                '#f59e0b', // orange for HIGH
                '#ef4444', // red for CRITICAL
              ],
            }]
          }}
          config={{
            chartType: 'pie',
            showLegend: true,
          }}
        />
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget
          title="Team Velocity"
          description="Tasks completed over time"
          data={{
            labels: velocityData.map(d => d.period),
            datasets: [{
              label: 'Tasks Completed',
              data: velocityData.map(d => d.tasksCompleted),
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: '#3b82f6',
              fill: true,
            }]
          }}
          config={{
            chartType: 'area',
            showLegend: false,
            showGrid: true,
          }}
        />
        <ChartWidget
          title="Project Health Scores"
          description="Overall health of active projects"
          data={{
            labels: projectMetrics.map(p => p.name),
            datasets: [{
              label: 'Health Score',
              data: projectMetrics.map(p => p.healthScore),
              backgroundColor: projectMetrics.map(p => 
                p.healthScore >= 80 ? '#10b981' : 
                p.healthScore >= 60 ? '#fbbf24' : '#ef4444'
              ),
            }]
          }}
          config={{
            chartType: 'bar',
            showLegend: false,
          }}
        />
      </div>

      {/* Burndown Chart */}
      <ChartWidget
        title="Progress Tracking"
        description="Track task completion over time"
        data={{
          labels: burndownData.map(d => d.date),
          datasets: [
            {
              label: 'Planned',
              data: burndownData.map(d => d.planned),
              borderColor: '#6b7280',
              backgroundColor: 'transparent',
              borderDash: [5, 5],
            },
            {
              label: 'Actual',
              data: burndownData.map(d => d.actual),
              borderColor: '#3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
            }
          ]
        }}
        config={{
          chartType: 'line',
          showLegend: true,
          showGrid: true,
        }}
        className="col-span-full"
      />

      {/* Project Overview */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Project Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectMetrics.map(project => (
            <div key={project.id} className="border rounded-lg p-4">
              <h3 className="font-medium text-foreground">{project.name}</h3>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between text-sm">
                  <span>Tasks:</span>
                  <span>{project.completedTasks}/{project.totalTasks}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Completion:</span>
                  <span>{project.completionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Health:</span>
                  <span className={`font-medium ${
                    project.healthScore >= 80 ? 'text-green-600' :
                    project.healthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {project.healthScore}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Performance */}
      {teamMetrics.members.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Team Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMetrics.members.map(member => (
              <div key={member.id} className="border rounded-lg p-4">
                <h3 className="font-medium text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground">{member.email}</p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>Assigned:</span>
                    <span>{member.tasksAssigned}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Completed:</span>
                    <span>{member.tasksCompleted}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Rate:</span>
                    <span className={`font-medium ${
                      member.completionRate >= 80 ? 'text-green-600' :
                      member.completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {member.completionRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations Section */}
      <div className="bg-card rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
        <div className="space-y-4">
          {summary.recommendations.map(rec => (
            <div key={rec.id} className="border-l-4 border-border pl-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{rec.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                  {rec.actionItems && rec.actionItems.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {rec.actionItems.map((item, idx) => (
                        <li key={idx} className="text-sm text-gray-600">
                          • {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {rec.estimatedImpact && (
                    <p className="text-sm text-green-600 mt-2">
                      Impact: {rec.estimatedImpact}
                    </p>
                  )}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    rec.priority === 'high'
                      ? 'bg-red-100 text-red-800'
                      : rec.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {rec.priority} priority
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performers */}
      {teamMetrics.topPerformers.length > 0 && (
        <div className="bg-card rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Top Performers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teamMetrics.topPerformers.slice(0, 3).map(member => (
              <div key={member.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <span className="text-lg font-medium text-gray-600">
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{member.name}</h4>
                  <p className="text-sm text-gray-500">
                    {member.tasksCompleted} tasks completed
                  </p>
                  <div className="flex items-center mt-1">
                    <span className="text-xs text-green-600">
                      {member.streak} day streak
                    </span>
                    <span className="mx-2 text-gray-300">•</span>
                    <span className="text-xs text-gray-500">
                      Score: {member.productivityScore}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}