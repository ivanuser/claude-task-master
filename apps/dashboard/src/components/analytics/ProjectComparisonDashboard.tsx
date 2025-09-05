'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EnhancedChartWidget } from './EnhancedChartWidget';
import { MetricCard } from './MetricCard';
import { DateRangeSelector, DateRange, ComparisonDateRangeSelector } from './DateRangeSelector';
import {
  FolderIcon,
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowPathIcon,
  EyeIcon,
  AdjustmentsHorizontalIcon,
  DocumentChartBarIcon,
} from '@heroicons/react/24/outline';
import { format, subDays } from 'date-fns';
import { ChartData, ProjectMetrics, VelocityData, BurndownData } from '@/types/analytics';

interface ProjectComparison {
  project: ProjectMetrics;
  velocityData: VelocityData[];
  burndownData: BurndownData[];
  trends: {
    velocity: 'up' | 'down' | 'stable';
    health: 'up' | 'down' | 'stable';
    completion: 'up' | 'down' | 'stable';
  };
  insights: {
    riskLevel: 'low' | 'medium' | 'high';
    predictedCompletion: Date;
    recommendations: string[];
    strengths: string[];
    concerns: string[];
  };
}

interface ProjectComparisonDashboardProps {
  projects: string[];
  className?: string;
  onProjectSelect?: (projectId: string) => void;
  enablePredictions?: boolean;
  showBurndown?: boolean;
}

