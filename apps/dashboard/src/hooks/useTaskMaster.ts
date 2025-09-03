'use client';

import { useState, useEffect, useCallback } from 'react';
import { Task, Project, TaskStatus, TaskPriority } from '@/types';
import { TaskService } from '@/services/task-service';

export interface UseTaskMasterOptions {
	projectRoot: string;
	tag?: string;
	autoRefresh?: boolean;
	refreshInterval?: number;
}

export interface TaskMasterState {
	tasks: Task[];
	projects: Project[];
	currentProject: Project | null;
	loading: boolean;
	error: string | null;
	stats: {
		total: number;
		completed: number;
		inProgress: number;
		pending: number;
	};
}

export function useTaskMaster(options: UseTaskMasterOptions) {
	const [state, setState] = useState<TaskMasterState>({
		tasks: [],
		projects: [],
		currentProject: null,
		loading: true,
		error: null,
		stats: { total: 0, completed: 0, inProgress: 0, pending: 0 }
	});

	const [taskService] = useState(() => new TaskService(options.projectRoot));

	const refreshData = useCallback(async () => {
		setState(prev => ({ ...prev, loading: true, error: null }));

		try {
			const [tasks, projectInfo, availableTags, projectStats] = await Promise.all([
				taskService.getAllTasks(options.tag),
				taskService.getProjectInfo(options.tag),
				taskService.getAvailableTags(),
				taskService.getProjectStatistics(options.tag)
			]);

			// Create projects from available tags
			const projects: Project[] = [];
			for (const tag of availableTags) {
				const project = await taskService.getProjectInfo(tag);
				if (project) {
					projects.push(project);
				}
			}

			setState({
				tasks,
				projects,
				currentProject: projectInfo,
				loading: false,
				error: null,
				stats: {
					total: projectStats.overview.total,
					completed: projectStats.overview.completed,
					inProgress: projectStats.overview.inProgress,
					pending: projectStats.overview.pending
				}
			});
		} catch (error: any) {
			setState(prev => ({
				...prev,
				loading: false,
				error: error.message || 'Failed to load Task Master data'
			}));
		}
	}, [taskService, options.tag]);

	// Task operations
	const updateTaskStatus = useCallback(async (taskId: string, status: TaskStatus): Promise<boolean> => {
		try {
			const success = await taskService.updateTaskStatus(taskId, status, options.tag);
			if (success) {
				await refreshData();
			}
			return success;
		} catch (error: any) {
			setState(prev => ({ ...prev, error: error.message }));
			return false;
		}
	}, [taskService, options.tag, refreshData]);

	const createTask = useCallback(async (description: string, useResearch = false): Promise<boolean> => {
		try {
			const success = await taskService.createTask(description, useResearch, options.tag);
			if (success) {
				await refreshData();
			}
			return success;
		} catch (error: any) {
			setState(prev => ({ ...prev, error: error.message }));
			return false;
		}
	}, [taskService, options.tag, refreshData]);

	const expandTask = useCallback(async (taskId: string, useResearch = false, force = false): Promise<boolean> => {
		try {
			const success = await taskService.expandTaskToSubtasks(taskId, useResearch, force, options.tag);
			if (success) {
				await refreshData();
			}
			return success;
		} catch (error: any) {
			setState(prev => ({ ...prev, error: error.message }));
			return false;
		}
	}, [taskService, options.tag, refreshData]);

	const updateTaskDetails = useCallback(async (taskId: string, details: string): Promise<boolean> => {
		try {
			const success = await taskService.updateTaskDetails(taskId, details, options.tag);
			if (success) {
				await refreshData();
			}
			return success;
		} catch (error: any) {
			setState(prev => ({ ...prev, error: error.message }));
			return false;
		}
	}, [taskService, options.tag, refreshData]);

	const updateSubtaskNotes = useCallback(async (taskId: string, notes: string): Promise<boolean> => {
		try {
			const success = await taskService.updateSubtaskNotes(taskId, notes, options.tag);
			if (success) {
				await refreshData();
			}
			return success;
		} catch (error: any) {
			setState(prev => ({ ...prev, error: error.message }));
			return false;
		}
	}, [taskService, options.tag, refreshData]);

	const getNextTask = useCallback(async (): Promise<Task | null> => {
		try {
			return await taskService.getNextAvailableTask(options.tag);
		} catch (error: any) {
			setState(prev => ({ ...prev, error: error.message }));
			return null;
		}
	}, [taskService, options.tag]);

	// Filter methods
	const getTasksByStatus = useCallback((status: TaskStatus) => {
		return state.tasks.filter(task => task.status === status);
	}, [state.tasks]);

	const getTasksByPriority = useCallback((priority: TaskPriority) => {
		return state.tasks.filter(task => task.priority === priority);
	}, [state.tasks]);

	const searchTasks = useCallback((query: string) => {
		if (!query.trim()) return state.tasks;
		
		const lowercaseQuery = query.toLowerCase();
		return state.tasks.filter(task => 
			task.title.toLowerCase().includes(lowercaseQuery) ||
			task.description.toLowerCase().includes(lowercaseQuery) ||
			(task.details && task.details.toLowerCase().includes(lowercaseQuery))
		);
	}, [state.tasks]);

	// Initial data load
	useEffect(() => {
		refreshData();
	}, [refreshData]);

	// Auto-refresh
	useEffect(() => {
		if (options.autoRefresh && options.refreshInterval) {
			const interval = setInterval(refreshData, options.refreshInterval);
			return () => clearInterval(interval);
		}
		return () => {};
	}, [options.autoRefresh, options.refreshInterval, refreshData]);

	return {
		// State
		...state,
		
		// Actions
		refreshData,
		updateTaskStatus,
		createTask,
		expandTask,
		updateTaskDetails,
		updateSubtaskNotes,
		getNextTask,
		
		// Filters
		getTasksByStatus,
		getTasksByPriority,
		searchTasks,
		
		// Computed values
		completedTasks: getTasksByStatus('done'),
		inProgressTasks: getTasksByStatus('in-progress'),
		pendingTasks: getTasksByStatus('pending'),
		highPriorityTasks: getTasksByPriority('high'),
	};
}