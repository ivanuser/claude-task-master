import { Task, TaskStatus, TaskPriority } from '@/types';

export interface TaskMasterClientConfig {
	baseUrl?: string;
	projectRoot: string;
	timeout?: number;
}

/**
 * Client-side utilities for Task Master integration
 * This provides a consistent interface for the dashboard components
 */
export class TaskMasterClient {
	private config: TaskMasterClientConfig;

	constructor(config: TaskMasterClientConfig) {
		this.config = {
			baseUrl: '/api/taskmaster',
			timeout: 30000,
			...config
		};
	}

	private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
		const url = `${this.config.baseUrl}${endpoint}`;
		
		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
				...options.headers,
			},
			...options,
		});

		if (!response.ok) {
			throw new Error(`API request failed: ${response.statusText}`);
		}

		return response.json();
	}

	// Task operations
	async getTasks(tag?: string): Promise<Task[]> {
		const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
		return this.request<Task[]>(`/tasks${params}`);
	}

	async getTask(id: string, tag?: string): Promise<Task> {
		const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
		return this.request<Task>(`/tasks/${id}${params}`);
	}

	async updateTaskStatus(id: string, status: TaskStatus, tag?: string): Promise<{ success: boolean }> {
		return this.request(`/tasks/${id}/status`, {
			method: 'PUT',
			body: JSON.stringify({ status, tag }),
		});
	}

	async createTask(description: string, useResearch = false, tag?: string): Promise<{ success: boolean }> {
		return this.request('/tasks', {
			method: 'POST',
			body: JSON.stringify({ description, useResearch, tag }),
		});
	}

	async updateTask(id: string, details: string, tag?: string): Promise<{ success: boolean }> {
		return this.request(`/tasks/${id}`, {
			method: 'PUT',
			body: JSON.stringify({ details, tag }),
		});
	}

	async expandTask(id: string, useResearch = false, force = false, tag?: string): Promise<{ success: boolean }> {
		return this.request(`/tasks/${id}/expand`, {
			method: 'POST',
			body: JSON.stringify({ useResearch, force, tag }),
		});
	}

	async getNextTask(tag?: string): Promise<Task | null> {
		const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
		try {
			return await this.request<Task>(`/tasks/next${params}`);
		} catch (error) {
			return null;
		}
	}

	// Project operations
	async getProjects(): Promise<any[]> {
		return this.request('/projects');
	}

	async getProjectStats(tag?: string): Promise<any> {
		const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
		return this.request(`/projects/stats${params}`);
	}

	async getTags(): Promise<string[]> {
		return this.request('/tags');
	}

	// Analytics
	async getComplexityReport(tag?: string): Promise<any> {
		const params = tag ? `?tag=${encodeURIComponent(tag)}` : '';
		return this.request(`/analytics/complexity${params}`);
	}

	async runComplexityAnalysis(useResearch = false, tag?: string): Promise<{ success: boolean }> {
		return this.request('/analytics/complexity', {
			method: 'POST',
			body: JSON.stringify({ useResearch, tag }),
		});
	}
}

// Utility functions for client-side task management
export const TaskUtils = {
	getStatusColor(status: TaskStatus): string {
		const colors = {
			pending: 'bg-gray-100 text-gray-800',
			'in-progress': 'bg-blue-100 text-blue-800',
			done: 'bg-green-100 text-green-800',
			blocked: 'bg-red-100 text-red-800',
			deferred: 'bg-yellow-100 text-yellow-800',
			cancelled: 'bg-gray-100 text-gray-500',
		};
		return colors[status] || colors.pending;
	},

	getPriorityColor(priority: TaskPriority): string {
		const colors = {
			low: 'bg-blue-100 text-blue-800',
			medium: 'bg-yellow-100 text-yellow-800',
			high: 'bg-orange-100 text-orange-800',
			critical: 'bg-red-100 text-red-800',
		};
		return colors[priority] || colors.medium;
	},

	formatTaskId(id: string): string {
		return id.includes('.') ? `Subtask ${id}` : `Task ${id}`;
	},

	isSubtask(task: Task): boolean {
		return task.id.includes('.');
	},

	getParentTaskId(subtaskId: string): string | null {
		const parts = subtaskId.split('.');
		return parts.length > 1 ? parts.slice(0, -1).join('.') : null;
	},

	sortTasksByPriority(tasks: Task[]): Task[] {
		const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
		return [...tasks].sort((a, b) => {
			const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
			const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;
			return aPriority - bPriority;
		});
	},

	sortTasksByStatus(tasks: Task[]): Task[] {
		const statusOrder = { 
			'in-progress': 0, 
			pending: 1, 
			blocked: 2, 
			deferred: 3, 
			done: 4, 
			cancelled: 5 
		};
		return [...tasks].sort((a, b) => {
			const aStatus = statusOrder[a.status as keyof typeof statusOrder] ?? 1;
			const bStatus = statusOrder[b.status as keyof typeof statusOrder] ?? 1;
			return aStatus - bStatus;
		});
	},

	groupTasksByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
		const groups: Record<string, Task[]> = {};
		tasks.forEach(task => {
			if (!groups[task.status]) {
				groups[task.status] = [];
			}
			groups[task.status].push(task);
		});
		return groups as Record<TaskStatus, Task[]>;
	},

	calculateProgress(tasks: Task[]): {
		total: number;
		completed: number;
		percentage: number;
	} {
		const total = tasks.length;
		const completed = tasks.filter(t => t.status === 'done').length;
		const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
		
		return { total, completed, percentage };
	},

	getTasksByTimeframe(tasks: Task[], days: number): Task[] {
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - days);
		
		return tasks.filter(task => {
			const updatedAt = new Date(task.updatedAt);
			return updatedAt >= cutoff;
		});
	},

	searchTasks(tasks: Task[], query: string): Task[] {
		if (!query.trim()) return tasks;
		
		const lowerQuery = query.toLowerCase();
		return tasks.filter(task => 
			task.title.toLowerCase().includes(lowerQuery) ||
			task.description.toLowerCase().includes(lowerQuery) ||
			(task.details && task.details.toLowerCase().includes(lowerQuery)) ||
			task.id.includes(query)
		);
	}
};