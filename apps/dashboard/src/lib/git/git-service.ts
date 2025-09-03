import { GitHubClient, GitHubRepository, TaskMasterProject } from './github-client';
import { GitLabClient, GitLabProject, GitLabTaskMasterProject } from './gitlab-client';
import { prisma } from '../database';
import { UserService } from '../services/user-service';

export type GitProvider = 'github' | 'gitlab';

export interface UnifiedRepository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  webUrl: string;
  cloneUrl: string;
  sshUrl: string;
  defaultBranch: string;
  lastActivity: string;
  provider: GitProvider;
  owner: {
    login: string;
    id: string;
    type: string;
  };
  hasTaskMaster?: boolean;
  taskMasterConfig?: {
    configExists: boolean;
    tasksExists: boolean;
    configPath?: string;
    tasksPath?: string;
  };
}

export interface UnifiedTaskMasterProject {
  repository: UnifiedRepository;
  taskMasterPath: string;
  configExists: boolean;
  tasksExists: boolean;
  config?: any;
  tasks?: any;
}

export class GitService {
  private githubClient?: GitHubClient;
  private gitlabClient?: GitLabClient;

  constructor(
    private userId: string,
    private githubToken?: string,
    private gitlabToken?: string,
    private gitlabHost = 'https://gitlab.com'
  ) {
    if (githubToken) {
      this.githubClient = GitHubClient.createUserClient(githubToken);
    }
    if (gitlabToken) {
      this.gitlabClient = GitLabClient.createUserClient(gitlabToken, gitlabHost);
    }
  }

  // Create service instance from user session
  static async createFromUser(userId: string): Promise<GitService> {
    const accounts = await UserService.getUserAccounts(userId);
    
    const githubAccount = accounts.find(account => account.provider === 'github');
    const gitlabAccount = accounts.find(account => account.provider === 'gitlab');

    return new GitService(
      userId,
      githubAccount?.access_token || undefined,
      gitlabAccount?.access_token || undefined
    );
  }

  // Convert GitHub repository to unified format
  private convertGitHubRepo(repo: GitHubRepository): UnifiedRepository {
    return {
      id: `github_${repo.id}`,
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description,
      isPrivate: repo.private,
      webUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      sshUrl: repo.ssh_url,
      defaultBranch: repo.default_branch,
      lastActivity: repo.updated_at,
      provider: 'github',
      owner: {
        login: repo.owner.login,
        id: repo.owner.id.toString(),
        type: repo.owner.type.toLowerCase(),
      },
      hasTaskMaster: repo.hasTaskMaster,
    };
  }

  // Convert GitLab project to unified format
  private convertGitLabProject(project: GitLabProject): UnifiedRepository {
    return {
      id: `gitlab_${project.id}`,
      name: project.name,
      fullName: project.name_with_namespace,
      description: project.description,
      isPrivate: project.visibility !== 'public',
      webUrl: project.web_url,
      cloneUrl: project.http_url_to_repo,
      sshUrl: project.ssh_url_to_repo,
      defaultBranch: project.default_branch,
      lastActivity: project.last_activity_at,
      provider: 'gitlab',
      owner: {
        login: project.namespace.path,
        id: project.namespace.id.toString(),
        type: project.namespace.kind,
      },
      hasTaskMaster: project.hasTaskMaster,
    };
  }

