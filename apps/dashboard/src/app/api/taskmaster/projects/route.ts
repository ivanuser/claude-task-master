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
		
		// Create project objects for each tag
		const projects = await Promise.all(
			tags.map(async (tag) => {
				try {
					return await taskService.getProjectInfo(tag);
				} catch (error) {
					console.warn(`Failed to get project info for tag ${tag}:`, error);
					return null;
				}
			})
		);

		// Filter out failed projects and add default project
		const validProjects = projects.filter(p => p !== null);
		
		// Add default project if no tag specified
		try {
			const defaultProject = await taskService.getProjectInfo();
			if (defaultProject && !validProjects.find(p => p?.id === 'default')) {
				validProjects.unshift(defaultProject);
			}
		} catch (error) {
			console.warn('Failed to get default project info:', error);
		}

		return NextResponse.json(validProjects);
	} catch (error: any) {
		console.error('Failed to get projects:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch projects', message: error.message },
			{ status: 500 }
		);
	}
}