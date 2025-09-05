import { User, TeamMember } from './team'

export interface Project {
  id: string
  name: string
  description?: string
  slug: string
  status: ProjectStatus
  visibility: 'public' | 'private' | 'team'
  priority: 'low' | 'medium' | 'high' | 'critical'
  teamId: string
  ownerId: string
  owner: {
    id: string
    name: string
    email: string
    avatar?: string
  }
  createdAt: string
  updatedAt: string
  startDate?: string
  endDate?: string
  actualEndDate?: string
  
  // Git integration
  gitProvider: 'github' | 'gitlab' | 'bitbucket' | null
  gitUrl: string | null
  gitBranch: string | null
  repository?: GitRepository
  
  // Task Master specific
  isTaskMasterProject: boolean
  hasCustomRules: boolean
  syncEnabled: boolean
  
  // Metrics
  totalTasks: number
  completedTasks: number
  inProgressTasks?: number
  overdueTasks?: number
  
  // Additional fields
  settings: ProjectSettings
  metrics: ProjectMetrics
  tags: string[]
  color?: string
  icon?: string
  archived: boolean
  memberCount: number
  lastActivity: string | null
}

export type ProjectStatus = 
  | 'planning'
  | 'active'
  | 'in-progress'
  | 'paused'
  | 'on-hold'
  | 'completed'
  | 'cancelled'
  | 'archived'

export interface GitRepository {
  provider: 'github' | 'gitlab' | 'bitbucket' | 'custom'
  url: string
  defaultBranch: string
  connected: boolean
  lastSync?: string
  webhookId?: string
  accessToken?: string
}

export interface ProjectSettings {
  autoAssignTasks: boolean
  requireApproval: boolean
  allowGuestAccess: boolean
  taskPrefix?: string
  defaultTaskTemplate?: string
  workflowStages: WorkflowStage[]
  integrations: ProjectIntegrations
  notifications: ProjectNotificationSettings
}

export interface WorkflowStage {
  id: string
  name: string
  color: string
  order: number
  isDefault?: boolean
  isFinal?: boolean
}

export interface ProjectIntegrations {
  slack?: {
    enabled: boolean
    channelId?: string
    webhookUrl?: string
  }
  jira?: {
    enabled: boolean
    projectKey?: string
    serverUrl?: string
  }
  ci?: {
    enabled: boolean
    provider?: 'jenkins' | 'circleci' | 'github-actions' | 'gitlab-ci'
    configUrl?: string
  }
}

export interface ProjectNotificationSettings {
  onTaskCreated: boolean
  onTaskCompleted: boolean
  onMilestoneReached: boolean
  onDeployment: boolean
  onMemberJoined: boolean
  onMemberLeft: boolean
}

export interface ProjectMetrics {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  overdueTasks: number
  completionRate: number
  velocity: number
  averageTaskTime: number
  burndownRate: number
  healthScore: number
  lastCalculated: string
}

export interface ProjectMember {
  id: string
  projectId: string
  userId: string
  user: User
  role: ProjectRole
  joinedAt: string
  lastActiveAt?: string
  tasksAssigned: number
  tasksCompleted: number
  permissions: ProjectPermission[]
}

export type ProjectRole = 
  | 'owner'
  | 'admin'
  | 'developer'
  | 'designer'
  | 'tester'
  | 'viewer'

export interface ProjectPermission {
  resource: 'tasks' | 'members' | 'settings' | 'repository' | 'deployments'
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

export interface ProjectMilestone {
  id: string
  projectId: string
  name: string
  description?: string
  dueDate: string
  completedAt?: string
  progress: number
  tasksTotal: number
  tasksCompleted: number
  status: 'upcoming' | 'in-progress' | 'completed' | 'overdue'
}

export interface ProjectActivity {
  id: string
  projectId: string
  userId: string
  user?: User
  type: ProjectActivityType
  action: string
  target?: {
    type: 'task' | 'member' | 'milestone' | 'setting' | 'repository'
    id: string
    name: string
  }
  metadata?: Record<string, any>
  timestamp: string
  isImportant: boolean
}

export type ProjectActivityType = 
  | 'project_created'
  | 'project_updated'
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'milestone_created'
  | 'milestone_completed'
  | 'member_added'
  | 'member_removed'
  | 'member_role_changed'
  | 'repository_connected'
  | 'deployment_triggered'
  | 'setting_changed'

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: 'software' | 'marketing' | 'design' | 'research' | 'custom'
  icon: string
  color: string
  structure: {
    milestones: Partial<ProjectMilestone>[]
    workflowStages: WorkflowStage[]
    defaultSettings: Partial<ProjectSettings>
    taskTemplates: TaskTemplate[]
  }
  popularity: number
  isRecommended: boolean
}

export interface TaskTemplate {
  name: string
  description?: string
  priority: 'low' | 'medium' | 'high'
  estimatedHours?: number
  checklist?: string[]
  labels?: string[]
}

export interface ProjectStatistics {
  projectId: string
  period: 'daily' | 'weekly' | 'monthly' | 'all-time'
  tasksCreated: number
  tasksCompleted: number
  averageCompletionTime: number
  teamProductivity: number
  activeMembers: number
  commits?: number
  deployments?: number
  issues?: {
    opened: number
    closed: number
    averageResolutionTime: number
  }
}

export interface ProjectDeployment {
  id: string
  projectId: string
  environment: 'development' | 'staging' | 'production'
  version: string
  commit?: string
  deployedBy: string
  deployedAt: string
  status: 'pending' | 'in-progress' | 'success' | 'failed' | 'rolled-back'
  url?: string
  logs?: string
}

// Helper functions for project role permissions
export const rolePermissions: Record<ProjectRole, ProjectPermission[]> = {
  owner: [
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'members', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'settings', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'repository', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'deployments', actions: ['create', 'read', 'update', 'delete'] },
  ],
  admin: [
    { resource: 'tasks', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'members', actions: ['create', 'read', 'update'] },
    { resource: 'settings', actions: ['read', 'update'] },
    { resource: 'repository', actions: ['read', 'update'] },
    { resource: 'deployments', actions: ['create', 'read', 'update'] },
  ],
  developer: [
    { resource: 'tasks', actions: ['create', 'read', 'update'] },
    { resource: 'members', actions: ['read'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'repository', actions: ['read', 'update'] },
    { resource: 'deployments', actions: ['read'] },
  ],
  designer: [
    { resource: 'tasks', actions: ['create', 'read', 'update'] },
    { resource: 'members', actions: ['read'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'repository', actions: ['read'] },
    { resource: 'deployments', actions: ['read'] },
  ],
  tester: [
    { resource: 'tasks', actions: ['read', 'update'] },
    { resource: 'members', actions: ['read'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'repository', actions: ['read'] },
    { resource: 'deployments', actions: ['read'] },
  ],
  viewer: [
    { resource: 'tasks', actions: ['read'] },
    { resource: 'members', actions: ['read'] },
    { resource: 'settings', actions: ['read'] },
    { resource: 'repository', actions: ['read'] },
    { resource: 'deployments', actions: ['read'] },
  ],
}

export function hasProjectPermission(
  role: ProjectRole,
  resource: ProjectPermission['resource'],
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const permissions = rolePermissions[role] || []
  const permission = permissions.find(p => p.resource === resource)
  return permission ? permission.actions.includes(action) : false
}