  // Get all repositories from all connected providers
  async getAllRepositories(): Promise<UnifiedRepository[]> {
    const repositories: UnifiedRepository[] = [];

    // Fetch GitHub repositories
    if (this.githubClient) {
      try {
        const githubRepos = await this.githubClient.getUserRepositories();
        const convertedRepos = githubRepos.map(repo => this.convertGitHubRepo(repo));
        repositories.push(...convertedRepos);
      } catch (error) {
        console.error('Error fetching GitHub repositories:', error);
      }
    }

    // Fetch GitLab projects
    if (this.gitlabClient) {
      try {
        const gitlabProjects = await this.gitlabClient.getUserProjects();
        const convertedProjects = gitlabProjects.map(project => this.convertGitLabProject(project));
        repositories.push(...convertedProjects);
      } catch (error) {
        console.error('Error fetching GitLab projects:', error);
      }
    }

    return repositories.sort((a, b) => 
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  // Scan all repositories for Task Master projects
  async scanForTaskMasterProjects(): Promise<UnifiedTaskMasterProject[]> {
    const taskMasterProjects: UnifiedTaskMasterProject[] = [];

    // Scan GitHub repositories
    if (this.githubClient) {
      try {
        const githubRepos = await this.githubClient.getUserRepositories();
        const githubTaskMasterProjects = await this.githubClient.scanRepositoriesForTaskMaster(githubRepos);
        
        for (const project of githubTaskMasterProjects) {
          const unifiedRepo = this.convertGitHubRepo(project.repository);
          unifiedRepo.taskMasterConfig = {
            configExists: project.configExists,
            tasksExists: project.tasksExists,
            configPath: project.configExists ? '.taskmaster/config.json' : undefined,
            tasksPath: project.tasksExists ? '.taskmaster/tasks/tasks.json' : undefined,
          };

          taskMasterProjects.push({
            repository: unifiedRepo,
            taskMasterPath: project.taskMasterPath,
            configExists: project.configExists,
            tasksExists: project.tasksExists,
          });
        }
      } catch (error) {
        console.error('Error scanning GitHub repositories:', error);
      }
    }

    // Scan GitLab projects
    if (this.gitlabClient) {
      try {
        const gitlabProjects = await this.gitlabClient.getUserProjects();
        const gitlabTaskMasterProjects = await this.gitlabClient.scanProjectsForTaskMaster(gitlabProjects);
        
        for (const project of gitlabTaskMasterProjects) {
          const unifiedRepo = this.convertGitLabProject(project.project);
          unifiedRepo.taskMasterConfig = {
            configExists: project.configExists,
            tasksExists: project.tasksExists,
            configPath: project.configExists ? '.taskmaster/config.json' : undefined,
            tasksPath: project.tasksExists ? '.taskmaster/tasks/tasks.json' : undefined,
          };

          taskMasterProjects.push({
            repository: unifiedRepo,
            taskMasterPath: project.taskMasterPath,
            configExists: project.configExists,
            tasksExists: project.tasksExists,
          });
        }
      } catch (error) {
        console.error('Error scanning GitLab projects:', error);
      }
    }

    return taskMasterProjects;
  }

  // Get Task Master configuration and tasks for a project
  async getTaskMasterProjectData(repository: UnifiedRepository): Promise<{
    config?: any;
    tasks?: any;
  }> {
    const [provider, repoId] = repository.id.split('_');
    
    if (provider === 'github' && this.githubClient) {
      try {
        const config = repository.taskMasterConfig?.configExists
          ? await this.githubClient.getTaskMasterConfig(repository.owner.login, repository.name)
          : null;

        const tasks = repository.taskMasterConfig?.tasksExists
          ? await this.githubClient.getTaskMasterTasks(repository.owner.login, repository.name)
          : null;

        return { config, tasks };
      } catch (error) {
        console.error('Error fetching GitHub Task Master data:', error);
        return {};
      }
    }

    if (provider === 'gitlab' && this.gitlabClient) {
      try {
        const projectId = parseInt(repoId);
        
        const config = repository.taskMasterConfig?.configExists
          ? await this.gitlabClient.getTaskMasterConfig(projectId)
          : null;

        const tasks = repository.taskMasterConfig?.tasksExists
          ? await this.gitlabClient.getTaskMasterTasks(projectId)
          : null;

        return { config, tasks };
      } catch (error) {
        console.error('Error fetching GitLab Task Master data:', error);
        return {};
      }
    }

    return {};
  }

  // Sync Task Master project to database
  async syncTaskMasterProject(repository: UnifiedRepository): Promise<void> {
    try {
      const { config, tasks } = await this.getTaskMasterProjectData(repository);
      
      if (!config && !tasks) {
        console.warn(`No Task Master data found for ${repository.fullName}`);
        return;
      }

      // Create or update project in database
      const project = await prisma.project.upsert({
        where: { tag: repository.fullName.toLowerCase().replace(/[^a-z0-9-]/g, '-') },
        update: {
          name: repository.name,
          description: repository.description,
          gitUrl: repository.webUrl,
          gitBranch: repository.defaultBranch,
          gitProvider: repository.provider,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        },
        create: {
          name: repository.name,
          description: repository.description,
          tag: repository.fullName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          gitUrl: repository.webUrl,
          gitBranch: repository.defaultBranch,
          gitProvider: repository.provider,
          status: 'ACTIVE',
          lastSyncAt: new Date(),
        },
      });

      // Sync tasks if available
      if (tasks && Array.isArray(tasks)) {
        for (const taskData of tasks) {
          await prisma.task.upsert({
            where: {
              projectId_taskId: {
                projectId: project.id,
                taskId: taskData.id,
              },
            },
            update: {
              title: taskData.title,
              description: taskData.description,
              status: this.mapTaskStatus(taskData.status),
              priority: this.mapTaskPriority(taskData.priority),
              complexity: taskData.complexity,
              data: taskData,
              details: taskData.details,
              testStrategy: taskData.testStrategy,
              updatedAt: new Date(),
            },
            create: {
              projectId: project.id,
              taskId: taskData.id,
              title: taskData.title,
              description: taskData.description,
              status: this.mapTaskStatus(taskData.status),
              priority: this.mapTaskPriority(taskData.priority),
              complexity: taskData.complexity,
              data: taskData,
              details: taskData.details,
              testStrategy: taskData.testStrategy,
            },
          });
        }
      }

      console.log(`✅ Synced Task Master project: ${repository.fullName}`);
    } catch (error) {
      console.error(`Error syncing Task Master project ${repository.fullName}:`, error);
      throw error;
    }
  }

  // Map task status from Task Master to database
  private mapTaskStatus(status: string) {
    const statusMap: Record<string, any> = {
      'pending': 'PENDING',
      'in-progress': 'IN_PROGRESS',
      'done': 'DONE',
      'blocked': 'BLOCKED',
      'deferred': 'DEFERRED',
      'cancelled': 'CANCELLED',
      'review': 'REVIEW',
    };
    return statusMap[status] || 'PENDING';
  }

  // Map task priority from Task Master to database
  private mapTaskPriority(priority: string) {
    const priorityMap: Record<string, any> = {
      'low': 'LOW',
      'medium': 'MEDIUM',
      'high': 'HIGH',
      'critical': 'CRITICAL',
    };
    return priorityMap[priority] || 'MEDIUM';
  }

  // Get rate limit information for connected providers
  async getRateLimitInfo() {
    const rateLimits: Record<string, any> = {};

    if (this.githubClient) {
      try {
        rateLimits.github = await this.githubClient.getRateLimit();
      } catch (error) {
        rateLimits.github = { error: 'Unable to fetch rate limit' };
      }
    }

    if (this.gitlabClient) {
      // GitLab doesn't have a direct rate limit API endpoint
      rateLimits.gitlab = { note: 'GitLab rate limits vary by plan and endpoint' };
    }

    return rateLimits;
  }
}