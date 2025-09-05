import { supabase } from '@/lib/supabase';
import { AnalyticsService } from './analytics.service';
import {
  ProjectMetrics,
  TaskMetrics,
  TeamMetrics,
  TimeSeriesData,
  VelocityData,
  BurndownData,
  ChartData,
} from '@/types/analytics';
import { Task, Project } from '@/types/project';

export interface RealtimeMetricsUpdate {
  type: 'project_metrics' | 'task_metrics' | 'team_metrics' | 'velocity' | 'burndown';
  projectId?: string;
  teamId?: string;
  data: any;
  timestamp: string;
}

export interface AnalyticsSubscription {
  id: string;
  type: 'project_metrics' | 'task_metrics' | 'team_metrics' | 'custom';
  filters?: {
    projectIds?: string[];
    teamIds?: string[];
    timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
    userIds?: string[];
  };
  callback: (data: RealtimeMetricsUpdate) => void;
  refreshInterval?: number; // in seconds
}

class RealtimeAnalyticsService {
  private static instance: RealtimeAnalyticsService;
  private subscriptions: Map<string, AnalyticsSubscription> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private wsConnection: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000; // 1 second

  private constructor() {
    this.initializeWebSocket();
  }

  static getInstance(): RealtimeAnalyticsService {
    if (!RealtimeAnalyticsService.instance) {
      RealtimeAnalyticsService.instance = new RealtimeAnalyticsService();
    }
    return RealtimeAnalyticsService.instance;
  }

  private initializeWebSocket() {
    try {
      // In a real implementation, this would connect to your WebSocket server
      // For now, we'll simulate with Supabase realtime subscriptions
      this.setupSupabaseRealtimeSubscriptions();
    } catch (error) {
      console.error('Failed to initialize WebSocket connection:', error);
      this.scheduleReconnect();
    }
  }

  private setupSupabaseRealtimeSubscriptions() {
    // Listen for task changes
    const taskChannel = supabase
      .channel('task_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        (payload) => this.handleTaskUpdate(payload)
      )
      .subscribe();

    // Listen for project changes
    const projectChannel = supabase
      .channel('project_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects',
        },
        (payload) => this.handleProjectUpdate(payload)
      )
      .subscribe();

