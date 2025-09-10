'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FolderOpen, 
  Activity,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

function StatCard({ title, value, description, icon: Icon, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground">
          {description}
        </p>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className={`h-3 w-3 ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className={`text-xs ${trend.isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-xs text-muted-foreground">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAnalyticsPage() {
  // Mock data - in production, this would come from an API
  const stats = {
    totalUsers: 1247,
    activeUsers: 892,
    totalProjects: 356,
    totalTasks: 4823,
    completedTasks: 3241,
    averageTaskTime: '3.5 days',
    serverUtilization: '68%',
    errorRate: '0.3%'
  };

  const activityData = [
    { hour: '00:00', users: 23 },
    { hour: '04:00', users: 15 },
    { hour: '08:00', users: 189 },
    { hour: '12:00', users: 267 },
    { hour: '16:00', users: 234 },
    { hour: '20:00', users: 156 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          System-wide metrics and insights
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          description="All registered users"
          icon={Users}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers.toLocaleString()}
          description="Users active in last 30 days"
          icon={Activity}
          trend={{ value: 8, isPositive: true }}
        />
        <StatCard
          title="Total Projects"
          value={stats.totalProjects}
          description="All projects in system"
          icon={FolderOpen}
          trend={{ value: 15, isPositive: true }}
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks.toLocaleString()}
          description="Tasks across all projects"
          icon={BarChart3}
          trend={{ value: 23, isPositive: true }}
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Task Completion"
          value={`${Math.round((stats.completedTasks / stats.totalTasks) * 100)}%`}
          description={`${stats.completedTasks.toLocaleString()} of ${stats.totalTasks.toLocaleString()} tasks`}
          icon={CheckCircle2}
        />
        <StatCard
          title="Avg Task Time"
          value={stats.averageTaskTime}
          description="Average time to complete"
          icon={Clock}
        />
        <StatCard
          title="Server Load"
          value={stats.serverUtilization}
          description="Current utilization"
          icon={Activity}
        />
        <StatCard
          title="Error Rate"
          value={stats.errorRate}
          description="System error rate"
          icon={XCircle}
        />
      </div>

      {/* Activity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>User Activity</CardTitle>
          <CardDescription>
            Active users throughout the day
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-end gap-2">
            {activityData.map((data, index) => {
              const height = (data.users / 300) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div 
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${height}%` }}
                    title={`${data.users} users at ${data.hour}`}
                  />
                  <span className="text-xs text-muted-foreground">{data.hour}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>System Insights</CardTitle>
          <CardDescription>
            Key metrics and recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <div>
              <p className="text-sm font-medium">User Growth Trending Up</p>
              <p className="text-xs text-muted-foreground">
                12% increase in new user registrations compared to last month
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
            <div>
              <p className="text-sm font-medium">High Task Completion Rate</p>
              <p className="text-xs text-muted-foreground">
                67% of tasks are completed within expected timeframes
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mt-2" />
            <div>
              <p className="text-sm font-medium">Server Capacity Alert</p>
              <p className="text-xs text-muted-foreground">
                Consider scaling up servers if utilization exceeds 75%
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 mt-2" />
            <div>
              <p className="text-sm font-medium">Low Error Rate</p>
              <p className="text-xs text-muted-foreground">
                System stability is excellent with only 0.3% error rate
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}