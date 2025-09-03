import { exec } from 'child_process';
import { promisify } from 'util';
import { Task, TaskStatus } from '@/types';

const execAsync = promisify(exec);

export interface TaskMasterConfig {
	projectRoot: string;
	cliPath?: string;
	timeout?: number;
}

export class TaskMasterIntegration {
	private config: TaskMasterConfig;

	constructor(config: TaskMasterConfig) {
		this.config = {
			timeout: 30000,
			cliPath: 'task-master',
			...config
		};
	}

	private async runCommand(command: string): Promise<string> {
		const fullCommand = `cd "${this.config.projectRoot}" && ${this.config.cliPath} ${command}`;
		
		try {
			const { stdout, stderr } = await execAsync(fullCommand, {
				timeout: this.config.timeout,
				cwd: this.config.projectRoot
			});
			
			if (stderr && !stderr.includes('[INFO]') && !stderr.includes('🏷️')) {
				console.warn('Task Master stderr:', stderr);
			}
			
			return stdout;
		} catch (error: any) {
			throw new Error(`Task Master command failed: ${error.message}`);
		}
	}

	async getTasks(tag?: string): Promise<Task[]> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const output = await this.runCommand(`list ${tagFlag} --format=json`);
			
			if (!output.trim()) {
				return [];
			}

			const tasks = JSON.parse(output);
			return Array.isArray(tasks) ? tasks : [];
		} catch (error: any) {
			console.error('Failed to get tasks:', error);
			return [];
		}
	}

	async getTask(id: string, tag?: string): Promise<Task | null> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const output = await this.runCommand(`show ${id} ${tagFlag} --format=json`);
			
			if (!output.trim()) {
				return null;
			}

			return JSON.parse(output);
		} catch (error: any) {
			console.error(`Failed to get task ${id}:`, error);
			return null;
		}
	}

	async setTaskStatus(id: string, status: TaskStatus, tag?: string): Promise<boolean> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			await this.runCommand(`set-status --id="${id}" --status="${status}" ${tagFlag}`);
			return true;
		} catch (error: any) {
			console.error(`Failed to set task ${id} status:`, error);
			return false;
		}
	}

	async addTask(prompt: string, research = false, tag?: string): Promise<boolean> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const researchFlag = research ? '--research' : '';
			await this.runCommand(`add-task --prompt="${prompt}" ${researchFlag} ${tagFlag}`);
			return true;
		} catch (error: any) {
			console.error('Failed to add task:', error);
			return false;
		}
	}

	async updateTask(id: string, prompt: string, tag?: string): Promise<boolean> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			await this.runCommand(`update-task --id="${id}" --prompt="${prompt}" ${tagFlag}`);
			return true;
		} catch (error: any) {
			console.error(`Failed to update task ${id}:`, error);
			return false;
		}
	}

	async updateSubtask(id: string, prompt: string, tag?: string): Promise<boolean> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			await this.runCommand(`update-subtask --id="${id}" --prompt="${prompt}" ${tagFlag}`);
			return true;
		} catch (error: any) {
			console.error(`Failed to update subtask ${id}:`, error);
			return false;
		}
	}

	async expandTask(id: string, research = false, force = false, tag?: string): Promise<boolean> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const researchFlag = research ? '--research' : '';
			const forceFlag = force ? '--force' : '';
			await this.runCommand(`expand --id="${id}" ${researchFlag} ${forceFlag} ${tagFlag}`);
			return true;
		} catch (error: any) {
			console.error(`Failed to expand task ${id}:`, error);
			return false;
		}
	}

	async getNextTask(tag?: string): Promise<Task | null> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const output = await this.runCommand(`next ${tagFlag} --format=json`);
			
			if (!output.trim()) {
				return null;
			}

			return JSON.parse(output);
		} catch (error: any) {
			console.error('Failed to get next task:', error);
			return null;
		}
	}

	async getComplexityReport(tag?: string): Promise<any> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const output = await this.runCommand(`complexity-report ${tagFlag} --format=json`);
			
			if (!output.trim()) {
				return null;
			}

			return JSON.parse(output);
		} catch (error: any) {
			console.error('Failed to get complexity report:', error);
			return null;
		}
	}

	async analyzeComplexity(research = false, tag?: string): Promise<boolean> {
		try {
			const tagFlag = tag ? `--tag="${tag}"` : '';
			const researchFlag = research ? '--research' : '';
			await this.runCommand(`analyze-complexity ${researchFlag} ${tagFlag}`);
			return true;
		} catch (error: any) {
			console.error('Failed to analyze complexity:', error);
			return false;
		}
	}

	async getTags(): Promise<string[]> {
		try {
			const output = await this.runCommand('list --tags');
			const lines = output.split('\n').filter(line => line.trim());
			return lines.map(line => line.replace(/^🏷️\s*tag:\s*/, '').trim()).filter(Boolean);
		} catch (error: any) {
			console.error('Failed to get tags:', error);
			return [];
		}
	}

	async getProjectStats(tag?: string): Promise<{
		totalTasks: number;
		completedTasks: number;
		inProgressTasks: number;
		pendingTasks: number;
	}> {
		try {
			const tasks = await this.getTasks(tag);
			
			const stats = {
				totalTasks: tasks.length,
				completedTasks: tasks.filter(t => t.status === 'done').length,
				inProgressTasks: tasks.filter(t => t.status === 'in-progress').length,
				pendingTasks: tasks.filter(t => t.status === 'pending').length
			};

			return stats;
		} catch (error: any) {
			console.error('Failed to get project stats:', error);
			return {
				totalTasks: 0,
				completedTasks: 0,
				inProgressTasks: 0,
				pendingTasks: 0
			};
		}
	}
}