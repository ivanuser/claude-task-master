export interface ProjectMetrics {
  projectId: string;
  projectName: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  blockedTasks: number;
  completionRate: number;
  averageTaskDuration: number; // in days
  velocity: number; // tasks per day
  healthScore: number; // 0-100
  lastActivity: string;
  trending: 'up' | 'down' | 'stable';
}

export interface TaskMetrics {
  totalTasks: number;
  byStatus: {
    pending: number;
    inProgress: number;
    review: number;
    done: number;
    blocked: number;
    cancelled: number;
    deferred: number;
  };
  byPriority: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  averageComplexity: number;
  averageDuration: number;
  overdueTasks: number;
  tasksTrend: TimeSeriesData[];
}

export interface TeamMetrics {
  teamSize: number;
  activeMembers: number;
  totalTasksCompleted: number;
  averageTasksPerMember: number;
  topPerformers: TeamMember[];
  productivity: TimeSeriesData[];
  collaborationScore: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tasksCompleted: number;
  tasksInProgress: number;
  averageCompletionTime: number;
  productivityScore: number;
  streak: number; // days
}

export interface TimeSeriesData {
  date: string;
  value: number;
  label?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'list' | 'table' | 'progress';
  title: string;
  description?: string;
  data: any;
  config: WidgetConfig;
  position: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface WidgetConfig {
  chartType?: 'line' | 'bar' | 'pie' | 'doughnut' | 'radar' | 'area';
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  timeRange?: 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all';
  refreshInterval?: number; // in seconds
  dataSource?: string;
  filters?: Record<string, any>;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  type: 'project' | 'team' | 'personal' | 'custom';
  generatedAt: string;
  generatedBy: string;
  format: 'pdf' | 'csv' | 'json' | 'excel';
  data: any;
  filters: ReportFilters;
  schedule?: ReportSchedule;
}

export interface ReportFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  projects?: string[];
  teams?: string[];
  members?: string[];
  taskStatuses?: string[];
  taskPriorities?: string[];
  tags?: string[];
}

export interface ReportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6
  dayOfMonth?: number; // 1-31
  time?: string; // HH:mm
  recipients: string[]; // email addresses
  enabled: boolean;
}

export interface AnalyticsSummary {
  overview: {
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    completedTasks: number;
    totalMembers: number;
    overallHealthScore: number;
  };
  performance: {
    completionRate: number;
    averageVelocity: number;
    productivityTrend: 'improving' | 'declining' | 'stable';
    estimatedCompletion: string; // date
  };
  insights: Insight[];
  recommendations: Recommendation[];
}

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral';
  title: string;
  description: string;
  metric?: string;
  value?: number;
  change?: number;
  impact: 'high' | 'medium' | 'low';
  timestamp: string;
}

export interface Recommendation {
  id: string;
  type: 'action' | 'improvement' | 'warning';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  actionItems?: string[];
  estimatedImpact?: string;
  relatedMetrics?: string[];
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface VelocityData {
  period: string;
  tasksCompleted: number;
  storyPoints?: number;
  averageCycleTime: number;
  throughput: number;
}

export interface BurndownData {
  date: string;
  ideal: number;
  actual: number;
  predicted?: number;
  scope?: number;
}