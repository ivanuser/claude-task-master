'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { EnhancedChartWidget } from './EnhancedChartWidget';
import { MetricCard } from './MetricCard';
import { DateRangeSelector, DateRange } from './DateRangeSelector';
import {
  UserGroupIcon,
  TrophyIcon,
  ChartBarIcon,
  ClockIcon,
  FireIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  UsersIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { format, subDays } from 'date-fns';
import { ChartData, TeamMetrics, TeamMember } from '@/types/analytics';

interface TeamComparison {
  teamId: string;
  teamName: string;
  metrics: TeamMetrics;
  members: TeamMember[];
  performance: {
    completionRate: number;
    averageVelocity: number;
    productivityTrend: 'up' | 'down' | 'stable';
    efficiencyScore: number;
    qualityScore: number;
    collaborationIndex: number;
  };
  highlights: {
    topPerformer: TeamMember;
    mostImproved: TeamMember;
    riskMembers: TeamMember[];
  };
}

interface TeamPerformanceComparisonProps {
  teams: string[];
  className?: string;
  onTeamSelect?: (teamId: string) => void;
  showIndividualMetrics?: boolean;
  enableComparison?: boolean;
}

export function TeamPerformanceComparison({
  teams,
  className = '',
  onTeamSelect,
  showIndividualMetrics = true,
  enableComparison = true,
}: TeamPerformanceComparisonProps) {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: subDays(new Date(), 30),
    end: new Date(),
    label: 'Last 30 days',
    preset: 'last30days',
  });
  const [selectedTeams, setSelectedTeams] = useState<string[]>(teams.slice(0, 3));
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'individual'>('overview');
  const [sortBy, setSortBy] = useState<'performance' | 'velocity' | 'quality' | 'collaboration'>('performance');
  const [teamComparisons, setTeamComparisons] = useState<TeamComparison[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data generation - in real app, this would fetch from API
  useEffect(() => {
    const generateMockTeamData = (): TeamComparison[] => {
      const mockTeams = [
        { id: 'team-1', name: 'Frontend Team', color: '#3B82F6' },
        { id: 'team-2', name: 'Backend Team', color: '#10B981' },
        { id: 'team-3', name: 'DevOps Team', color: '#F59E0B' },
        { id: 'team-4', name: 'QA Team', color: '#8B5CF6' },
        { id: 'team-5', name: 'Design Team', color: '#EC4899' },
      ];

      return mockTeams.map(team => {
        const teamSize = Math.floor(Math.random() * 8) + 3;
        const activeMembers = Math.floor(teamSize * (0.7 + Math.random() * 0.3));
        const completedTasks = Math.floor(Math.random() * 150) + 50;
        const totalTasks = Math.floor(completedTasks * (1.2 + Math.random() * 0.5));
        
        const members: TeamMember[] = Array.from({ length: teamSize }, (_, i) => ({
          id: `${team.id}-member-${i}`,
          name: `Team Member ${i + 1}`,
          email: `member${i + 1}@company.com`,
          tasksCompleted: Math.floor(Math.random() * 25) + 5,
          tasksInProgress: Math.floor(Math.random() * 5) + 1,
          averageCompletionTime: Math.random() * 5 + 1,
          productivityScore: Math.floor(Math.random() * 40) + 60,
          streak: Math.floor(Math.random() * 15),
        }));

        const completionRate = (completedTasks / totalTasks) * 100;
        const averageVelocity = completedTasks / 30; // tasks per day over 30 days
        const efficiencyScore = 70 + Math.random() * 25;
        const qualityScore = 75 + Math.random() * 20;
        const collaborationIndex = 60 + Math.random() * 35;

        return {
          teamId: team.id,
          teamName: team.name,
          metrics: {
            teamSize,
            activeMembers,
            totalTasksCompleted: completedTasks,
            averageTasksPerMember: completedTasks / teamSize,
            topPerformers: members.sort((a, b) => b.productivityScore - a.productivityScore).slice(0, 3),
            productivity: [], // Would be populated with time series data
            collaborationScore: collaborationIndex,
          },
          members,
          performance: {
            completionRate,
            averageVelocity,
            productivityTrend: Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down',
            efficiencyScore,
            qualityScore,
            collaborationIndex,
          },
          highlights: {
            topPerformer: members.reduce((prev, curr) => 
              prev.productivityScore > curr.productivityScore ? prev : curr
            ),
            mostImproved: members[Math.floor(Math.random() * members.length)],
            riskMembers: members.filter(m => m.productivityScore < 70),
          },
        };
      });
    };

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      const data = generateMockTeamData();
      setTeamComparisons(data);
      setLoading(false);
    }, 1000);
  }, [dateRange, selectedTeams]);

  // Generate comparison chart data
  const comparisonChartData = useMemo((): ChartData => {
    const filteredTeams = teamComparisons.filter(team => 
      selectedTeams.includes(team.teamId)
    );

    return {
      labels: filteredTeams.map(team => team.teamName),
      datasets: [
        {
          label: 'Completion Rate (%)',
          data: filteredTeams.map(team => team.performance.completionRate),
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
        },
        {
          label: 'Efficiency Score',
          data: filteredTeams.map(team => team.performance.efficiencyScore),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
        },
        {
          label: 'Quality Score',
          data: filteredTeams.map(team => team.performance.qualityScore),
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 2,
        },
      ],
    };
  }, [teamComparisons, selectedTeams]);

  // Generate velocity comparison data
  const velocityChartData = useMemo((): ChartData => {
    const filteredTeams = teamComparisons.filter(team => 
      selectedTeams.includes(team.teamId)
    );

    // Generate 30 days of velocity data
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      return format(date, 'MMM d');
    });

    return {
      labels: last30Days,
      datasets: filteredTeams.map((team, index) => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
        return {
          label: team.teamName,
          data: Array.from({ length: 30 }, () => 
            Math.max(0, team.performance.averageVelocity + (Math.random() - 0.5) * 4)
          ),
          borderColor: colors[index % colors.length],
          backgroundColor: `${colors[index % colors.length]}20`,
          fill: false,
          tension: 0.4,
        };
      }),
    };
  }, [teamComparisons, selectedTeams]);

  const sortedTeams = useMemo(() => {
    return [...teamComparisons].sort((a, b) => {
      switch (sortBy) {
        case 'velocity':
          return b.performance.averageVelocity - a.performance.averageVelocity;
        case 'quality':
          return b.performance.qualityScore - a.performance.qualityScore;
        case 'collaboration':
          return b.performance.collaborationIndex - a.performance.collaborationIndex;
        case 'performance':
        default:
          return b.performance.completionRate - a.performance.completionRate;
      }
    });
  }, [teamComparisons, sortBy]);

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId) 
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getPerformanceColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
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
            <UserGroupIcon className="w-6 h-6" />
            Team Performance Comparison
          </h2>
          <p className="text-gray-600 mt-1">
            Compare team performance across key metrics
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <DateRangeSelector
            value={dateRange}
            onChange={setDateRange}
            className="w-full sm:w-auto"
          />
          
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="overview">Overview</option>
            <option value="detailed">Detailed</option>
            <option value="individual">Individual</option>
          </select>
        </div>
      </div>

      {/* Team Selection */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Select Teams to Compare</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="performance">Performance</option>
              <option value="velocity">Velocity</option>
              <option value="quality">Quality</option>
              <option value="collaboration">Collaboration</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedTeams.map((team) => (
            <div
              key={team.teamId}
              className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                selectedTeams.includes(team.teamId)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleTeamToggle(team.teamId)}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{team.teamName}</h4>
                <div className="flex items-center gap-1">
                  {getTrendIcon(team.performance.productivityTrend)}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completion Rate:</span>
                  <span className={`font-medium px-2 py-1 rounded ${getPerformanceColor(team.performance.completionRate)}`}>
                    {team.performance.completionRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Velocity:</span>
                  <span className="font-medium">{team.performance.averageVelocity.toFixed(1)}/day</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Team Size:</span>
                  <span className="font-medium">{team.metrics.teamSize} members</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-4 text-xs text-gray-600">
                  <div className="flex items-center gap-1">
                    <TrophyIcon className="w-3 h-3" />
                    <span>Top: {team.highlights.topPerformer.name.split(' ')[0]}</span>
                  </div>
                  {team.highlights.riskMembers.length > 0 && (
                    <div className="flex items-center gap-1 text-red-600">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      <span>{team.highlights.riskMembers.length} at risk</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Overview Metrics */}
      {selectedTeams.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Teams Selected"
            value={selectedTeams.length}
            icon={<UsersIcon className="w-5 h-5" />}
            color="blue"
          />
          <MetricCard
            title="Total Members"
            value={teamComparisons
              .filter(team => selectedTeams.includes(team.teamId))
              .reduce((sum, team) => sum + team.metrics.teamSize, 0)}
            icon={<UserGroupIcon className="w-5 h-5" />}
            color="green"
          />
          <MetricCard
            title="Avg Completion Rate"
            value={`${(teamComparisons
              .filter(team => selectedTeams.includes(team.teamId))
              .reduce((sum, team) => sum + team.performance.completionRate, 0) / selectedTeams.length
            ).toFixed(1)}%`}
            icon={<CheckCircleIcon className="w-5 h-5" />}
            color="purple"
          />
          <MetricCard
            title="Avg Velocity"
            value={`${(teamComparisons
              .filter(team => selectedTeams.includes(team.teamId))
              .reduce((sum, team) => sum + team.performance.averageVelocity, 0) / selectedTeams.length
            ).toFixed(1)}/day`}
            icon={<ChartBarIcon className="w-5 h-5" />}
            color="yellow"
          />
        </div>
      )}

      {/* Charts */}
      {selectedTeams.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EnhancedChartWidget
            id="team-performance-comparison"
            title="Performance Comparison"
            description="Compare key performance metrics across selected teams"
            data={comparisonChartData}
            config={{
              chartType: 'bar',
              showLegend: true,
              showGrid: true,
            }}
            showControls={true}
          />

          <EnhancedChartWidget
            id="team-velocity-trends"
            title="Velocity Trends"
            description="Daily task completion velocity over time"
            data={velocityChartData}
            config={{
              chartType: 'line',
              showLegend: true,
              showGrid: true,
            }}
            showControls={true}
          />
        </div>
      )}

      {/* Detailed Team Analysis */}
      {viewMode === 'detailed' && selectedTeams.length > 0 && (
        <div className="space-y-6">
          {teamComparisons
            .filter(team => selectedTeams.includes(team.teamId))
            .map((team) => (
              <div key={team.teamId} className="bg-white rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {team.teamName}
                    {getTrendIcon(team.performance.productivityTrend)}
                  </h3>
                  <button
                    onClick={() => onTeamSelect?.(team.teamId)}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Details →
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Team Overview */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Team Overview</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Team Size:</span>
                        <span className="font-medium">{team.metrics.teamSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Active Members:</span>
                        <span className="font-medium">{team.metrics.activeMembers}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tasks Completed:</span>
                        <span className="font-medium">{team.metrics.totalTasksCompleted}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Avg per Member:</span>
                        <span className="font-medium">{team.metrics.averageTasksPerMember.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Performance Scores */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Performance Scores</h4>
                    <div className="space-y-3">
                      {[
                        { label: 'Efficiency', score: team.performance.efficiencyScore },
                        { label: 'Quality', score: team.performance.qualityScore },
                        { label: 'Collaboration', score: team.performance.collaborationIndex },
                      ].map(({ label, score }) => (
                        <div key={label}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{label}:</span>
                            <span className={`font-medium px-2 py-1 rounded ${getPerformanceColor(score)}`}>
                              {score.toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                score >= 85 ? 'bg-green-500' : 
                                score >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${score}%` }}
                            ></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Team Highlights */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Team Highlights</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center gap-2">
                        <TrophyIcon className="w-4 h-4 text-yellow-500" />
                        <span className="text-gray-600">Top Performer:</span>
                      </div>
                      <div className="ml-6">
                        <div className="font-medium">{team.highlights.topPerformer.name}</div>
                        <div className="text-gray-500">
                          {team.highlights.topPerformer.productivityScore}% productivity
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <FireIcon className="w-4 h-4 text-orange-500" />
                        <span className="text-gray-600">Most Improved:</span>
                      </div>
                      <div className="ml-6">
                        <div className="font-medium">{team.highlights.mostImproved.name}</div>
                        <div className="text-gray-500">
                          {team.highlights.mostImproved.streak} day streak
                        </div>
                      </div>

                      {team.highlights.riskMembers.length > 0 && (
                        <>
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />
                            <span className="text-gray-600">At Risk:</span>
                          </div>
                          <div className="ml-6 text-red-600">
                            {team.highlights.riskMembers.length} member{team.highlights.riskMembers.length !== 1 ? 's' : ''} need attention
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}