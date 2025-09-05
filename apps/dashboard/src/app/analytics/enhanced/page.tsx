'use client';

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  ChartBarIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ChartWidget } from '@/components/analytics/ChartWidget';
import { MetricCard } from '@/components/analytics/MetricCard';
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
    description: 'Advanced web dashboard with analytics',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/task-master-dashboard',
    gitBranch: 'main',
    totalTasks: 45,
    completedTasks: 32,
    tags: ['dashboard', 'web', 'react', 'analytics'],
    memberCount: 4,
    lastActivity: new Date().toISOString(),
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
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
    name: 'API Gateway Service',
    description: 'Microservices API gateway with real-time monitoring',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/api-gateway',
    gitBranch: 'develop',
    totalTasks: 38,
    completedTasks: 28,
    tags: ['api', 'microservices', 'nodejs', 'monitoring'],
    memberCount: 3,
    lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    owner: {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
    },
    isTaskMasterProject: true,
    hasCustomRules: false,
    syncEnabled: true,
  },
  {
    id: '3',
    name: 'Mobile App Redesign',
    description: 'Complete UX/UI overhaul for mobile application',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/mobile-redesign',
    gitBranch: 'feature/new-design',
    totalTasks: 52,
    completedTasks: 18,
    tags: ['mobile', 'ux', 'ui', 'design'],
    memberCount: 5,
    lastActivity: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    owner: {
      id: '3',
      name: 'Bob Wilson',
      email: 'bob@example.com',
    },
    isTaskMasterProject: true,
    hasCustomRules: true,
    syncEnabled: true,
  },
];

