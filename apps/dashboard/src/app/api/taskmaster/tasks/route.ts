import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/services/task-service';

const getTaskService = () => {
	const projectRoot = process.env.TASKMASTER_PROJECT_ROOT || process.cwd();
	return new TaskService(projectRoot);
};

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const tag = searchParams.get('tag') || undefined;
		const status = searchParams.get('status') || undefined;
		const priority = searchParams.get('priority') || undefined;

		const taskService = getTaskService();
		let tasks = await taskService.getAllTasks(tag);

		// Apply filters
		if (status) {
			tasks = tasks.filter(task => task.status === status);
		}

		if (priority) {
			tasks = tasks.filter(task => task.priority === priority);
		}

		return NextResponse.json(tasks);
	} catch (error: any) {
		console.error('Failed to get tasks:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch tasks', message: error.message },
			{ status: 500 }
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		const { description, useResearch = false, tag } = await request.json();

		if (!description?.trim()) {
			return NextResponse.json(
				{ error: 'Description is required' },
				{ status: 400 }
			);
		}

		const taskService = getTaskService();
		const success = await taskService.createTask(description, useResearch, tag);

		if (success) {
			return NextResponse.json({ success: true });
		} else {
			return NextResponse.json(
				{ error: 'Failed to create task' },
				{ status: 500 }
			);
		}
	} catch (error: any) {
		console.error('Failed to create task:', error);
		return NextResponse.json(
			{ error: 'Failed to create task', message: error.message },
			{ status: 500 }
		);
	}
}