    // Listen for team changes
    const teamChannel = supabase
      .channel('team_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'teams',
        },
        (payload) => this.handleTeamUpdate(payload)
      )
      .subscribe();
  }

  private async handleTaskUpdate(payload: any) {
    console.log('Task update received:', payload);
    
    // Recalculate affected metrics
    const task = payload.new || payload.old;
    if (task?.project_id) {
      await this.updateProjectMetrics(task.project_id);
      await this.updateTaskMetrics();
      
      if (task.team_id) {
        await this.updateTeamMetrics(task.team_id);
      }
    }
  }

  private async handleProjectUpdate(payload: any) {
    console.log('Project update received:', payload);
    
    const project = payload.new || payload.old;
    if (project?.id) {
      await this.updateProjectMetrics(project.id);
    }
  }

  private async handleTeamUpdate(payload: any) {
    console.log('Team update received:', payload);
    
    const team = payload.new || payload.old;
    if (team?.id) {
      await this.updateTeamMetrics(team.id);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    setTimeout(() => {
      this.reconnectAttempts++;
      this.initializeWebSocket();
    }, delay);
  }

  // Subscribe to real-time analytics updates
  subscribe(subscription: AnalyticsSubscription): string {
    const id = subscription.id || `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const subWithId = { ...subscription, id };
    
    this.subscriptions.set(id, subWithId);

    // Set up polling interval if specified
    if (subscription.refreshInterval && subscription.refreshInterval > 0) {
      const interval = setInterval(async () => {
        await this.fetchAndNotifySubscription(subWithId);
      }, subscription.refreshInterval * 1000);
      
      this.intervals.set(id, interval);
    }

    // Immediate fetch
    this.fetchAndNotifySubscription(subWithId);

    return id;
  }

  // Unsubscribe from analytics updates
  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Clear interval if exists
    const interval = this.intervals.get(subscriptionId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);
    return true;
  }

  // Update project metrics and notify subscribers
  private async updateProjectMetrics(projectId: string) {
    try {
      // Fetch updated project data
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (!project) return;

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId);

      const metrics = AnalyticsService.calculateProjectMetrics(project as Project, tasks || []);
      
      // Notify relevant subscribers
      this.notifySubscribers('project_metrics', {
        type: 'project_metrics',
        projectId,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating project metrics:', error);
    }
  }

  // Update task metrics and notify subscribers
  private async updateTaskMetrics() {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*');

      const metrics = AnalyticsService.calculateTaskMetrics(tasks || []);
      
      // Notify relevant subscribers
      this.notifySubscribers('task_metrics', {
        type: 'task_metrics',
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating task metrics:', error);
    }
  }

  // Update team metrics and notify subscribers
  private async updateTeamMetrics(teamId: string) {
    try {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', teamId);

      const { data: members } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users!team_members_user_id_fkey(*)
        `)
        .eq('team_id', teamId);

      const metrics = AnalyticsService.calculateTeamMetrics(tasks || [], members || []);
      
      // Notify relevant subscribers
      this.notifySubscribers('team_metrics', {
        type: 'team_metrics',
        teamId,
        data: metrics,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating team metrics:', error);
    }
  }

  // Fetch data for a specific subscription
  private async fetchAndNotifySubscription(subscription: AnalyticsSubscription) {
    try {
      let data: any;

      switch (subscription.type) {
        case 'project_metrics':
          if (subscription.filters?.projectIds) {
            data = await this.fetchProjectMetrics(subscription.filters.projectIds);
          }
          break;
        case 'task_metrics':
          data = await this.fetchTaskMetrics(subscription.filters);
          break;
        case 'team_metrics':
          if (subscription.filters?.teamIds) {
            data = await this.fetchTeamMetrics(subscription.filters.teamIds);
          }
          break;
        default:
          return;
      }

      if (data) {
        subscription.callback({
          type: subscription.type,
          data,
          timestamp: new Date().toISOString(),
          ...(subscription.filters?.projectIds?.[0] && { projectId: subscription.filters.projectIds[0] }),
          ...(subscription.filters?.teamIds?.[0] && { teamId: subscription.filters.teamIds[0] }),
        });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  }

  // Notify subscribers of updates
  private notifySubscribers(type: string, update: RealtimeMetricsUpdate) {
    this.subscriptions.forEach((subscription) => {
      if (subscription.type === type) {
        // Check if subscription filters match the update
        if (this.subscriptionMatches(subscription, update)) {
          subscription.callback(update);
        }
      }
    });
  }

  // Check if a subscription matches an update
  private subscriptionMatches(subscription: AnalyticsSubscription, update: RealtimeMetricsUpdate): boolean {
    const filters = subscription.filters;
    if (!filters) return true;

    // Check project filter
    if (filters.projectIds && update.projectId) {
      if (!filters.projectIds.includes(update.projectId)) {
        return false;
      }
    }

    // Check team filter
    if (filters.teamIds && update.teamId) {
      if (!filters.teamIds.includes(update.teamId)) {
        return false;
      }
    }

    return true;
  }

  // Fetch project metrics for specific projects
  private async fetchProjectMetrics(projectIds: string[]): Promise<ProjectMetrics[]> {
    const metrics: ProjectMetrics[] = [];

    for (const projectId of projectIds) {
      const { data: project } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (project) {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', projectId);

        metrics.push(AnalyticsService.calculateProjectMetrics(project as Project, tasks || []));
      }
    }

    return metrics;
  }

  // Fetch task metrics with filters
  private async fetchTaskMetrics(filters?: AnalyticsSubscription['filters']): Promise<TaskMetrics> {
    let query = supabase.from('tasks').select('*');

    if (filters?.projectIds && filters.projectIds.length > 0) {
      query = query.in('project_id', filters.projectIds);
    }

    if (filters?.teamIds && filters.teamIds.length > 0) {
      query = query.in('team_id', filters.teamIds);
    }

    if (filters?.userIds && filters.userIds.length > 0) {
      query = query.in('assigned_to', filters.userIds);
    }

    const { data: tasks } = await query;
    return AnalyticsService.calculateTaskMetrics(tasks || []);
  }

  // Fetch team metrics for specific teams
  private async fetchTeamMetrics(teamIds: string[]): Promise<TeamMetrics[]> {
    const metrics: TeamMetrics[] = [];

    for (const teamId of teamIds) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('team_id', teamId);

      const { data: members } = await supabase
        .from('team_members')
        .select(`
          *,
          user:users!team_members_user_id_fkey(*)
        `)
        .eq('team_id', teamId);

      metrics.push(AnalyticsService.calculateTeamMetrics(tasks || [], members || []));
    }

    return metrics;
  }

  // Generate velocity data with real-time updates
  async getRealtimeVelocityData(
    projectId: string,
    period: 'week' | 'month' | 'quarter' = 'week'
  ): Promise<VelocityData[]> {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: true });

    return AnalyticsService.generateVelocityData(tasks || [], period);
  }

  // Generate burndown data with real-time updates
  async getRealtimeBurndownData(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BurndownData[]> {
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId);

    return AnalyticsService.generateBurndownData(tasks || [], startDate, endDate);
  }

  // Get live chart data for specific metrics
  async getLiveChartData(
    type: 'taskStatus' | 'taskPriority' | 'projectHealth' | 'velocity' | 'burndown',
    options: {
      projectId?: string;
      teamId?: string;
      timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year';
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ChartData> {
    let data: any;

    switch (type) {
      case 'taskStatus':
      case 'taskPriority':
        data = await this.fetchTaskMetrics({
          projectIds: options.projectId ? [options.projectId] : undefined,
          teamIds: options.teamId ? [options.teamId] : undefined,
        });
        break;
      
      case 'projectHealth':
        if (options.projectId) {
          data = await this.fetchProjectMetrics([options.projectId]);
        }
        break;
      
      case 'velocity':
        if (options.projectId) {
          data = await this.getRealtimeVelocityData(options.projectId, options.timeRange as any);
        }
        break;
      
      case 'burndown':
        if (options.projectId && options.startDate && options.endDate) {
          data = await this.getRealtimeBurndownData(options.projectId, options.startDate, options.endDate);
        }
        break;
    }

    return AnalyticsService.generateChartData(type, data);
  }

  // Batch update multiple metrics
  async batchUpdateMetrics(updates: {
    projectIds?: string[];
    teamIds?: string[];
    updateTasks?: boolean;
  }) {
    const promises: Promise<void>[] = [];

    if (updates.projectIds) {
      updates.projectIds.forEach(projectId => {
        promises.push(this.updateProjectMetrics(projectId));
      });
    }

    if (updates.teamIds) {
      updates.teamIds.forEach(teamId => {
        promises.push(this.updateTeamMetrics(teamId));
      });
    }

    if (updates.updateTasks) {
      promises.push(this.updateTaskMetrics());
    }

    await Promise.all(promises);
  }

  // Get connection status
  getConnectionStatus(): 'connected' | 'connecting' | 'disconnected' {
    if (this.wsConnection) {
      return this.wsConnection.readyState === WebSocket.OPEN ? 'connected' : 'connecting';
    }
    return 'disconnected';
  }

  // Get active subscriptions count
  getActiveSubscriptionsCount(): number {
    return this.subscriptions.size;
  }

  // Cleanup all subscriptions
  cleanup() {
    // Clear all intervals
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    
    // Clear all subscriptions
    this.subscriptions.clear();
    
    // Close WebSocket connection
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
  }
}

// Export singleton instance
export const realtimeAnalyticsService = RealtimeAnalyticsService.getInstance();

// Hook for React components to use realtime analytics
export function useRealtimeAnalytics() {
  return {
    subscribe: (subscription: Omit<AnalyticsSubscription, 'id'>) => 
      realtimeAnalyticsService.subscribe({ ...subscription, id: '' }),
    unsubscribe: (subscriptionId: string) => 
      realtimeAnalyticsService.unsubscribe(subscriptionId),
    getConnectionStatus: () => 
      realtimeAnalyticsService.getConnectionStatus(),
    getLiveChartData: (type: any, options: any) => 
      realtimeAnalyticsService.getLiveChartData(type, options),
    getActiveSubscriptionsCount: () => 
      realtimeAnalyticsService.getActiveSubscriptionsCount(),
  };
}