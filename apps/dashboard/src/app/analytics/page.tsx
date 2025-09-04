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
import { AnalyticsService } from '@/lib/services/analytics.service';
import { 
  AnalyticsSummary,
  ProjectMetrics,
  TaskMetrics,
  TeamMetrics,
  VelocityData,
  BurndownData,
} from '@/types/analytics';
import { Task } from '@/types/task';
import { Project } from '@/types/project';

// Mock data - in production, this would come from API
const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Task Master Dashboard',
    description: 'Web dashboard for Task Master projects',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/task-master-dashboard',
    gitBranch: 'main',
    totalTasks: 25,
    completedTasks: 16,
    tags: ['dashboard', 'web', 'react'],
    memberCount: 2,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    isTaskMasterProject: true,
    hasCustomRules: true,
    syncEnabled: true,
  },
  {
    id: '2',
    name: 'Task Master CLI',
    description: 'Command-line interface for Task Master',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/task-master-cli',
    gitBranch: 'develop',
    totalTasks: 42,
    completedTasks: 38,
    tags: ['cli', 'nodejs', 'typescript'],
    memberCount: 3,
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    owner: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    isTaskMasterProject: true,
    hasCustomRules: false,
    syncEnabled: true,
  },
];

const mockTasks: Task[] = [
  // Generate mock tasks with various statuses and dates
  ...Array.from({ length: 50 }, (_, i) => ({
    id: `${i + 1}`,
    projectId: i % 2 === 0 ? '1' : '2',
    title: `Task ${i + 1}`,
    description: `Description for task ${i + 1}`,
    status: ['pending', 'in-progress', 'review', 'done', 'blocked'][i % 5] as any,
    priority: ['low', 'medium', 'high', 'critical'][i % 4] as any,
    dependencies: i % 3 === 0 ? [`${i}`] : [],
    subtasks: [],
    details: `Details for task ${i + 1}`,
    testStrategy: `Test strategy for task ${i + 1}`,
    assignedTo: `${(i % 3) + 1}`,
    dueDate: new Date(Date.now() + (i - 25) * 86400000).toISOString(),
    complexity: (i % 10) + 1,
    createdAt: new Date(Date.now() - (50 - i) * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - (25 - i) * 86400000).toISOString(),
  })),
];

const mockMembers = [
  { id: '1', name: 'John Doe', email: 'john@example.com' },
  { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  { id: '3', name: 'Bob Johnson', email: 'bob@example.com' },
];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'quarter' | 'year'>('month');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);

  useEffect(() => {
    // Calculate all analytics data
    const summary = AnalyticsService.generateAnalyticsSummary(
      mockProjects,
      mockTasks,
      mockMembers
    );
    setSummary(summary);

    const projectMetrics = mockProjects.map(project =>
      AnalyticsService.calculateProjectMetrics(project, mockTasks)
    );
    setProjectMetrics(projectMetrics);

    const taskMetrics = AnalyticsService.calculateTaskMetrics(mockTasks);
    setTaskMetrics(taskMetrics);

    const teamMetrics = AnalyticsService.calculateTeamMetrics(mockTasks, mockMembers);
    setTeamMetrics(teamMetrics);

    const velocityData = AnalyticsService.generateVelocityData(mockTasks, 'week');
    setVelocityData(velocityData);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    const burndownData = AnalyticsService.generateBurndownData(
      mockTasks,
      startDate,
      endDate
    );
    setBurndownData(burndownData);
  }, [timeRange]);

  if (!summary || !taskMetrics || !teamMetrics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Track productivity, project health, and team performance
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
            <AdjustmentsHorizontalIcon className="w-4 h-4 mr-2" />
            Customize
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={summary.overview.totalProjects}
          change={12}
          trend="up"
          icon={<ChartBarIcon className="w-8 h-8" />}
          color="blue"
        />
        <MetricCard
          title="Completion Rate"
          value={`${summary.performance.completionRate.toFixed(1)}%`}
          change={5.2}
          trend="up"
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
          title="Active Members"
          value={teamMetrics.activeMembers}
          changeLabel={`of ${teamMetrics.teamSize} total`}
          icon={<UserGroupIcon className="w-8 h-8" />}
          color="yellow"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartWidget
          title="Task Distribution by Status"
          description="Current status of all tasks across projects"
          data={AnalyticsService.generateChartData('taskStatus', taskMetrics)}
          config={{
            chartType: 'doughnut',
            showLegend: true,
          }}
        />
        <ChartWidget
          title="Task Priority Breakdown"
          description="Distribution of tasks by priority level"
          data={AnalyticsService.generateChartData('taskPriority', taskMetrics)}
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
          data={AnalyticsService.generateChartData('velocity', velocityData)}
          config={{
            chartType: 'area',
            showLegend: false,
            showGrid: true,
          }}
        />
        <ChartWidget
          title="Project Health Scores"
          description="Overall health of active projects"
          data={AnalyticsService.generateChartData('projectHealth', projectMetrics)}
          config={{
            chartType: 'bar',
            showLegend: false,
          }}
        />
      </div>

      {/* Burndown Chart */}
      <ChartWidget
        title="Sprint Burndown"
        description="Track progress towards sprint completion"
        data={AnalyticsService.generateChartData('burndown', burndownData)}
        config={{
          chartType: 'line',
          showLegend: true,
          showGrid: true,
        }}
        className="col-span-full"
      />

      {/* Insights Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Key Insights</h2>
        <div className="space-y-4">
          {summary.insights.map(insight => (
            <div
              key={insight.id}
              className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'positive'
                  ? 'bg-green-50 border-green-500'
                  : insight.type === 'negative'
                  ? 'bg-red-50 border-red-500'
                  : 'bg-blue-50 border-blue-500'
              }`}
            >
              <h3 className="font-medium text-gray-900">{insight.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
              {insight.value && (
                <div className="mt-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {insight.value}
                  </span>
                  {insight.metric && (
                    <span className="text-sm text-gray-500 ml-2">{insight.metric}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
        <div className="space-y-4">
          {summary.recommendations.map(rec => (
            <div key={rec.id} className="border-l-4 border-gray-300 pl-4">
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
        <div className="bg-white rounded-lg shadow-sm p-6">
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