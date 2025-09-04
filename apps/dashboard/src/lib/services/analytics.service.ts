import {
  ProjectMetrics,
  TaskMetrics,
  TeamMetrics,
  TimeSeriesData,
  AnalyticsSummary,
  Insight,
  Recommendation,
  VelocityData,
  BurndownData,
  ChartData,
} from '@/types/analytics';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { Project } from '@/types/project';

export class AnalyticsService {
  // Calculate project metrics
  static calculateProjectMetrics(
    project: Project,
    tasks: Task[]
  ): ProjectMetrics {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'done');
    const inProgressTasks = projectTasks.filter(t => t.status === 'in-progress');
    const pendingTasks = projectTasks.filter(t => t.status === 'pending');
    const blockedTasks = projectTasks.filter(t => t.status === 'blocked');
    
    const completionRate = projectTasks.length > 0
      ? (completedTasks.length / projectTasks.length) * 100
      : 0;
    
    // Calculate average task duration
    const durations = completedTasks
      .filter(t => t.createdAt && t.updatedAt)
      .map(t => {
        const created = new Date(t.createdAt).getTime();
        const updated = new Date(t.updatedAt).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24); // days
      });
    
    const averageTaskDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    // Calculate velocity (tasks completed per day over last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentlyCompleted = completedTasks.filter(t => 
      new Date(t.updatedAt) > thirtyDaysAgo
    );
    
    const velocity = recentlyCompleted.length / 30;
    
    // Calculate health score (0-100)
    const healthScore = this.calculateHealthScore({
      completionRate,
      blockedRatio: blockedTasks.length / Math.max(projectTasks.length, 1),
      velocity,
      hasRecentActivity: new Date(project.lastActivity) > thirtyDaysAgo,
    });
    
    // Determine trending
    const trending = this.calculateTrending(projectTasks);
    
    return {
      projectId: project.id,
      projectName: project.name,
      totalTasks: projectTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      pendingTasks: pendingTasks.length,
      blockedTasks: blockedTasks.length,
      completionRate,
      averageTaskDuration,
      velocity,
      healthScore,
      lastActivity: project.lastActivity,
      trending,
    };
  }
  
  // Calculate task metrics
  static calculateTaskMetrics(tasks: Task[]): TaskMetrics {
    const byStatus = {
      pending: tasks.filter(t => t.status === 'pending').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: tasks.filter(t => t.status === 'done').length,
      blocked: tasks.filter(t => t.status === 'blocked').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      deferred: tasks.filter(t => t.status === 'deferred').length,
    };
    
    const byPriority = {
      low: tasks.filter(t => t.priority === 'low').length,
      medium: tasks.filter(t => t.priority === 'medium').length,
      high: tasks.filter(t => t.priority === 'high').length,
      critical: tasks.filter(t => t.priority === 'critical').length,
    };
    
    const complexities = tasks
      .filter(t => t.complexity !== undefined)
      .map(t => t.complexity!);
    
    const averageComplexity = complexities.length > 0
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length
      : 0;
    
    // Calculate average duration for completed tasks
    const completedTasks = tasks.filter(t => t.status === 'done');
    const durations = completedTasks
      .filter(t => t.createdAt && t.updatedAt)
      .map(t => {
        const created = new Date(t.createdAt).getTime();
        const updated = new Date(t.updatedAt).getTime();
        return (updated - created) / (1000 * 60 * 60 * 24); // days
      });
    
    const averageDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;
    
    // Count overdue tasks
    const now = new Date();
    const overdueTasks = tasks.filter(t => 
      t.dueDate && 
      new Date(t.dueDate) < now && 
      t.status !== 'done' && 
      t.status !== 'cancelled'
    ).length;
    
    // Generate trend data
    const tasksTrend = this.generateTasksTrend(tasks);
    
    return {
      totalTasks: tasks.length,
      byStatus,
      byPriority,
      averageComplexity,
      averageDuration,
      overdueTasks,
      tasksTrend,
    };
  }
  
  // Calculate team metrics
  static calculateTeamMetrics(
    tasks: Task[],
    members: any[]
  ): TeamMetrics {
    const activeMembers = members.filter(m => {
      const memberTasks = tasks.filter(t => t.assignedTo === m.id);
      return memberTasks.some(t => 
        t.status === 'in-progress' || 
        t.status === 'review'
      );
    });
    
    const totalTasksCompleted = tasks.filter(t => t.status === 'done').length;
    const averageTasksPerMember = members.length > 0
      ? totalTasksCompleted / members.length
      : 0;
    
    // Calculate top performers
    const topPerformers = members
      .map(member => {
        const memberTasks = tasks.filter(t => t.assignedTo === member.id);
        const completed = memberTasks.filter(t => t.status === 'done');
        const inProgress = memberTasks.filter(t => t.status === 'in-progress');
        
        const durations = completed
          .filter(t => t.createdAt && t.updatedAt)
          .map(t => {
            const created = new Date(t.createdAt).getTime();
            const updated = new Date(t.updatedAt).getTime();
            return (updated - created) / (1000 * 60 * 60 * 24);
          });
        
        const averageCompletionTime = durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0;
        
        // Calculate productivity score
        const productivityScore = this.calculateProductivityScore(
          completed.length,
          averageCompletionTime,
          memberTasks.length
        );
        
        // Calculate streak (consecutive days with completed tasks)
        const streak = this.calculateStreak(completed);
        
        return {
          id: member.id,
          name: member.name,
          email: member.email,
          avatar: member.avatar,
          tasksCompleted: completed.length,
          tasksInProgress: inProgress.length,
          averageCompletionTime,
          productivityScore,
          streak,
        };
      })
      .sort((a, b) => b.productivityScore - a.productivityScore)
      .slice(0, 5);
    
    // Generate productivity trend
    const productivity = this.generateProductivityTrend(tasks, members);
    
    // Calculate collaboration score
    const collaborationScore = this.calculateCollaborationScore(tasks, members);
    
    return {
      teamSize: members.length,
      activeMembers: activeMembers.length,
      totalTasksCompleted,
      averageTasksPerMember,
      topPerformers,
      productivity,
      collaborationScore,
    };
  }
  
  // Generate analytics summary
  static generateAnalyticsSummary(
    projects: Project[],
    tasks: Task[],
    members: any[]
  ): AnalyticsSummary {
    const activeProjects = projects.filter(p => p.status === 'active');
    const completedTasks = tasks.filter(t => t.status === 'done');
    
    // Calculate overall metrics
    const completionRate = tasks.length > 0
      ? (completedTasks.length / tasks.length) * 100
      : 0;
    
    // Calculate average velocity across all projects
    const projectMetrics = projects.map(p =>
      this.calculateProjectMetrics(p, tasks)
    );
    
    const averageVelocity = projectMetrics.length > 0
      ? projectMetrics.reduce((a, b) => a + b.velocity, 0) / projectMetrics.length
      : 0;
    
    // Calculate overall health score
    const overallHealthScore = projectMetrics.length > 0
      ? projectMetrics.reduce((a, b) => a + b.healthScore, 0) / projectMetrics.length
      : 0;
    
    // Determine productivity trend
    const productivityTrend = this.determineProductivityTrend(tasks);
    
    // Estimate completion date
    const pendingTasks = tasks.filter(t => 
      t.status !== 'done' && t.status !== 'cancelled'
    );
    const estimatedDays = averageVelocity > 0
      ? pendingTasks.length / averageVelocity
      : 0;
    
    const estimatedCompletion = new Date();
    estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedDays);
    
    // Generate insights
    const insights = this.generateInsights(projects, tasks, projectMetrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      projectMetrics,
      tasks,
      members
    );
    
    return {
      overview: {
        totalProjects: projects.length,
        activeProjects: activeProjects.length,
        totalTasks: tasks.length,
        completedTasks: completedTasks.length,
        totalMembers: members.length,
        overallHealthScore,
      },
      performance: {
        completionRate,
        averageVelocity,
        productivityTrend,
        estimatedCompletion: estimatedCompletion.toISOString(),
      },
      insights,
      recommendations,
    };
  }
  
  // Generate velocity data
  static generateVelocityData(
    tasks: Task[],
    period: 'week' | 'month' | 'quarter' = 'week'
  ): VelocityData[] {
    const velocityData: VelocityData[] = [];
    const now = new Date();
    
    const periodDays = {
      week: 7,
      month: 30,
      quarter: 90,
    };
    
    const days = periodDays[period];
    const periods = 12; // Show last 12 periods
    
    for (let i = periods - 1; i >= 0; i--) {
      const periodStart = new Date(now);
      periodStart.setDate(periodStart.getDate() - (i + 1) * days);
      
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() - i * days);
      
      const periodTasks = tasks.filter(t => {
        const updatedAt = new Date(t.updatedAt);
        return t.status === 'done' &&
          updatedAt >= periodStart &&
          updatedAt < periodEnd;
      });
      
      const cycletimes = periodTasks
        .filter(t => t.createdAt)
        .map(t => {
          const created = new Date(t.createdAt).getTime();
          const updated = new Date(t.updatedAt).getTime();
          return (updated - created) / (1000 * 60 * 60 * 24);
        });
      
      const averageCycleTime = cycletimes.length > 0
        ? cycletimes.reduce((a, b) => a + b, 0) / cycletimes.length
        : 0;
      
      velocityData.push({
        period: `${period} ${i + 1}`,
        tasksCompleted: periodTasks.length,
        storyPoints: periodTasks.reduce((sum, t) => sum + (t.complexity || 0), 0),
        averageCycleTime,
        throughput: periodTasks.length / days,
      });
    }
    
    return velocityData;
  }
  
  // Generate burndown chart data
  static generateBurndownData(
    tasks: Task[],
    startDate: Date,
    endDate: Date
  ): BurndownData[] {
    const burndownData: BurndownData[] = [];
    const totalTasks = tasks.length;
    const totalDays = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const idealBurnRate = totalTasks / totalDays;
    
    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + day);
      
      const completedByDate = tasks.filter(t => {
        return t.status === 'done' &&
          new Date(t.updatedAt) <= currentDate;
      }).length;
      
      const remainingTasks = totalTasks - completedByDate;
      const idealRemaining = Math.max(0, totalTasks - (idealBurnRate * day));
      
      // Simple prediction based on current velocity
      const recentVelocity = day > 7 ? 
        (completedByDate - tasks.filter(t => {
          const date = new Date(startDate);
          date.setDate(date.getDate() + day - 7);
          return t.status === 'done' && new Date(t.updatedAt) <= date;
        }).length) / 7 : idealBurnRate;
      
      const daysRemaining = totalDays - day;
      const predicted = Math.max(0, remainingTasks - (recentVelocity * daysRemaining));
      
      burndownData.push({
        date: currentDate.toISOString().split('T')[0],
        ideal: idealRemaining,
        actual: remainingTasks,
        predicted: day > 0 ? predicted : undefined,
        scope: totalTasks,
      });
    }
    
    return burndownData;
  }
  
  // Helper methods
  private static calculateHealthScore(metrics: {
    completionRate: number;
    blockedRatio: number;
    velocity: number;
    hasRecentActivity: boolean;
  }): number {
    let score = 0;
    
    // Completion rate (0-40 points)
    score += (metrics.completionRate / 100) * 40;
    
    // Low blocked ratio (0-20 points)
    score += (1 - metrics.blockedRatio) * 20;
    
    // Velocity (0-20 points)
    const velocityScore = Math.min(metrics.velocity / 2, 1) * 20;
    score += velocityScore;
    
    // Recent activity (0-20 points)
    score += metrics.hasRecentActivity ? 20 : 0;
    
    return Math.round(Math.min(100, Math.max(0, score)));
  }
  
  private static calculateTrending(
    tasks: Task[]
  ): 'up' | 'down' | 'stable' {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    
    const thisWeek = tasks.filter(t =>
      t.status === 'done' &&
      new Date(t.updatedAt) > oneWeekAgo
    ).length;
    
    const lastWeek = tasks.filter(t =>
      t.status === 'done' &&
      new Date(t.updatedAt) > twoWeeksAgo &&
      new Date(t.updatedAt) <= oneWeekAgo
    ).length;
    
    if (thisWeek > lastWeek * 1.1) return 'up';
    if (thisWeek < lastWeek * 0.9) return 'down';
    return 'stable';
  }
  
  private static generateTasksTrend(tasks: Task[]): TimeSeriesData[] {
    const trend: TimeSeriesData[] = [];
    const now = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const tasksOnDate = tasks.filter(t => {
        const taskDate = new Date(t.updatedAt).toISOString().split('T')[0];
        return taskDate === dateStr && t.status === 'done';
      }).length;
      
      trend.push({
        date: dateStr,
        value: tasksOnDate,
        label: `${tasksOnDate} tasks`,
      });
    }
    
    return trend;
  }
  
  private static calculateProductivityScore(
    completed: number,
    avgTime: number,
    total: number
  ): number {
    const completionRatio = total > 0 ? completed / total : 0;
    const speedScore = avgTime > 0 ? Math.min(100, 100 / avgTime) : 0;
    const volumeScore = Math.min(100, completed * 10);
    
    return Math.round((completionRatio * 30 + speedScore * 35 + volumeScore * 35));
  }
  
  private static calculateStreak(completedTasks: Task[]): number {
    if (completedTasks.length === 0) return 0;
    
    const sortedTasks = completedTasks
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    
    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const hasTask = sortedTasks.some(t => {
        const taskDate = new Date(t.updatedAt);
        taskDate.setHours(0, 0, 0, 0);
        return taskDate.getTime() === currentDate.getTime();
      });
      
      if (hasTask) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  private static generateProductivityTrend(
    tasks: Task[],
    members: any[]
  ): TimeSeriesData[] {
    const trend: TimeSeriesData[] = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthTasks = tasks.filter(t => {
        const taskDate = new Date(t.updatedAt);
        return t.status === 'done' &&
          taskDate >= monthStart &&
          taskDate <= monthEnd;
      }).length;
      
      const productivity = members.length > 0
        ? monthTasks / members.length
        : 0;
      
      trend.push({
        date: monthStart.toISOString().split('T')[0],
        value: productivity,
        label: `${productivity.toFixed(1)} tasks/member`,
      });
    }
    
    return trend;
  }
  
  private static calculateCollaborationScore(
    tasks: Task[],
    members: any[]
  ): number {
    // Calculate based on task dependencies and member interactions
    const tasksWithDeps = tasks.filter(t => t.dependencies && t.dependencies.length > 0);
    const depRatio = tasks.length > 0 ? tasksWithDeps.length / tasks.length : 0;
    
    // More complex calculation could involve actual member interactions
    return Math.round(depRatio * 100);
  }
  
  private static determineProductivityTrend(
    tasks: Task[]
  ): 'improving' | 'declining' | 'stable' {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(now);
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const recentTasks = tasks.filter(t =>
      t.status === 'done' &&
      new Date(t.updatedAt) > thirtyDaysAgo
    ).length;
    
    const previousTasks = tasks.filter(t =>
      t.status === 'done' &&
      new Date(t.updatedAt) > sixtyDaysAgo &&
      new Date(t.updatedAt) <= thirtyDaysAgo
    ).length;
    
    if (recentTasks > previousTasks * 1.1) return 'improving';
    if (recentTasks < previousTasks * 0.9) return 'declining';
    return 'stable';
  }
  
  private static generateInsights(
    projects: Project[],
    tasks: Task[],
    projectMetrics: ProjectMetrics[]
  ): Insight[] {
    const insights: Insight[] = [];
    
    // High performing projects
    const topProjects = projectMetrics
      .filter(m => m.healthScore > 80)
      .sort((a, b) => b.healthScore - a.healthScore);
    
    if (topProjects.length > 0) {
      insights.push({
        id: '1',
        type: 'positive',
        title: 'Top Performing Project',
        description: `${topProjects[0].projectName} has an excellent health score of ${topProjects[0].healthScore}%`,
        metric: 'healthScore',
        value: topProjects[0].healthScore,
        change: 0,
        impact: 'high',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Blocked tasks warning
    const blockedTasks = tasks.filter(t => t.status === 'blocked');
    if (blockedTasks.length > tasks.length * 0.1) {
      insights.push({
        id: '2',
        type: 'negative',
        title: 'High Number of Blocked Tasks',
        description: `${blockedTasks.length} tasks are currently blocked, affecting productivity`,
        metric: 'blockedTasks',
        value: blockedTasks.length,
        change: 0,
        impact: 'high',
        timestamp: new Date().toISOString(),
      });
    }
    
    // Velocity trend
    const avgVelocity = projectMetrics.length > 0
      ? projectMetrics.reduce((a, b) => a + b.velocity, 0) / projectMetrics.length
      : 0;
    
    if (avgVelocity > 2) {
      insights.push({
        id: '3',
        type: 'positive',
        title: 'Strong Task Velocity',
        description: `Team is completing an average of ${avgVelocity.toFixed(1)} tasks per day`,
        metric: 'velocity',
        value: avgVelocity,
        change: 0,
        impact: 'medium',
        timestamp: new Date().toISOString(),
      });
    }
    
    return insights;
  }
  
  private static generateRecommendations(
    projectMetrics: ProjectMetrics[],
    tasks: Task[],
    members: any[]
  ): Recommendation[] {
    const recommendations: Recommendation[] = [];
    
    // Check for projects with low health scores
    const strugglingProjects = projectMetrics.filter(m => m.healthScore < 50);
    if (strugglingProjects.length > 0) {
      recommendations.push({
        id: '1',
        type: 'action',
        title: 'Address Struggling Projects',
        description: `${strugglingProjects.length} projects have low health scores and need attention`,
        priority: 'high',
        actionItems: [
          'Review blocked tasks and remove impediments',
          'Reassign resources to critical tasks',
          'Consider adjusting project scope or timeline',
        ],
        estimatedImpact: 'Could improve overall completion rate by 15-20%',
        relatedMetrics: ['healthScore', 'blockedTasks', 'velocity'],
      });
    }
    
    // Check for overdue tasks
    const overdueTasks = tasks.filter(t =>
      t.dueDate &&
      new Date(t.dueDate) < new Date() &&
      t.status !== 'done' &&
      t.status !== 'cancelled'
    );
    
    if (overdueTasks.length > 0) {
      recommendations.push({
        id: '2',
        type: 'warning',
        title: 'Overdue Tasks Need Attention',
        description: `${overdueTasks.length} tasks are past their due date`,
        priority: 'high',
        actionItems: [
          'Review and update task priorities',
          'Reassign tasks if necessary',
          'Update stakeholders on delays',
        ],
        estimatedImpact: 'Addressing overdue tasks could improve client satisfaction',
        relatedMetrics: ['overdueTasks', 'completionRate'],
      });
    }
    
    // Check for unbalanced workload
    const tasksPerMember = members.map(m => ({
      member: m,
      taskCount: tasks.filter(t => t.assignedTo === m.id && t.status === 'in-progress').length,
    }));
    
    const avgTasksPerMember = tasksPerMember.length > 0
      ? tasksPerMember.reduce((a, b) => a + b.taskCount, 0) / tasksPerMember.length
      : 0;
    
    const overloadedMembers = tasksPerMember.filter(m => m.taskCount > avgTasksPerMember * 1.5);
    
    if (overloadedMembers.length > 0) {
      recommendations.push({
        id: '3',
        type: 'improvement',
        title: 'Balance Team Workload',
        description: `${overloadedMembers.length} team members are overloaded with tasks`,
        priority: 'medium',
        actionItems: [
          'Redistribute tasks among team members',
          'Consider hiring additional resources',
          'Prioritize and defer non-critical tasks',
        ],
        estimatedImpact: 'Could improve team velocity by 10-15%',
        relatedMetrics: ['velocity', 'productivity'],
      });
    }
    
    return recommendations;
  }
  
  // Generate chart data for various chart types
  static generateChartData(
    type: 'taskStatus' | 'taskPriority' | 'projectHealth' | 'velocity' | 'burndown',
    data: any
  ): ChartData {
    switch (type) {
      case 'taskStatus':
        return {
          labels: Object.keys(data.byStatus),
          datasets: [{
            label: 'Tasks by Status',
            data: Object.values(data.byStatus),
            backgroundColor: [
              '#10B981', // pending - green
              '#3B82F6', // in-progress - blue
              '#F59E0B', // review - amber
              '#6B7280', // done - gray
              '#EF4444', // blocked - red
              '#9CA3AF', // cancelled - gray
              '#FBBF24', // deferred - yellow
            ],
          }],
        };
      
      case 'taskPriority':
        return {
          labels: Object.keys(data.byPriority),
          datasets: [{
            label: 'Tasks by Priority',
            data: Object.values(data.byPriority),
            backgroundColor: [
              '#10B981', // low - green
              '#3B82F6', // medium - blue
              '#F59E0B', // high - amber
              '#EF4444', // critical - red
            ],
          }],
        };
      
      case 'projectHealth':
        return {
          labels: data.map((p: ProjectMetrics) => p.projectName),
          datasets: [{
            label: 'Project Health Score',
            data: data.map((p: ProjectMetrics) => p.healthScore),
            backgroundColor: data.map((p: ProjectMetrics) => 
              p.healthScore > 70 ? '#10B981' :
              p.healthScore > 40 ? '#F59E0B' : '#EF4444'
            ),
          }],
        };
      
      case 'velocity':
        return {
          labels: data.map((v: VelocityData) => v.period),
          datasets: [{
            label: 'Tasks Completed',
            data: data.map((v: VelocityData) => v.tasksCompleted),
            borderColor: '#3B82F6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        };
      
      case 'burndown':
        return {
          labels: data.map((b: BurndownData) => b.date),
          datasets: [
            {
              label: 'Ideal',
              data: data.map((b: BurndownData) => b.ideal),
              borderColor: '#9CA3AF',
              borderWidth: 2,
              fill: false,
              tension: 0,
              pointRadius: 0,
            },
            {
              label: 'Actual',
              data: data.map((b: BurndownData) => b.actual),
              borderColor: '#3B82F6',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderWidth: 2,
              fill: true,
              tension: 0.4,
            },
            {
              label: 'Predicted',
              data: data.map((b: BurndownData) => b.predicted),
              borderColor: '#10B981',
              borderWidth: 2,
              fill: false,
              tension: 0.4,
              pointRadius: 0,
            },
          ],
        };
      
      default:
        return { labels: [], datasets: [] };
    }
  }
}