import { NextResponse } from 'next/server';
import { TaskService } from '@/services/task-service';

const getTaskService = () => {
	const projectRoot = process.env.TASKMASTER_PROJECT_ROOT || process.cwd();
	return new TaskService(projectRoot);
};

export async function GET() {
	try {
		const taskService = getTaskService();
		const tags = await taskService.getAvailableTags();
		
		return NextResponse.json(tags);
	} catch (error: any) {
		console.error('Failed to get tags:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch tags', message: error.message },
			{ status: 500 }
		);
	}
}