// Generate realistic mock tasks with time series data
const generateMockTasks = (count: number): Task[] => {
  const statuses = ['pending', 'in-progress', 'review', 'done', 'blocked'] as const;
  const priorities = ['low', 'medium', 'high', 'critical'] as const;
  
  return Array.from({ length: count }, (_, i) => {
    const createdDaysAgo = Math.floor(Math.random() * 90);
    const updatedDaysAgo = Math.floor(Math.random() * createdDaysAgo);
    
    return {
      id: `${i + 1}`,
      projectId: mockProjects[i % mockProjects.length].id,
      title: `Task ${i + 1}: Implement feature ${String.fromCharCode(65 + (i % 26))}`,
      description: `Detailed description for task ${i + 1} with comprehensive requirements`,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      dependencies: i % 5 === 0 ? [`${Math.max(1, i - 2)}`] : [],
      subtasks: [],
      details: `Implementation details for task ${i + 1} with technical specifications`,
      testStrategy: `Testing approach for task ${i + 1} including unit and integration tests`,
      assignedTo: `user-${(i % 12) + 1}`,
      dueDate: new Date(Date.now() + (Math.random() * 60 - 30) * 24 * 60 * 60 * 1000).toISOString(),
      complexity: Math.floor(Math.random() * 10) + 1,
      createdAt: new Date(Date.now() - createdDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - updatedDaysAgo * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
};

const mockTasks = generateMockTasks(150);

const mockMembers = Array.from({ length: 12 }, (_, i) => ({
  id: `user-${i + 1}`,
  name: `Team Member ${i + 1}`,
  email: `member${i + 1}@example.com`,
  avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 1}`,
}));

function classNames(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default function EnhancedAnalyticsPage() {
  const [activeTab, setActiveTab] = useState(0);
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting');

  useEffect(() => {
    // Simulate connection status change
    setConnectionStatus('connecting');
    setTimeout(() => {
      setConnectionStatus('connected');
    }, 2000);

    // Calculate analytics data
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
    const burndownData = AnalyticsService.generateBurndownData(
      mockTasks,
      startDate,
      endDate
    );
    setBurndownData(burndownData);
    
    setLoading(false);
  }, []);

  const handleExportReport = async () => {
    console.log('Export feature coming soon...');
    alert('Export feature coming soon!');
  };

  if (loading || !summary || !taskMetrics || !teamMetrics) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading enhanced analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SparklesIcon className="w-8 h-8 text-blue-600" />
            Enhanced Analytics Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Advanced analytics with real-time insights, predictive modeling, and interactive visualizations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-gray-600">
              {connectionStatus === 'connected' ? 'Live Data' : 'Connecting...'}
            </span>
          </div>
          <button
            onClick={handleExportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics with Enhanced Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={summary.overview.totalProjects}
          change={15.3}
          trend="up"
          icon={<ChartBarIcon className="w-8 h-8" />}
          color="blue"
        />
        <MetricCard
          title="Completion Rate"
          value={`${summary.performance.completionRate.toFixed(1)}%`}
          change={8.2}
          trend="up"
          icon={<ClipboardDocumentListIcon className="w-8 h-8" />}
          color="green"
        />
        <MetricCard
          title="Average Velocity"
          value={`${summary.performance.averageVelocity.toFixed(1)}`}
          changeLabel="tasks per day"
          trend="up"
          icon={<ArrowTrendingUpIcon className="w-8 h-8" />}
          color="purple"
        />
        <MetricCard
          title="Health Score"
          value={`${summary.overview.overallHealthScore.toFixed(0)}%`}
          change={summary.overview.overallHealthScore > 75 ? 5.4 : -2.1}
          trend={summary.overview.overallHealthScore > 75 ? 'up' : 'down'}
          icon={<UserGroupIcon className="w-8 h-8" />}
          color="yellow"
        />
      </div>

      {/* Enhanced Tabs */}
      <Tab.Group selectedIndex={['overview', 'teams', 'projects', 'trends'].indexOf(activeTab)} onChange={(index) => setActiveTab(['overview', 'teams', 'projects', 'trends'][index])}>
        <Tab.List className="flex space-x-1 rounded-xl bg-white p-1 shadow-sm mb-6">
          {[
            { key: 'overview', label: 'Overview' },
            { key: 'teams', label: 'Team Analytics' },
            { key: 'projects', label: 'Project Comparison' },
            { key: 'trends', label: 'Trends & Predictions' }
          ].map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                `w-full rounded-lg py-2.5 px-4 text-sm font-medium leading-5 ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2 ${
                  selected
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`
              }
            >
              {tab.label}
            </Tab>
          ))}
        </Tab.List>

        <Tab.Panels>
          <Tab.Panel className="space-y-6">
          {/* Enhanced Charts with Interactive Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWidget
              title="Task Status Distribution"
              description="Real-time task status across all projects"
              data={AnalyticsService.generateChartData('taskStatus', taskMetrics)}
              config={{
                chartType: 'doughnut',
                showLegend: true,
              }}
            />

            <ChartWidget
              title="Team Velocity Trends"
              description="Historical velocity with trend analysis"
              data={AnalyticsService.generateChartData('velocity', velocityData)}
              config={{
                chartType: 'line',
                showLegend: false,
                showGrid: true,
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartWidget
              title="Project Health Analysis"
              description="Multi-dimensional project health assessment"
              data={AnalyticsService.generateChartData('projectHealth', projectMetrics)}
              config={{
                chartType: 'bar',
                showLegend: true,
              }}
            />

            <ChartWidget
              title="Sprint Burndown Analysis"
              description="Progress tracking with completion forecasting"
              data={AnalyticsService.generateChartData('burndown', burndownData)}
              config={{
                chartType: 'line',
                showLegend: true,
                showGrid: true,
              }}
            />
          </div>
          </Tab.Panel>

          <Tab.Panel>
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <UsersIcon className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Performance Analytics</h3>
              <p className="text-gray-600 mb-6">
                Advanced team comparison features with individual metrics, productivity scoring, and collaboration analysis.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-blue-50 p-4 rounded">
                  <div className="font-semibold text-blue-900">Frontend Team</div>
                  <div className="text-blue-700">Velocity: 8.2 tasks/week</div>
                </div>
                <div className="bg-green-50 p-4 rounded">
                  <div className="font-semibold text-green-900">Backend Team</div>
                  <div className="text-green-700">Velocity: 9.1 tasks/week</div>
                </div>
                <div className="bg-purple-50 p-4 rounded">
                  <div className="font-semibold text-purple-900">DevOps Team</div>
                  <div className="text-purple-700">Velocity: 6.5 tasks/week</div>
                </div>
              </div>
            </div>
          </Tab.Panel>

          <Tab.Panel>
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <ChartBarIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Project Comparison Dashboard</h3>
              <p className="text-gray-600 mb-6">
                Multi-project overlay analysis with burndown charts, risk assessment, and predictive analytics.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockProjects.slice(0, 2).map((project, index) => (
                  <div key={project.id} className="bg-gray-50 p-6 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">{project.name}</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>Progress: {Math.round((project.completedTasks / project.totalTasks) * 100)}%</div>
                      <div>Health Score: {85 + index * 5}%</div>
                      <div>Team Size: {project.memberCount} members</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Tab.Panel>

          <Tab.Panel className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <SparklesIcon className="w-16 h-16 text-purple-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Predictions</h3>
              <p className="text-gray-600 mb-6">
                Machine learning forecasts, trend analysis, and intelligent recommendations.
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
                <ChartWidget
                  title="Completion Forecast"
                  description="Predicted task completion timeline"
                  data={AnalyticsService.generateChartData('velocity', velocityData)}
                  config={{
                    chartType: 'line',
                    showLegend: true,
                    showGrid: true,
                  }}
                />
                
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50 p-6 rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-4">Smart Insights</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-green-700">Sprint on Track</div>
                        <div className="text-gray-600">82% confidence - completion in 5 days</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-yellow-700">Resource Alert</div>
                        <div className="text-gray-600">Frontend team approaching capacity</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                      <div>
                        <div className="font-medium text-blue-700">Optimization</div>
                        <div className="text-gray-600">Consider parallelizing tasks 15-18</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>

      {/* Enhanced Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <SparklesIcon className="w-5 h-5 text-blue-600" />
            AI-Powered Insights
          </h2>
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
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{insight.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    {insight.value && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {insight.value}
                        </span>
                        {insight.change && (
                          <span className={`text-sm px-2 py-1 rounded ${
                            insight.change > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {insight.change > 0 ? '+' : ''}{insight.change}%
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    insight.impact === 'high' ? 'bg-red-100 text-red-700' :
                    insight.impact === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {insight.impact} impact
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Smart Recommendations</h2>
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
                          <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                            <span className="text-blue-500 mt-1">→</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    )}
                    {rec.estimatedImpact && (
                      <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                        <strong>Estimated Impact:</strong> {rec.estimatedImpact}
                      </div>
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
                    {rec.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Connection Status Footer */}
      <div className="text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()} • 
        Connection: {connectionStatus} • 
        Data refreshes every 30 seconds
      </div>
    </div>
  );
}