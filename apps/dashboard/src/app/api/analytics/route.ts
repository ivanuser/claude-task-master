import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const timeRange = searchParams.get('timeRange') || 'month';
    const userId = session.user.id;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case 'day':
        startDate.setDate(now.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    // Get user's projects
    const projects = await prisma.project.findMany({
      where: {
        members: {
          some: { userId }
        }
      },
      include: {
        tasks: true,
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      }
    });

    // Get all tasks for analytics
    const allTasks = await prisma.task.findMany({
      where: {
        project: {
          members: {
            some: { userId }
          }
        }
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Calculate summary metrics
    const totalProjects = projects.length;
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(task => task.status === 'DONE').length;
    const inProgressTasks = allTasks.filter(task => task.status === 'IN_PROGRESS').length;
    const pendingTasks = allTasks.filter(task => task.status === 'PENDING').length;
    const blockedTasks = allTasks.filter(task => task.status === 'BLOCKED').length;

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate velocity (tasks completed in time range)
    const recentlyCompletedTasks = allTasks.filter(task => 
      task.status === 'DONE' && 
      task.updatedAt >= startDate
    ).length;

    const daysInRange = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const averageVelocity = recentlyCompletedTasks / daysInRange;

    // Calculate project metrics
    const projectMetrics = projects.map(project => {
      const projectTasks = project.tasks;
      const completedProjectTasks = projectTasks.filter(task => task.status === 'DONE').length;
      const projectCompletionRate = projectTasks.length > 0 
        ? (completedProjectTasks / projectTasks.length) * 100 
        : 0;

      // Calculate project health score based on multiple factors
      const recentActivity = project.updatedAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const hasBlockedTasks = projectTasks.some(task => task.status === 'BLOCKED');
      const healthScore = Math.round(
        (projectCompletionRate * 0.5) + // 50% weight on completion
        (recentActivity ? 25 : 0) +     // 25% weight on recent activity
        (hasBlockedTasks ? 0 : 25)      // 25% penalty for blocked tasks
      );

      return {
        id: project.id,
        name: project.name,
        totalTasks: projectTasks.length,
        completedTasks: completedProjectTasks,
        completionRate: projectCompletionRate,
        healthScore,
        memberCount: project.members.length,
        lastActivity: project.updatedAt.toISOString(),
        status: project.status
      };
    });

    // Calculate task status distribution
    const taskStatusDistribution = {
      PENDING: pendingTasks,
      IN_PROGRESS: inProgressTasks,
      DONE: completedTasks,
      BLOCKED: blockedTasks,
      REVIEW: allTasks.filter(task => task.status === 'REVIEW').length,
      CANCELLED: allTasks.filter(task => task.status === 'CANCELLED').length,
      DEFERRED: allTasks.filter(task => task.status === 'DEFERRED').length
    };

    // Calculate priority distribution
    const priorityDistribution = {
      LOW: allTasks.filter(task => task.priority === 'LOW').length,
      MEDIUM: allTasks.filter(task => task.priority === 'MEDIUM').length,
      HIGH: allTasks.filter(task => task.priority === 'HIGH').length,
      CRITICAL: allTasks.filter(task => task.priority === 'CRITICAL').length
    };

    // Generate velocity data for the past weeks
    const velocityData = [];
    for (let i = 6; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(now.getDate() - (i * 7) - 7);
      const weekEnd = new Date();
      weekEnd.setDate(now.getDate() - (i * 7));

      const weekCompletedTasks = allTasks.filter(task => 
        task.status === 'DONE' && 
        task.updatedAt >= weekStart && 
        task.updatedAt < weekEnd
      ).length;

      velocityData.push({
        period: weekStart.toISOString().split('T')[0],
        tasksCompleted: weekCompletedTasks,
        velocity: weekCompletedTasks / 7
      });
    }

    // Generate burndown data
    const burndownData = [];
    const totalTasksAtStart = allTasks.filter(task => task.createdAt <= startDate).length;
    let remainingTasks = totalTasksAtStart;

    for (let i = 0; i <= daysInRange; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      const tasksCompletedByDate = allTasks.filter(task => 
        task.status === 'DONE' && 
        task.updatedAt <= currentDate &&
        task.createdAt <= startDate
      ).length;

      remainingTasks = totalTasksAtStart - tasksCompletedByDate;

      burndownData.push({
        date: currentDate.toISOString().split('T')[0],
        planned: Math.max(0, totalTasksAtStart - (totalTasksAtStart / daysInRange) * i),
        actual: remainingTasks
      });
    }

    // Generate recommendations based on analytics
    const recommendations = [];
    
    // High blocked tasks recommendation
    if (blockedTasks > 0) {
      recommendations.push({
        id: 'blocked-tasks',
        title: 'Address Blocked Tasks',
        description: `You have ${blockedTasks} blocked task${blockedTasks > 1 ? 's' : ''} that need attention to maintain project momentum.`,
        priority: blockedTasks > 5 ? 'high' : 'medium',
        actionItems: [
          'Review blocked tasks and identify root causes',
          'Reassign resources to unblock critical tasks',
          'Update dependencies and timelines'
        ],
        estimatedImpact: `Could improve velocity by ${Math.round(blockedTasks / totalTasks * 100)}%`
      });
    }

    // Low completion rate recommendation
    if (completionRate < 50 && totalTasks > 0) {
      recommendations.push({
        id: 'low-completion',
        title: 'Improve Task Completion Rate',
        description: `Current completion rate is ${completionRate.toFixed(1)}%, which is below optimal performance.`,
        priority: completionRate < 25 ? 'high' : 'medium',
        actionItems: [
          'Break down large tasks into smaller, manageable pieces',
          'Review task priorities and focus on high-impact items',
          'Increase team communication and support'
        ],
        estimatedImpact: 'Could double project velocity within 2 weeks'
      });
    }

    // Project health recommendation
    const unhealthyProjects = projectMetrics.filter(p => p.healthScore < 60).length;
    if (unhealthyProjects > 0) {
      recommendations.push({
        id: 'project-health',
        title: 'Improve Project Health',
        description: `${unhealthyProjects} project${unhealthyProjects > 1 ? 's' : ''} showing poor health scores.`,
        priority: unhealthyProjects > Math.ceil(projects.length / 2) ? 'high' : 'medium',
        actionItems: [
          'Focus on completing stalled tasks',
          'Increase development activity and commits',
          'Remove or reassign blocked tasks'
        ],
        estimatedImpact: 'Improved project health leads to better team morale'
      });
    }

    // Team productivity recommendation
    if (averageVelocity < 1 && totalTasks > 10) {
      recommendations.push({
        id: 'low-velocity',
        title: 'Increase Team Velocity',
        description: `Current velocity is ${averageVelocity.toFixed(1)} tasks per day, which could be improved.`,
        priority: 'medium',
        actionItems: [
          'Implement daily standups to track progress',
          'Reduce task complexity where possible',
          'Ensure team has necessary resources and tools'
        ],
        estimatedImpact: 'Could increase output by 50-100% with proper optimization'
      });
    }

    // If no major issues, provide positive recommendation
    if (recommendations.length === 0) {
      recommendations.push({
        id: 'good-progress',
        title: 'Maintain Current Momentum',
        description: 'Your projects are showing healthy progress. Keep up the good work!',
        priority: 'low',
        actionItems: [
          'Continue current development practices',
          'Consider taking on additional challenges',
          'Share successful strategies with other teams'
        ],
        estimatedImpact: 'Sustained high performance'
      });
    }

    // Get team members
    const teamMembers = [];
    const memberSet = new Set();
    
    projects.forEach(project => {
      project.members.forEach(member => {
        if (!memberSet.has(member.user.id)) {
          memberSet.add(member.user.id);
          
          const memberTasks = allTasks.filter(task => {
            // Check if task data has assignee info
            const taskData = task.data as any;
            return taskData?.assignedTo === member.user.id || taskData?.assignedTo === member.user.email;
          });
          
          const memberCompletedTasks = memberTasks.filter(task => task.status === 'DONE').length;
          
          // Calculate streak (days of recent activity)
          const recentTasks = memberTasks.filter(task => 
            task.status === 'DONE' && 
            task.updatedAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          );
          const streak = Math.min(recentTasks.length, 30); // Cap at 30 days
          
          // Calculate productivity score (completion rate * activity level)
          const activityScore = Math.min((memberCompletedTasks / 30) * 100, 100); // Cap at 100
          const completionRate = memberTasks.length > 0 ? (memberCompletedTasks / memberTasks.length) * 100 : 0;
          const productivityScore = Math.round((completionRate * 0.7) + (activityScore * 0.3));

          teamMembers.push({
            id: member.user.id,
            name: member.user.name,
            email: member.user.email,
            tasksAssigned: memberTasks.length,
            tasksCompleted: memberCompletedTasks,
            completionRate,
            streak,
            productivityScore
          });
        }
      });
    });

    return NextResponse.json({
      summary: {
        overview: {
          totalProjects,
          totalTasks,
          completedTasks,
          inProgressTasks,
          teamMembers: teamMembers.length
        },
        performance: {
          completionRate,
          averageVelocity,
          blockedTasks,
          overdueTasks: 0 // Could calculate based on due dates if available
        },
        recommendations
      },
      projectMetrics,
      taskMetrics: {
        statusDistribution: taskStatusDistribution,
        priorityDistribution: priorityDistribution,
        averageComplexity: allTasks.reduce((sum, task) => sum + (task.complexity || 5), 0) / allTasks.length || 5,
        totalTasks
      },
      teamMetrics: {
        totalMembers: teamMembers.length,
        averageTasksPerMember: teamMembers.length > 0 ? totalTasks / teamMembers.length : 0,
        topPerformers: teamMembers
          .sort((a, b) => b.completionRate - a.completionRate)
          .slice(0, 3),
        members: teamMembers
      },
      velocityData,
      burndownData,
      timeRange
    });

  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}