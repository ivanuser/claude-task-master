export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'paused' | 'completed' | 'archived';
  gitProvider: 'github' | 'gitlab';
  gitUrl: string | null;
  gitBranch: string | null;
  totalTasks: number;
  completedTasks: number;
  tags: string[];
  memberCount: number;
  lastActivity: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  isTaskMasterProject: boolean;
  hasCustomRules: boolean;
  syncEnabled: boolean;
}