import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/services/task-service';

const getTaskService = () => {
	const projectRoot = process.env.TASKMASTER_PROJECT_ROOT || process.cwd();
	return new TaskService(projectRoot);
};

export async function GET(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const tag = searchParams.get('tag') || undefined;

		const taskService = getTaskService();
		const task = await taskService.getTaskById(params.id, tag);

		if (!task) {
			return NextResponse.json(
				{ error: 'Task not found' },
				{ status: 404 }
			);
		}

		return NextResponse.json(task);
	} catch (error: any) {
		console.error(`Failed to get task ${params.id}:`, error);
		return NextResponse.json(
			{ error: 'Failed to fetch task', message: error.message },
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { details, tag } = await request.json();

		if (!details?.trim()) {
			return NextResponse.json(
				{ error: 'Details are required' },
				{ status: 400 }
			);
		}

		const taskService = getTaskService();
		const success = await taskService.updateTaskDetails(params.id, details, tag);

		if (success) {
			return NextResponse.json({ success: true });
		} else {
			return NextResponse.json(
				{ error: 'Failed to update task' },
				{ status: 500 }
			);
		}
	} catch (error: any) {
		console.error(`Failed to update task ${params.id}:`, error);
		return NextResponse.json(
			{ error: 'Failed to update task', message: error.message },
			{ status: 500 }
		);
	}
}