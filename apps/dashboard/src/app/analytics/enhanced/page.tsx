'use client';

import React, { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  ClipboardDocumentListIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  DocumentArrowDownIcon,
  AdjustmentsHorizontalIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { EnhancedChartWidget } from '@/components/analytics/EnhancedChartWidget';
import { MetricCard } from '@/components/analytics/MetricCard';
import { DateRangeSelector, DateRange } from '@/components/analytics/DateRangeSelector';
import { TeamPerformanceComparison } from '@/components/analytics/TeamPerformanceComparison';
import { ProjectComparisonDashboard } from '@/components/analytics/ProjectComparisonDashboard';
import { reportExportService } from '@/lib/services/report-export.service';
import { useRealtimeAnalytics } from '@/lib/services/realtime-analytics.service';
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
import { subDays, format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export default function EnhancedAnalyticsPage() {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
    label: 'Last 30 days',
    preset: 'last30days',
  });
  
  const [activeTab, setActiveTab] = useState('overview');
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [projectMetrics, setProjectMetrics] = useState<ProjectMetrics[]>([]);
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [teamMetrics, setTeamMetrics] = useState<TeamMetrics | null>(null);
  const [velocityData, setVelocityData] = useState<VelocityData[]>([]);
  const [burndownData, setBurndownData] = useState<BurndownData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Real-time analytics hook
  const { subscribe, unsubscribe, getConnectionStatus } = useRealtimeAnalytics();

  useEffect(() => {
    // Calculate analytics data
    const calculateAnalytics = () => {
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

      const burndownData = AnalyticsService.generateBurndownData(
        mockTasks,
        dateRange.start,
        dateRange.end
      );
      setBurndownData(burndownData);
      
      setLoading(false);
    };

    calculateAnalytics();

    // Set up real-time subscription
    const subscriptionId = subscribe({
      type: 'task_metrics',
      callback: (data) => {
        console.log('Real-time analytics update:', data);
        calculateAnalytics(); // Recalculate on updates
      },
      refreshInterval: 30, // 30 seconds
    });

    return () => {
      unsubscribe(subscriptionId);
    };
  }, [dateRange, subscribe, unsubscribe]);

  const handleExportReport = async () => {
    if (!summary || !taskMetrics || !teamMetrics) return;

    setExporting(true);
    try {
      const exportData = {
        summary,
        projectMetrics,
        taskMetrics,
        teamMetrics: [teamMetrics],
        charts: [], // Would include chart images in real implementation
      };

      await reportExportService.exportAnalyticsReport(exportData, {
        format: 'pdf',
        includeCharts: true,
        template: 'executive',
        branding: {
          companyName: 'Task Master Analytics',
          colors: {
            primary: '#3B82F6',
            secondary: '#10B981',
          },
        },
        dateRange: {
          start: dateRange.start,
          end: dateRange.end,
        },
      });
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
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
              getConnectionStatus() === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-gray-600">
              {getConnectionStatus() === 'connected' ? 'Live Data' : 'Offline'}
            </span>
          </div>
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            className="w-64"
          />
          <button
            onClick={handleExportReport}
            disabled={exporting}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            <DocumentArrowDownIcon className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export Report'}
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full lg:w-auto grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Team Analytics</TabsTrigger>
          <TabsTrigger value="projects">Project Comparison</TabsTrigger>
          <TabsTrigger value="trends">Trends & Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Enhanced Charts with Interactive Features */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedChartWidget
              id="task-status-distribution"
              title="Task Status Distribution"
              description="Real-time task status across all projects"
              data={AnalyticsService.generateChartData('taskStatus', taskMetrics)}
              config={{
                chartType: 'doughnut',
                showLegend: true,
                refreshInterval: 30,
              }}
              realTimeData={true}
              showControls={true}
              insights={{
                trend: summary.performance.productivityTrend === 'improving' ? 'up' : 'down',
                change: 12.5,
                period: 'this week',
                significance: 'medium',
                description: 'Task completion velocity has increased by 12.5% this week',
              }}
            />

            <EnhancedChartWidget
              id="velocity-trends"
              title="Team Velocity Trends"
              description="Historical velocity with predictive forecasting"
              data={AnalyticsService.generateChartData('velocity', velocityData)}
              config={{
                chartType: 'line',
                showLegend: false,
                showGrid: true,
                refreshInterval: 60,
              }}
              realTimeData={true}
              showControls={true}
              predictiveData={{
                datasets: [{
                  label: 'Predicted Velocity',
                  data: velocityData.slice(-4).map((_, i) => 
                    velocityData[velocityData.length - 1].tasksCompleted * (1 + i * 0.05)
                  ),
                  borderColor: '#10B981',
                  borderDash: [5, 5],
                }]
              }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EnhancedChartWidget
              id="project-health-scores"
              title="Project Health Analysis"
              description="Multi-dimensional project health assessment"
              data={AnalyticsService.generateChartData('projectHealth', projectMetrics)}
              config={{
                chartType: 'radar',
                showLegend: true,
              }}
              showControls={true}
              annotations={[
                {
                  type: 'line',
                  mode: 'horizontal',
                  scaleID: 'y',
                  value: 75,
                  borderColor: '#EF4444',
                  borderWidth: 2,
                  label: {
                    content: 'Critical Threshold',
                    enabled: true,
                  },
                },
              ]}
            />

            <EnhancedChartWidget
              id="burndown-analysis"
              title="Sprint Burndown with Predictions"
              description="Progress tracking with AI-powered completion forecasting"
              data={AnalyticsService.generateChartData('burndown', burndownData)}
              config={{
                chartType: 'line',
                showLegend: true,
                showGrid: true,
              }}
              showControls={true}
              predictiveData={{
                datasets: [{
                  label: 'AI Predicted',
                  data: burndownData.map(b => b.predicted || null),
                  borderColor: '#8B5CF6',
                  borderDash: [10, 5],
                }]
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <TeamPerformanceComparison
            teams={['team-1', 'team-2', 'team-3', 'team-4', 'team-5']}
            showIndividualMetrics={true}
            enableComparison={true}
          />
        </TabsContent>

        <TabsContent value="projects" className="mt-6">
          <ProjectComparisonDashboard
            projects={mockProjects.map(p => p.id)}
            enablePredictions={true}
            showBurndown={true}
          />
        </TabsContent>

        <TabsContent value="trends" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 gap-6">
            <EnhancedChartWidget
              id="predictive-analytics"
              title="Predictive Analytics Dashboard"
              description="AI-powered forecasts and trend analysis"
              data={{
                labels: Array.from({ length: 30 }, (_, i) => 
                  format(new Date(Date.now() + i * 24 * 60 * 60 * 1000), 'MMM d')
                ),
                datasets: [
                  {
                    label: 'Historical Completion Rate',
                    data: Array.from({ length: 15 }, () => 
                      60 + Math.random() * 20
                    ).concat(Array(15).fill(null)),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                  },
                  {
                    label: 'Predicted Completion Rate',
                    data: Array(15).fill(null).concat(
                      Array.from({ length: 15 }, (_, i) => 
                        75 + Math.sin(i / 3) * 5 + Math.random() * 3
                      )
                    ),
                    borderColor: '#10B981',
                    borderDash: [5, 5],
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  },
                ],
              }}
              config={{
                chartType: 'line',
                showLegend: true,
                showGrid: true,
              }}
              showControls={true}
            />
          </div>
        </TabsContent>
      </Tabs>

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
        Last updated: {format(new Date(), 'PPpp')} • 
        Connection: {getConnectionStatus()} • 
        Data refreshes every 30 seconds
      </div>
    </div>
  );
}