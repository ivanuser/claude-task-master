import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/services/task-service';

const getTaskService = () => {
	const projectRoot = process.env.TASKMASTER_PROJECT_ROOT || process.cwd();
	return new TaskService(projectRoot);
};

export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { status, tag } = await request.json();

		if (!status) {
			return NextResponse.json(
				{ error: 'Status is required' },
				{ status: 400 }
			);
		}

		const validStatuses = ['pending', 'in-progress', 'done', 'blocked', 'deferred', 'cancelled'];
		if (!validStatuses.includes(status)) {
			return NextResponse.json(
				{ error: 'Invalid status value' },
				{ status: 400 }
			);
		}

		const taskService = getTaskService();
		const success = await taskService.updateTaskStatus(params.id, status, tag);

		if (success) {
			return NextResponse.json({ success: true });
		} else {
			return NextResponse.json(
				{ error: 'Failed to update task status' },
				{ status: 500 }
			);
		}
	} catch (error: any) {
		console.error(`Failed to update task ${params.id} status:`, error);
		return NextResponse.json(
			{ error: 'Failed to update task status', message: error.message },
			{ status: 500 }
		);
	}
}