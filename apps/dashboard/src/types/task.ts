export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'review' | 'done' | 'blocked' | 'cancelled' | 'deferred';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  subtasks?: Task[];
  details?: string;
  testStrategy?: string;
  createdAt?: string;
  updatedAt?: string;
  assignedTo?: string;
  dueDate?: string;
  tags?: string[];
  complexity?: number;
  projectId?: string;
  projectName?: string;
}