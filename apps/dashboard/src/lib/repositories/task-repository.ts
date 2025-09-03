import { PrismaClient, Task, TaskStatus, TaskPriority, Prisma } from '../../../generated/prisma';
import { prisma } from '../database';

export class TaskRepository {
	private db: PrismaClient;

	constructor(database = prisma) {
		this.db = database;
	}

	// Task CRUD operations
	async createTask(data: Prisma.TaskCreateInput): Promise<Task> {
		return this.db.task.create({
			data,
			include: {
				project: true,
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async getTaskById(id: string): Promise<Task | null> {
		return this.db.task.findUnique({
			where: { id },
			include: {
				project: true,
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async getTaskByProjectAndTaskId(projectId: string, taskId: string): Promise<Task | null> {
		return this.db.task.findUnique({
			where: {
				projectId_taskId: {
					projectId,
					taskId
				}
			},
			include: {
				project: true,
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async getTasksByProject(projectId: string): Promise<Task[]> {
		return this.db.task.findMany({
			where: { projectId },
			orderBy: { taskId: 'asc' },
			include: {
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async getTasksByProjectAndStatus(projectId: string, status: TaskStatus): Promise<Task[]> {
		return this.db.task.findMany({
			where: {
				projectId,
				status
			},
			orderBy: { taskId: 'asc' },
			include: {
				project: true
			}
		});
	}

	async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
		return this.db.task.findMany({
			where: { status },
			orderBy: [
				{ priority: 'desc' },
				{ createdAt: 'asc' }
			],
			include: {
				project: true
			}
		});
	}

	async getTasksByPriority(priority: TaskPriority): Promise<Task[]> {
		return this.db.task.findMany({
			where: { priority },
			orderBy: [
				{ status: 'asc' },
				{ createdAt: 'asc' }
			],
			include: {
				project: true
			}
		});
	}

	async updateTask(id: string, data: Prisma.TaskUpdateInput): Promise<Task> {
		return this.db.task.update({
			where: { id },
			data,
			include: {
				project: true,
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async updateTaskStatus(id: string, status: TaskStatus): Promise<Task> {
		return this.db.task.update({
			where: { id },
			data: { 
				status,
				updatedAt: new Date()
			},
			include: {
				project: true
			}
		});
	}

	async deleteTask(id: string): Promise<Task> {
		return this.db.task.delete({
			where: { id },
			include: {
				project: true
			}
		});
	}

	// Bulk operations
	async bulkUpdateTaskStatus(taskIds: string[], status: TaskStatus): Promise<{ count: number }> {
		return this.db.task.updateMany({
			where: {
				id: {
					in: taskIds
				}
			},
			data: {
				status,
				updatedAt: new Date()
			}
		});
	}

	async bulkCreateTasks(tasks: Prisma.TaskCreateManyInput[]): Promise<{ count: number }> {
		return this.db.task.createMany({
			data: tasks,
			skipDuplicates: true
		});
	}

	async bulkDeleteTasks(taskIds: string[]): Promise<{ count: number }> {
		return this.db.task.deleteMany({
			where: {
				id: {
					in: taskIds
				}
			}
		});
	}

	// Task dependencies
	async addTaskDependency(taskId: string, dependsOnTaskId: string): Promise<Task> {
		return this.db.task.update({
			where: { id: taskId },
			data: {
				dependencies: {
					connect: { id: dependsOnTaskId }
				}
			},
			include: {
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async removeTaskDependency(taskId: string, dependsOnTaskId: string): Promise<Task> {
		return this.db.task.update({
			where: { id: taskId },
			data: {
				dependencies: {
					disconnect: { id: dependsOnTaskId }
				}
			},
			include: {
				dependencies: true,
				dependentTasks: true
			}
		});
	}

	async getTaskDependencies(taskId: string): Promise<Task[]> {
		const task = await this.db.task.findUnique({
			where: { id: taskId },
			include: {
				dependencies: {
					include: {
						project: true
					}
				}
			}
		});

		return task?.dependencies || [];
	}

	async getDependentTasks(taskId: string): Promise<Task[]> {
		const task = await this.db.task.findUnique({
			where: { id: taskId },
			include: {
				dependentTasks: {
					include: {
						project: true
					}
				}
			}
		});

		return task?.dependentTasks || [];
	}

	// Task search and filtering
	async searchTasks(query: string, projectId?: string): Promise<Task[]> {
		return this.db.task.findMany({
			where: {
				AND: [
					projectId ? { projectId } : {},
					{
						OR: [
							{ title: { contains: query, mode: 'insensitive' } },
							{ description: { contains: query, mode: 'insensitive' } },
							{ taskId: { contains: query, mode: 'insensitive' } },
							{ details: { contains: query, mode: 'insensitive' } }
						]
					}
				]
			},
			include: {
				project: true
			},
			orderBy: [
				{ priority: 'desc' },
				{ updatedAt: 'desc' }
			]
		});
	}

	async getTasksByComplexity(minComplexity?: number, maxComplexity?: number): Promise<Task[]> {
		const where: any = {};
		
		if (minComplexity !== undefined || maxComplexity !== undefined) {
			where.complexity = {};
			if (minComplexity !== undefined) where.complexity.gte = minComplexity;
			if (maxComplexity !== undefined) where.complexity.lte = maxComplexity;
		}

		return this.db.task.findMany({
			where,
			orderBy: [
				{ complexity: 'desc' },
				{ priority: 'desc' }
			],
			include: {
				project: true
			}
		});
	}

	async getRecentlyUpdatedTasks(limit = 10): Promise<Task[]> {
		return this.db.task.findMany({
			orderBy: { updatedAt: 'desc' },
			take: limit,
			include: {
				project: true
			}
		});
	}

	async getTasksCreatedInDateRange(startDate: Date, endDate: Date): Promise<Task[]> {
		return this.db.task.findMany({
			where: {
				createdAt: {
					gte: startDate,
					lte: endDate
				}
			},
			include: {
				project: true
			},
			orderBy: { createdAt: 'desc' }
		});
	}

	// Task statistics
	async getTaskStats(projectId?: string) {
		const where = projectId ? { projectId } : {};

		const tasks = await this.db.task.findMany({
			where,
			select: {
				status: true,
				priority: true,
				complexity: true,
				createdAt: true,
				updatedAt: true
			}
		});

		const stats = {
			total: tasks.length,
			byStatus: {
				PENDING: tasks.filter(t => t.status === 'PENDING').length,
				IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS').length,
				DONE: tasks.filter(t => t.status === 'DONE').length,
				BLOCKED: tasks.filter(t => t.status === 'BLOCKED').length,
				DEFERRED: tasks.filter(t => t.status === 'DEFERRED').length,
				CANCELLED: tasks.filter(t => t.status === 'CANCELLED').length,
				REVIEW: tasks.filter(t => t.status === 'REVIEW').length
			},
			byPriority: {
				LOW: tasks.filter(t => t.priority === 'LOW').length,
				MEDIUM: tasks.filter(t => t.priority === 'MEDIUM').length,
				HIGH: tasks.filter(t => t.priority === 'HIGH').length,
				CRITICAL: tasks.filter(t => t.priority === 'CRITICAL').length
			},
			complexity: {
				average: tasks.filter(t => t.complexity !== null).reduce((acc, t) => acc + (t.complexity || 0), 0) / tasks.filter(t => t.complexity !== null).length || 0,
				total: tasks.reduce((acc, t) => acc + (t.complexity || 0), 0),
				min: Math.min(...tasks.map(t => t.complexity || 0).filter(c => c > 0)),
				max: Math.max(...tasks.map(t => t.complexity || 0))
			},
			completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100 : 0
		};

		return stats;
	}

	// Synchronization helpers
	async syncTaskFromTaskMaster(projectId: string, taskMasterTask: any): Promise<Task> {
		const existingTask = await this.getTaskByProjectAndTaskId(projectId, taskMasterTask.id);

		const taskData: Prisma.TaskCreateInput | Prisma.TaskUpdateInput = {
			taskId: taskMasterTask.id,
			title: taskMasterTask.title,
			description: taskMasterTask.description,
			status: this.mapTaskMasterStatus(taskMasterTask.status),
			priority: this.mapTaskMasterPriority(taskMasterTask.priority),
			complexity: taskMasterTask.complexity,
			data: taskMasterTask,
			details: taskMasterTask.details,
			testStrategy: taskMasterTask.testStrategy,
			updatedAt: new Date()
		};

		if (existingTask) {
			return this.updateTask(existingTask.id, taskData);
		} else {
			return this.createTask({
				...taskData,
				project: {
					connect: { id: projectId }
				}
			} as Prisma.TaskCreateInput);
		}
	}

	private mapTaskMasterStatus(status: string): TaskStatus {
		const statusMap: Record<string, TaskStatus> = {
			'pending': 'PENDING',
			'in-progress': 'IN_PROGRESS',
			'done': 'DONE',
			'blocked': 'BLOCKED',
			'deferred': 'DEFERRED',
			'cancelled': 'CANCELLED',
			'review': 'REVIEW'
		};

		return statusMap[status] || 'PENDING';
	}

	private mapTaskMasterPriority(priority: string): TaskPriority {
		const priorityMap: Record<string, TaskPriority> = {
			'low': 'LOW',
			'medium': 'MEDIUM',
			'high': 'HIGH',
			'critical': 'CRITICAL'
		};

		return priorityMap[priority] || 'MEDIUM';
	}
}