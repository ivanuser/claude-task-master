import { NextRequest, NextResponse } from 'next/server';

// Mock project data
const mockProjects = [
  {
    id: '1',
    name: 'Task Master Dashboard',
    description: 'Web dashboard for Task Master projects',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/task-master-dashboard',
    gitBranch: 'main',
    totalTasks: 25,
    completedTasks: 16,
    tags: ['dashboard', 'web', 'react'],
    memberCount: 2,
    lastActivity: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    owner: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    isTaskMasterProject: true,
    hasCustomRules: true,
    syncEnabled: true,
  },
  {
    id: '2',
    name: 'Task Master CLI',
    description: 'Command-line interface for Task Master',
    status: 'active',
    gitProvider: 'github',
    gitUrl: 'https://github.com/user/task-master-cli',
    gitBranch: 'develop',
    totalTasks: 42,
    completedTasks: 38,
    tags: ['cli', 'nodejs', 'typescript'],
    memberCount: 3,
    lastActivity: new Date(Date.now() - 86400000).toISOString(),
    createdAt: new Date(Date.now() - 604800000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    owner: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
    },
    isTaskMasterProject: true,
    hasCustomRules: false,
    syncEnabled: true,
  },
];

export async function GET(request: NextRequest) {
  // Return mock projects
  return NextResponse.json({
    projects: mockProjects,
    pagination: {
      page: 1,
      limit: 20,
      total: mockProjects.length,
      totalPages: 1,
    }
  });
}

export async function POST(request: NextRequest) {
  // Return mock success
  return NextResponse.json({ success: true });
}