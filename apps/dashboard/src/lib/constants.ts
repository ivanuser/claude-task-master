// App Configuration
export const APP_CONFIG = {
  name: 'Task Master Dashboard',
  version: '0.1.0',
  description:
    'Centralized web dashboard for Task Master multi-project management',
  author: 'Task Master AI',
  repository: 'https://github.com/eyaltoledano/claude-task-master',
} as const

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
  timeout: 10000,
  retries: 3,
} as const

// Task Master Configuration
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  DONE: 'done',
  BLOCKED: 'blocked',
  DEFERRED: 'deferred',
  CANCELLED: 'cancelled',
} as const

export const TASK_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const

export const PROJECT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const

// UI Constants
export const COLORS = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
  },
  success: {
    500: '#10b981',
    600: '#059669',
  },
  warning: {
    500: '#f59e0b',
    600: '#d97706',
  },
  error: {
    500: '#ef4444',
    600: '#dc2626',
  },
} as const

export const TASK_STATUS_COLORS = {
  [TASK_STATUS.PENDING]: 'bg-gray-100 text-gray-800',
  [TASK_STATUS.IN_PROGRESS]: 'bg-blue-100 text-blue-800',
  [TASK_STATUS.DONE]: 'bg-green-100 text-green-800',
  [TASK_STATUS.BLOCKED]: 'bg-red-100 text-red-800',
  [TASK_STATUS.DEFERRED]: 'bg-yellow-100 text-yellow-800',
  [TASK_STATUS.CANCELLED]: 'bg-gray-100 text-gray-500',
} as const

export const TASK_PRIORITY_COLORS = {
  [TASK_PRIORITY.LOW]: 'bg-blue-100 text-blue-800',
  [TASK_PRIORITY.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [TASK_PRIORITY.HIGH]: 'bg-orange-100 text-orange-800',
  [TASK_PRIORITY.CRITICAL]: 'bg-red-100 text-red-800',
} as const

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'taskmaster_auth_token',
  USER_PREFERENCES: 'taskmaster_user_preferences',
  THEME: 'taskmaster_theme',
} as const

// Routes
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/[id]',
  TASKS: '/tasks',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  LOGIN: '/auth/login',
} as const
