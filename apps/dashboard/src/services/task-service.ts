import { TaskMasterIntegration } from '@/lib/task-master';
import { Task, Project, TaskStatus, TaskPriority } from '@/types';

export class TaskService {
	private taskMaster: TaskMasterIntegration;

	constructor(projectRoot: string) {
		this.taskMaster = new TaskMasterIntegration({
			projectRoot,
			timeout: 30000
		});
	}

	// Task Management
	async getAllTasks(tag?: string): Promise<Task[]> {
		return this.taskMaster.getTasks(tag);
	}

	async getTaskById(id: string, tag?: string): Promise<Task | null> {
		return this.taskMaster.getTask(id, tag);
	}

	async updateTaskStatus(id: string, status: TaskStatus, tag?: string): Promise<boolean> {
		return this.taskMaster.setTaskStatus(id, status, tag);
	}

	async createTask(description: string, useResearch = false, tag?: string): Promise<boolean> {
		return this.taskMaster.addTask(description, useResearch, tag);
	}

	async updateTaskDetails(id: string, details: string, tag?: string): Promise<boolean> {
		return this.taskMaster.updateTask(id, details, tag);
	}

	async updateSubtaskNotes(id: string, notes: string, tag?: string): Promise<boolean> {
		return this.taskMaster.updateSubtask(id, notes, tag);
	}

	async expandTaskToSubtasks(id: string, useResearch = false, force = false, tag?: string): Promise<boolean> {
		return this.taskMaster.expandTask(id, useResearch, force, tag);
	}

	async getNextAvailableTask(tag?: string): Promise<Task | null> {
		return this.taskMaster.getNextTask(tag);
	}

	// Task Filtering and Querying
	async getTasksByStatus(status: TaskStatus, tag?: string): Promise<Task[]> {
		const tasks = await this.getAllTasks(tag);
		return tasks.filter(task => task.status === status);
	}

	async getTasksByPriority(priority: TaskPriority, tag?: string): Promise<Task[]> {
		const tasks = await this.getAllTasks(tag);
		return tasks.filter(task => task.priority === priority);
	}

	async getTasksInProgress(tag?: string): Promise<Task[]> {
		return this.getTasksByStatus('in-progress', tag);
	}

	async getCompletedTasks(tag?: string): Promise<Task[]> {
		return this.getTasksByStatus('done', tag);
	}

	async getPendingTasks(tag?: string): Promise<Task[]> {
		return this.getTasksByStatus('pending', tag);
	}

	async getHighPriorityTasks(tag?: string): Promise<Task[]> {
		return this.getTasksByPriority('high', tag);
	}

	// Project Analytics
	async getProjectStatistics(tag?: string): Promise<{
		overview: {
			total: number;
			completed: number;
			inProgress: number;
			pending: number;
			blocked: number;
			deferred: number;
			cancelled: number;
		};
		priorities: {
			high: number;
			medium: number;
			low: number;
			critical: number;
		};
		completionRate: number;
		recentActivity: Task[];
	}> {
		const tasks = await this.getAllTasks(tag);
		
		const overview = {
			total: tasks.length,
			completed: tasks.filter(t => t.status === 'done').length,
			inProgress: tasks.filter(t => t.status === 'in-progress').length,
			pending: tasks.filter(t => t.status === 'pending').length,
			blocked: tasks.filter(t => t.status === 'blocked').length,
			deferred: tasks.filter(t => t.status === 'deferred').length,
			cancelled: tasks.filter(t => t.status === 'cancelled').length
		};

		const priorities = {
			high: tasks.filter(t => t.priority === 'high').length,
			medium: tasks.filter(t => t.priority === 'medium').length,
			low: tasks.filter(t => t.priority === 'low').length,
			critical: tasks.filter(t => t.priority === 'critical').length
		};

		const completionRate = overview.total > 0 ? (overview.completed / overview.total) * 100 : 0;

		// Get recently updated tasks (last 10)
		const recentActivity = tasks
			.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
			.slice(0, 10);

		return {
			overview,
			priorities,
			completionRate,
			recentActivity
		};
	}

	async getComplexityAnalysis(tag?: string): Promise<any> {
		return this.taskMaster.getComplexityReport(tag);
	}

	async runComplexityAnalysis(useResearch = false, tag?: string): Promise<boolean> {
		return this.taskMaster.analyzeComplexity(useResearch, tag);
	}

	// Project Management
	async getAvailableTags(): Promise<string[]> {
		return this.taskMaster.getTags();
	}

	async getProjectInfo(tag?: string): Promise<Project | null> {
		try {
			const stats = await this.taskMaster.getProjectStats(tag);
			const tasks = await this.getAllTasks(tag);
			
			// Create a mock project based on the current working directory and task data
			const project: Project = {
				id: tag || 'default',
				name: tag ? `${tag} Project` : 'Default Project',
				description: `Task Master project${tag ? ` (${tag})` : ''}`,
				status: 'active',
				taskCount: stats.totalTasks,
				completedTaskCount: stats.completedTasks,
				lastSync: new Date().toISOString(),
				createdAt: tasks.length > 0 ? tasks[0].createdAt : new Date().toISOString(),
				updatedAt: new Date().toISOString()
			};

			return project;
		} catch (error) {
			console.error('Failed to get project info:', error);
			return null;
		}
	}

	// Utility Methods
	async refreshData(tag?: string): Promise<{
		tasks: Task[];
		stats: any;
		complexity?: any;
	}> {
		const [tasks, stats, complexity] = await Promise.all([
			this.getAllTasks(tag),
			this.getProjectStatistics(tag),
			this.getComplexityAnalysis(tag).catch(() => null)
		]);

		return { tasks, stats, complexity };
	}

	// Task Operations
	async bulkUpdateTaskStatus(taskIds: string[], status: TaskStatus, tag?: string): Promise<{
		succeeded: string[];
		failed: string[];
	}> {
		const succeeded: string[] = [];
		const failed: string[] = [];

		for (const id of taskIds) {
			const success = await this.updateTaskStatus(id, status, tag);
			if (success) {
				succeeded.push(id);
			} else {
				failed.push(id);
			}
		}

		return { succeeded, failed };
	}

	async searchTasks(query: string, tag?: string): Promise<Task[]> {
		const tasks = await this.getAllTasks(tag);
		const lowercaseQuery = query.toLowerCase();

		return tasks.filter(task => 
			task.title.toLowerCase().includes(lowercaseQuery) ||
			task.description.toLowerCase().includes(lowercaseQuery) ||
			(task.details && task.details.toLowerCase().includes(lowercaseQuery))
		);
	}
}