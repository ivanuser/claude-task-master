import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
	console.log('🌱 Seeding database...');

	// Create a test user
	const user = await prisma.user.upsert({
		where: { email: 'admin@taskmaster.dev' },
		update: {},
		create: {
			email: 'admin@taskmaster.dev',
			name: 'Task Master Admin',
			role: 'ADMIN',
			isActive: true,
			settings: {
				theme: 'light',
				notifications: true,
				defaultView: 'dashboard'
			}
		}
	});

	console.log('✅ Created user:', user.email);

	// Create the web-dashboard project
	const webDashboardProject = await prisma.project.upsert({
		where: { tag: 'web-dashboard' },
		update: {},
		create: {
			name: 'Web Dashboard',
			description: 'Task Master centralized web dashboard for multi-project management',
			tag: 'web-dashboard',
			gitUrl: 'https://github.com/user/claude-task-master',
			gitBranch: 'main',
			gitProvider: 'github',
			status: 'ACTIVE',
			visibility: 'PRIVATE',
			settings: {
				syncEnabled: true,
				autoSync: false,
				notifications: true
			}
		}
	});

	console.log('✅ Created project:', webDashboardProject.name);

	// Add user as owner of the project
	await prisma.projectMember.upsert({
		where: {
			userId_projectId: {
				userId: user.id,
				projectId: webDashboardProject.id
			}
		},
		update: {},
		create: {
			userId: user.id,
			projectId: webDashboardProject.id,
			role: 'OWNER',
			permissions: {
				canRead: true,
				canWrite: true,
				canDelete: true,
				canManageMembers: true,
				canManageSettings: true
			}
		}
	});

	console.log('✅ Added user as project owner');

	// Create some sample tasks based on our current Task Master tasks
	const sampleTasks = [
		{
			taskId: '11',
			title: 'Setup Web Dashboard Project Architecture',
			description: 'Initialize Next.js application with TypeScript, Tailwind, and Task Master integration',
			status: 'DONE' as const,
			priority: 'HIGH' as const,
			complexity: 7,
			data: {
				originalId: '11',
				subtasks: ['11.1', '11.2', '11.3', '11.4', '11.5', '11.6', '11.7', '11.8'],
				dependencies: [],
				completedSubtasks: 8,
				totalSubtasks: 8
			},
			details: 'Complete Next.js setup with TypeScript configuration, Tailwind CSS, and Task Master CLI integration',
			testStrategy: 'Build verification, linting, type checking, and integration testing'
		},
		{
			taskId: '12',
			title: 'Implement Database Schema and Migration System',
			description: 'Design and implement PostgreSQL database schema with Prisma ORM',
			status: 'IN_PROGRESS' as const,
			priority: 'HIGH' as const,
			complexity: 8,
			data: {
				originalId: '12',
				subtasks: ['12.1', '12.2', '12.3', '12.4', '12.5', '12.6', '12.7', '12.8'],
				dependencies: ['11'],
				completedSubtasks: 2,
				totalSubtasks: 12
			},
			details: 'PostgreSQL setup with comprehensive schema design for multi-project task management',
			testStrategy: 'Database schema validation, migration testing, connection pooling tests, and data integrity verification'
		},
		{
			taskId: '13',
			title: 'Create Core API Integration',
			description: 'Build comprehensive API layer for Task Master CLI integration',
			status: 'PENDING' as const,
			priority: 'HIGH' as const,
			complexity: 9,
			data: {
				originalId: '13',
				subtasks: [],
				dependencies: ['12'],
				completedSubtasks: 0,
				totalSubtasks: 0
			},
			details: 'RESTful API endpoints with real-time synchronization and error handling',
			testStrategy: 'API endpoint testing, integration tests, and performance testing'
		}
	];

	for (const taskData of sampleTasks) {
		const task = await prisma.task.upsert({
			where: {
				projectId_taskId: {
					projectId: webDashboardProject.id,
					taskId: taskData.taskId
				}
			},
			update: {},
			create: {
				...taskData,
				projectId: webDashboardProject.id
			}
		});

		console.log('✅ Created task:', task.taskId, '-', task.title);
	}

	// Create initial sync history entry
	await prisma.syncHistory.create({
		data: {
			projectId: webDashboardProject.id,
			userId: user.id,
			syncType: 'MANUAL',
			status: 'COMPLETED',
			tasksAdded: sampleTasks.length,
			tasksUpdated: 0,
			tasksRemoved: 0,
			syncData: {
				source: 'database_seed',
				timestamp: new Date().toISOString(),
				version: '1.0.0'
			},
			completedAt: new Date()
		}
	});

	console.log('✅ Created initial sync history');

	// Create a default project for users without specific tags
	const defaultProject = await prisma.project.upsert({
		where: { tag: 'default' },
		update: {},
		create: {
			name: 'Default Project',
			description: 'Default Task Master project for untagged tasks',
			tag: 'default',
			status: 'ACTIVE',
			visibility: 'PRIVATE',
			settings: {
				syncEnabled: true,
				autoSync: false,
				isDefault: true
			}
		}
	});

	// Add user to default project as well
	await prisma.projectMember.upsert({
		where: {
			userId_projectId: {
				userId: user.id,
				projectId: defaultProject.id
			}
		},
		update: {},
		create: {
			userId: user.id,
			projectId: defaultProject.id,
			role: 'OWNER',
			permissions: {
				canRead: true,
				canWrite: true,
				canDelete: true,
				canManageMembers: true,
				canManageSettings: true
			}
		}
	});

	console.log('✅ Created default project');

	console.log('🎉 Database seeded successfully!');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error('❌ Seeding failed:', e);
		await prisma.$disconnect();
		process.exit(1);
	});