export function ProjectComparisonDashboard({
  projects,
  className = '',
  onProjectSelect,
  enablePredictions = true,
  showBurndown = true,
}: ProjectComparisonDashboardProps) {
  const [primaryRange, setPrimaryRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
    label: 'Last 30 days',
    preset: 'last30days',
  });
  const [comparisonRange, setComparisonRange] = useState<DateRange | null>(null);
  const [selectedProjects, setSelectedProjects] = useState<string[]>(projects.slice(0, 4));
  const [viewMode, setViewMode] = useState<'overlay' | 'sideBySide' | 'normalized'>('overlay');
  const [metricFocus, setMetricFocus] = useState<'all' | 'velocity' | 'health' | 'completion'>('all');
  const [projectComparisons, setProjectComparisons] = useState<ProjectComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock data generation
  useEffect(() => {
    const generateMockProjectData = (): ProjectComparison[] => {
      const mockProjects = [
        { id: 'proj-1', name: 'E-commerce Platform', color: '#3B82F6' },
        { id: 'proj-2', name: 'Mobile App Redesign', color: '#10B981' },
        { id: 'proj-3', name: 'API Gateway', color: '#F59E0B' },
        { id: 'proj-4', name: 'Analytics Dashboard', color: '#8B5CF6' },
        { id: 'proj-5', name: 'User Management', color: '#EC4899' },
        { id: 'proj-6', name: 'Payment System', color: '#EF4444' },
      ];

      return mockProjects.map(project => {
        const totalTasks = Math.floor(Math.random() * 200) + 50;
        const completedTasks = Math.floor(totalTasks * (0.3 + Math.random() * 0.6));
        const inProgressTasks = Math.floor((totalTasks - completedTasks) * 0.4);
        const pendingTasks = Math.floor((totalTasks - completedTasks - inProgressTasks) * 0.7);
        const blockedTasks = totalTasks - completedTasks - inProgressTasks - pendingTasks;
        
        const completionRate = (completedTasks / totalTasks) * 100;
        const velocity = Math.random() * 5 + 2;
        const healthScore = 40 + Math.random() * 55;

        // Generate velocity data for last 12 periods
        const velocityData: VelocityData[] = Array.from({ length: 12 }, (_, i) => ({
          period: `Week ${12 - i}`,
          tasksCompleted: Math.floor(velocity * 7 + (Math.random() - 0.5) * 10),
          storyPoints: Math.floor(velocity * 7 * 2.5 + (Math.random() - 0.5) * 20),
          averageCycleTime: 2 + Math.random() * 3,
          throughput: velocity + (Math.random() - 0.5) * 2,
        }));

        // Generate burndown data
        const startDate = subDays(new Date(), 30);
        const endDate = new Date();
        const burndownData: BurndownData[] = Array.from({ length: 31 }, (_, i) => {
          const ideal = Math.max(0, totalTasks - (totalTasks / 30 * i));
          const actual = Math.max(0, totalTasks - completedTasks - Math.floor(Math.random() * 20));
          const predicted = i > 15 ? Math.max(0, actual - velocity * (30 - i)) : undefined;
          
          return {
            date: format(subDays(endDate, 30 - i), 'yyyy-MM-dd'),
            ideal,
            actual,
            predicted,
            scope: totalTasks,
          };
        });

        const projectMetrics: ProjectMetrics = {
          projectId: project.id,
          projectName: project.name,
          totalTasks,
          completedTasks,
          inProgressTasks,
          pendingTasks,
          blockedTasks,
          completionRate,
          averageTaskDuration: 2 + Math.random() * 4,
          velocity,
          healthScore,
          lastActivity: new Date().toISOString(),
          trending: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
        };

        const riskLevel: 'low' | 'medium' | 'high' = 
          healthScore > 75 ? 'low' : 
          healthScore > 50 ? 'medium' : 'high';

        const daysRemaining = Math.ceil((totalTasks - completedTasks) / velocity);
        const predictedCompletion = new Date();
        predictedCompletion.setDate(predictedCompletion.getDate() + daysRemaining);

        return {
          project: projectMetrics,
          velocityData,
          burndownData,
          trends: {
            velocity: velocityData[velocityData.length - 1].throughput > velocityData[velocityData.length - 2].throughput ? 'up' : 'down',
            health: projectMetrics.trending,
            completion: completionRate > 70 ? 'up' : completionRate > 40 ? 'stable' : 'down',
          },
          insights: {
            riskLevel,
            predictedCompletion,
            recommendations: [
              riskLevel === 'high' ? 'Consider reallocating resources' : 'Maintain current pace',
              blockedTasks > 5 ? 'Address blocked tasks immediately' : 'Continue monitoring progress',
              velocity < 3 ? 'Review and optimize workflow' : 'Velocity is healthy',
            ],
            strengths: [
              completionRate > 70 ? 'Strong completion rate' : null,
              velocity > 4 ? 'High velocity' : null,
              blockedTasks < 3 ? 'Low blocking issues' : null,
            ].filter(Boolean) as string[],
            concerns: [
              completionRate < 40 ? 'Low completion rate' : null,
              blockedTasks > 10 ? 'High number of blocked tasks' : null,
              healthScore < 50 ? 'Poor health score' : null,
            ].filter(Boolean) as string[],
          },
        };
      });
    };

    setLoading(true);
    setTimeout(() => {
      const data = generateMockProjectData();
      setProjectComparisons(data);
      setLoading(false);
    }, 1000);
  }, [primaryRange, comparisonRange]);

  // Generate overlay comparison chart
  const overlayChartData = useMemo((): ChartData => {
    const filteredProjects = projectComparisons.filter(proj => 
      selectedProjects.includes(proj.project.projectId)
    );

    if (metricFocus === 'velocity') {
      // Velocity over time
      const labels = filteredProjects[0]?.velocityData.map(v => v.period) || [];
      return {
        labels,
        datasets: filteredProjects.map((proj, index) => ({
          label: `${proj.project.projectName} Velocity`,
          data: proj.velocityData.map(v => v.throughput),
          borderColor: getProjectColor(index),
          backgroundColor: `${getProjectColor(index)}20`,
          fill: false,
          tension: 0.4,
        })),
      };
    }

    // Default: comparison metrics
    return {
      labels: filteredProjects.map(proj => proj.project.projectName),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: filteredProjects.map(proj => proj.project.completionRate),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
        },
        {
          label: 'Health Score',
          data: filteredProjects.map(proj => proj.project.healthScore),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
        },
        {
          label: 'Velocity',
          data: filteredProjects.map(proj => proj.project.velocity),
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 2,
        },
      ],
    };
  }, [projectComparisons, selectedProjects, metricFocus]);

  // Generate burndown overlay chart
  const burndownOverlayData = useMemo((): ChartData => {
    const filteredProjects = projectComparisons.filter(proj => 
      selectedProjects.includes(proj.project.projectId)
    );

    if (filteredProjects.length === 0) return { labels: [], datasets: [] };

    const labels = filteredProjects[0].burndownData.map(b => 
      format(new Date(b.date), 'MMM d')
    );

    const datasets = [];

    // Add each project's actual burndown
    filteredProjects.forEach((proj, index) => {
      datasets.push({
        label: `${proj.project.projectName} Actual`,
        data: proj.burndownData.map(b => b.actual),
        borderColor: getProjectColor(index),
        backgroundColor: `${getProjectColor(index)}20`,
        fill: false,
        tension: 0.3,
      });

      // Add predicted if enabled
      if (enablePredictions) {
        datasets.push({
          label: `${proj.project.projectName} Predicted`,
          data: proj.burndownData.map(b => b.predicted || null),
          borderColor: getProjectColor(index),
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          fill: false,
          tension: 0.3,
          pointRadius: 0,
        });
      }
    });

    // Add ideal line (using first project as reference)
    datasets.push({
      label: 'Ideal',
      data: filteredProjects[0].burndownData.map(b => b.ideal),
      borderColor: '#9CA3AF',
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderDash: [10, 5],
      fill: false,
      tension: 0,
      pointRadius: 0,
    });

    return { labels, datasets };
  }, [projectComparisons, selectedProjects, enablePredictions]);

  const getProjectColor = (index: number): string => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];
    return colors[index % colors.length];
  };

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 2000);
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up': return <TrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down': return <TrendingDownIcon className="w-4 h-4 text-red-500" />;
      default: return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <DocumentChartBarIcon className="w-6 h-6" />
            Project Comparison Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Compare project performance with overlay charts and predictive analytics
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="overlay">Overlay</option>
            <option value="sideBySide">Side by Side</option>
            <option value="normalized">Normalized</option>
          </select>
        </div>
      </div>

      {/* Date Range Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <ComparisonDateRangeSelector
          primaryRange={primaryRange}
          comparisonRange={comparisonRange}
          onPrimaryChange={setPrimaryRange}
          onComparisonChange={setComparisonRange}
          enableComparison={true}
        />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Focus:</span>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Metrics' },
                { value: 'velocity', label: 'Velocity' },
                { value: 'health', label: 'Health' },
                { value: 'completion', label: 'Completion' },
              ].map(option => (
                <button
                  key={option.value}
                  onClick={() => setMetricFocus(option.value as any)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    metricFocus === option.value
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <EyeIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {selectedProjects.length} of {projectComparisons.length} projects selected
            </span>
          </div>
        </div>
      </div>

      {/* Project Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4">Select Projects to Compare</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectComparisons.map((comparison, index) => (
            <div
              key={comparison.project.projectId}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedProjects.includes(comparison.project.projectId)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleProjectToggle(comparison.project.projectId)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getProjectColor(index) }}
                  />
                  <h4 className="font-medium text-gray-900">
                    {comparison.project.projectName}
                  </h4>
                </div>
                <span className={`px-2 py-1 text-xs rounded border ${getRiskColor(comparison.insights.riskLevel)}`}>
                  {comparison.insights.riskLevel} risk
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">{comparison.project.completionRate.toFixed(0)}%</span>
                    {getTrendIcon(comparison.trends.completion)}
                  </div>
                  <div className="text-gray-600 text-xs">Completion</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">{comparison.project.velocity.toFixed(1)}</span>
                    {getTrendIcon(comparison.trends.velocity)}
                  </div>
                  <div className="text-gray-600 text-xs">Velocity</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <span className="font-medium">{comparison.project.healthScore.toFixed(0)}</span>
                    {getTrendIcon(comparison.trends.health)}
                  </div>
                  <div className="text-gray-600 text-xs">Health</div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600">
                  Predicted completion: {format(comparison.insights.predictedCompletion, 'MMM d, yyyy')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Metrics */}
      {selectedProjects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Projects Compared"
            value={selectedProjects.length}
            icon={<FolderIcon className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Total Tasks"
            value={projectComparisons
              .filter(proj => selectedProjects.includes(proj.project.projectId))
              .reduce((sum, proj) => sum + proj.project.totalTasks, 0)}
            icon={<ChartBarIcon className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            title="Avg Completion"
            value={`${(projectComparisons
              .filter(proj => selectedProjects.includes(proj.project.projectId))
              .reduce((sum, proj) => sum + proj.project.completionRate, 0) / selectedProjects.length
            ).toFixed(1)}%`}
            icon={<CheckCircleIcon className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="High Risk Projects"
            value={projectComparisons
              .filter(proj => selectedProjects.includes(proj.project.projectId))
              .filter(proj => proj.insights.riskLevel === 'high').length}
            icon={<ExclamationTriangleIcon className="w-5 h-5" />}
            color="red"
          />
        </div>
      )}

      {/* Main Comparison Charts */}
      {selectedProjects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnhancedChartWidget
            id="project-comparison-overlay"
            title={metricFocus === 'velocity' ? 'Velocity Comparison' : 'Performance Metrics Comparison'}
            description={`Compare ${metricFocus === 'all' ? 'key metrics' : metricFocus} across selected projects`}
            data={overlayChartData}
            config={{
              chartType: metricFocus === 'velocity' ? 'line' : 'bar',
              showLegend: true,
              showGrid: true,
            }}
            showControls={true}
            comparisonData={comparisonRange ? overlayChartData : undefined}
          />

          {showBurndown && (
            <EnhancedChartWidget
              id="project-burndown-overlay"
              title="Burndown Comparison"
              description="Compare project progress with ideal burndown"
              data={burndownOverlayData}
              config={{
                chartType: 'line',
                showLegend: true,
                showGrid: true,
              }}
              showControls={true}
              predictiveData={enablePredictions ? { datasets: burndownOverlayData.datasets.filter(d => d.label?.includes('Predicted')) } : undefined}
            />
          )}
        </div>
      )}

      {/* Project Insights */}
      {selectedProjects.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {projectComparisons
            .filter(proj => selectedProjects.includes(proj.project.projectId))
            .slice(0, 4)
            .map((comparison, index) => (
              <div key={comparison.project.projectId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: getProjectColor(index) }}
                    />
                    <h3 className="text-lg font-semibold">{comparison.project.projectName}</h3>
                  </div>
                  <button
                    onClick={() => onProjectSelect?.(comparison.project.projectId)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Details →
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Strengths */}
                  {comparison.insights.strengths.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-green-700 mb-2">Strengths</h4>
                      <ul className="text-sm text-green-600 space-y-1">
                        {comparison.insights.strengths.map((strength, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircleIcon className="w-3 h-3" />
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Concerns */}
                  {comparison.insights.concerns.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-700 mb-2">Concerns</h4>
                      <ul className="text-sm text-red-600 space-y-1">
                        {comparison.insights.concerns.map((concern, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            {concern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommendations */}
                  <div>
                    <h4 className="text-sm font-medium text-blue-700 mb-2">Recommendations</h4>
                    <ul className="text-sm text-blue-600 space-y-1">
                      {comparison.insights.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AdjustmentsHorizontalIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}