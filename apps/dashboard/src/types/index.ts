// Core Task Master Types
export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  dependencies: string[]
  subtasks?: Task[]
  details?: string
  testStrategy?: string
  complexity?: number
  createdAt: string
  updatedAt: string
  projectId?: string
}

export type TaskStatus =
  | 'pending'
  | 'in-progress'
  | 'done'
  | 'blocked'
  | 'deferred'
  | 'cancelled'

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'

// Project Types
export interface Project {
  id: string
  name: string
  description?: string
  gitUrl?: string
  branch?: string
  ownerId?: string
  status: ProjectStatus
  tags?: string[]
  taskCount: number
  completedTaskCount: number
  lastSync?: string
  createdAt: string
  updatedAt: string
}

export type ProjectStatus = 'active' | 'inactive' | 'archived'

// User Types
export interface User {
  id: string
  email: string
  name?: string
  githubId?: string
  gitlabId?: string
  createdAt: Date
  role: UserRole
}

export type UserRole = 'admin' | 'member' | 'viewer'

// Dashboard Types
export interface DashboardStats {
  totalProjects: number
  totalTasks: number
  completedTasks: number
  activeProjects: number
  recentActivity: Activity[]
}

export interface Activity {
  id: string
  type: ActivityType
  message: string
  projectId?: string
  taskId?: string
  userId: string
  createdAt: Date
}

export type ActivityType =
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'project_created'
  | 'project_synced'
  | 'user_joined'

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Component Props Types
export interface BaseComponentProps {
  className?: string
  children?: React.ReactNode
}

// Git Integration Types
export interface GitProvider {
  id: string
  name: 'github' | 'gitlab'
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
}

export interface Repository {
  id: string
  name: string
  fullName: string
  url: string
  provider: 'github' | 'gitlab'
  hasTaskMaster: boolean
  lastCheckedAt: Date
}
