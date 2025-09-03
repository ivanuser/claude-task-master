import { PrismaClient, Project, ProjectMember, SyncHistory, ProjectRole, Prisma } from '../../../generated/prisma';
import { prisma } from '../database';

export class ProjectRepository {
	private db: PrismaClient;

	constructor(database = prisma) {
		this.db = database;
	}

	// Project CRUD operations
	async createProject(data: Prisma.ProjectCreateInput): Promise<Project> {
		return this.db.project.create({
			data,
			include: {
				members: {
					include: {
						user: true
					}
				},
				_count: {
					select: {
						tasks: true,
						members: true
					}
				}
			}
		});
	}

	async getProjectById(id: string): Promise<Project | null> {
		return this.db.project.findUnique({
			where: { id },
			include: {
				tasks: {
					orderBy: { taskId: 'asc' }
				},
				members: {
					include: {
						user: true
					}
				},
				syncHistory: {
					take: 10,
					orderBy: { startedAt: 'desc' }
				},
				_count: {
					select: {
						tasks: true,
						members: true
					}
				}
			}
		});
	}

	async getProjectByTag(tag: string): Promise<Project | null> {
		return this.db.project.findUnique({
			where: { tag },
			include: {
				tasks: {
					orderBy: { taskId: 'asc' }
				},
				members: {
					include: {
						user: true
					}
				},
				_count: {
					select: {
						tasks: true,
						members: true
					}
				}
			}
		});
	}

	async getAllProjects(): Promise<Project[]> {
		return this.db.project.findMany({
			orderBy: { createdAt: 'desc' },
			include: {
				_count: {
					select: {
						tasks: true,
						members: true
					}
				}
			}
		});
	}

	async getActiveProjects(): Promise<Project[]> {
		return this.db.project.findMany({
			where: { status: 'ACTIVE' },
			orderBy: { updatedAt: 'desc' },
			include: {
				_count: {
					select: {
						tasks: true,
						members: true
					}
				}
			}
		});
	}

	async updateProject(id: string, data: Prisma.ProjectUpdateInput): Promise<Project> {
		return this.db.project.update({
			where: { id },
			data,
			include: {
				tasks: {
					orderBy: { taskId: 'asc' }
				},
				members: {
					include: {
						user: true
					}
				}
			}
		});
	}

	async deleteProject(id: string): Promise<Project> {
		return this.db.project.delete({
			where: { id }
		});
	}

	// Project statistics
	async getProjectStats(projectId: string) {
		const tasks = await this.db.task.findMany({
			where: { projectId },
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
				total: tasks.reduce((acc, t) => acc + (t.complexity || 0), 0)
			},
			completionRate: tasks.length > 0 ? (tasks.filter(t => t.status === 'DONE').length / tasks.length) * 100 : 0
		};

		return stats;
	}

	// Project search
	async searchProjects(query: string): Promise<Project[]> {
		return this.db.project.findMany({
			where: {
				OR: [
					{ name: { contains: query, mode: 'insensitive' } },
					{ description: { contains: query, mode: 'insensitive' } },
					{ tag: { contains: query, mode: 'insensitive' } }
				]
			},
			include: {
				_count: {
					select: {
						tasks: true,
						members: true
					}
				}
			},
			orderBy: { updatedAt: 'desc' }
		});
	}

	// Project membership operations
	async addMember(projectId: string, userId: string, role: ProjectRole = 'MEMBER'): Promise<ProjectMember> {
		return this.db.projectMember.create({
			data: {
				projectId,
				userId,
				role,
				permissions: {
					canRead: true,
					canWrite: role !== 'VIEWER',
					canDelete: role === 'OWNER' || role === 'ADMIN',
					canManageMembers: role === 'OWNER' || role === 'ADMIN',
					canManageSettings: role === 'OWNER'
				}
			},
			include: {
				user: true,
				project: true
			}
		});
	}

	async removeMember(projectId: string, userId: string): Promise<ProjectMember> {
		return this.db.projectMember.delete({
			where: {
				userId_projectId: {
					userId,
					projectId
				}
			}
		});
	}

	async updateMemberRole(projectId: string, userId: string, role: ProjectRole): Promise<ProjectMember> {
		return this.db.projectMember.update({
			where: {
				userId_projectId: {
					userId,
					projectId
				}
			},
			data: {
				role,
				permissions: {
					canRead: true,
					canWrite: role !== 'VIEWER',
					canDelete: role === 'OWNER' || role === 'ADMIN',
					canManageMembers: role === 'OWNER' || role === 'ADMIN',
					canManageSettings: role === 'OWNER'
				}
			},
			include: {
				user: true,
				project: true
			}
		});
	}

	async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
		return this.db.projectMember.findMany({
			where: { projectId },
			include: {
				user: true
			},
			orderBy: { createdAt: 'asc' }
		});
	}

	// Sync operations
	async createSyncHistory(data: Prisma.SyncHistoryCreateInput): Promise<SyncHistory> {
		return this.db.syncHistory.create({
			data,
			include: {
				project: true,
				user: true
			}
		});
	}

	async updateSyncHistory(id: string, data: Prisma.SyncHistoryUpdateInput): Promise<SyncHistory> {
		return this.db.syncHistory.update({
			where: { id },
			data,
			include: {
				project: true,
				user: true
			}
		});
	}

	async getProjectSyncHistory(projectId: string, limit = 10): Promise<SyncHistory[]> {
		return this.db.syncHistory.findMany({
			where: { projectId },
			orderBy: { startedAt: 'desc' },
			take: limit,
			include: {
				user: true
			}
		});
	}

	async getRecentSyncHistory(limit = 20): Promise<SyncHistory[]> {
		return this.db.syncHistory.findMany({
			orderBy: { startedAt: 'desc' },
			take: limit,
			include: {
				project: true,
				user: true
			}
		});
	}
}