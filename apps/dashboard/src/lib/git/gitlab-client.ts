import { Gitlab } from "@gitbeaker/rest";

export interface GitLabProject {
  id: number;
  name: string;
  name_with_namespace: string;
  description: string | null;
  visibility: string;
  web_url: string;
  http_url_to_repo: string;
  ssh_url_to_repo: string;
  default_branch: string;
  last_activity_at: string;
  namespace: {
    id: number;
    name: string;
    path: string;
    kind: string;
  };
  hasTaskMaster?: boolean;
}

export interface GitLabTaskMasterProject {
  project: GitLabProject;
  taskMasterPath: string;
  configExists: boolean;
  tasksExists: boolean;
}

export class GitLabClient {
  private gitlab: InstanceType<typeof Gitlab>;

  constructor(accessToken?: string, host = 'https://gitlab.com') {
    this.gitlab = new Gitlab({
      token: accessToken,
      host,
    });
  }

  // Create authenticated client for a user
  static createUserClient(accessToken: string, host?: string): GitLabClient {
    return new GitLabClient(accessToken, host);
  }

  // Get authenticated user information
  async getAuthenticatedUser() {
    try {
      const user = await this.gitlab.Users.current();
      return user;
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      throw new Error('Failed to get authenticated user');
    }
  }

  // Get user projects with pagination
  async getUserProjects(
    userId?: number,
    page = 1,
    perPage = 30
  ): Promise<GitLabProject[]> {
    try {
      const projects = userId
        ? await this.gitlab.Users.projects(userId, {
            page,
            perPage,
            orderBy: 'last_activity_at',
            sort: 'desc',
          })
        : await this.gitlab.Projects.all({
            page,
            perPage,
            owned: true,
            orderBy: 'last_activity_at',
            sort: 'desc',
          });

      return projects as GitLabProject[];
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  // Get group projects
  async getGroupProjects(
    groupId: number,
    page = 1,
    perPage = 30
  ): Promise<GitLabProject[]> {
    try {
      const projects = await this.gitlab.Groups.projects(groupId, {
        page,
        perPage,
        orderBy: 'last_activity_at',
        sort: 'desc',
      });

      return projects as GitLabProject[];
    } catch (error) {
      console.error('Error fetching group projects:', error);
      throw new Error('Failed to fetch group projects');
    }
  }

  // Check if project has Task Master configuration
  async hasTaskMasterConfig(projectId: number): Promise<{
    hasConfig: boolean;
    hasTasks: boolean;
    configPath?: string;
    tasksPath?: string;
  }> {
    try {
      const configPromise = this.gitlab.RepositoryFiles.show(
        projectId,
        '.taskmaster/config.json',
        'main'
      ).catch(() => null);

      const tasksPromise = this.gitlab.RepositoryFiles.show(
        projectId,
        '.taskmaster/tasks/tasks.json',
        'main'
      ).catch(() => null);

      const [configResult, tasksResult] = await Promise.all([
        configPromise,
        tasksPromise,
      ]);

      return {
        hasConfig: !!configResult,
        hasTasks: !!tasksResult,
        configPath: configResult ? '.taskmaster/config.json' : undefined,
        tasksPath: tasksResult ? '.taskmaster/tasks/tasks.json' : undefined,
      };
    } catch (error) {
      console.error('Error checking Task Master config:', error);
      return {
        hasConfig: false,
        hasTasks: false,
      };
    }
  }

  // Scan projects for Task Master configuration
  async scanProjectsForTaskMaster(
    projects: GitLabProject[]
  ): Promise<GitLabTaskMasterProject[]> {
    const taskMasterProjects: GitLabTaskMasterProject[] = [];
    
    // Process projects in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < projects.length; i += batchSize) {
      const batch = projects.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (project) => {
        try {
          const taskMasterInfo = await this.hasTaskMasterConfig(project.id);

          if (taskMasterInfo.hasConfig || taskMasterInfo.hasTasks) {
            return {
              project: {
                ...project,
                hasTaskMaster: true,
              },
              taskMasterPath: '.taskmaster',
              configExists: taskMasterInfo.hasConfig,
              tasksExists: taskMasterInfo.hasTasks,
            };
          }
          
          return null;
        } catch (error) {
          console.error(`Error scanning project ${project.name_with_namespace}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((result): result is GitLabTaskMasterProject => result !== null);
      taskMasterProjects.push(...validResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < projects.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return taskMasterProjects;
  }

  // Get Task Master configuration from project
  async getTaskMasterConfig(projectId: number, branch = 'main') {
    try {
      const file = await this.gitlab.RepositoryFiles.show(
        projectId,
        '.taskmaster/config.json',
        branch
      );

      if (file.content) {
        const content = Buffer.from(file.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      throw new Error('Config file not found or not accessible');
    } catch (error) {
      console.error('Error fetching Task Master config:', error);
      throw new Error('Failed to fetch Task Master configuration');
    }
  }

  // Get Task Master tasks from project
  async getTaskMasterTasks(projectId: number, branch = 'main') {
    try {
      const file = await this.gitlab.RepositoryFiles.show(
        projectId,
        '.taskmaster/tasks/tasks.json',
        branch
      );

      if (file.content) {
        const content = Buffer.from(file.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      throw new Error('Tasks file not found or not accessible');
    } catch (error) {
      console.error('Error fetching Task Master tasks:', error);
      throw new Error('Failed to fetch Task Master tasks');
    }
  }

  // Get project branches
  async getProjectBranches(projectId: number) {
    try {
      const branches = await this.gitlab.Branches.all(projectId);

      return branches.map(branch => ({
        name: branch.name,
        sha: branch.commit.id,
        protected: branch.protected,
      }));
    } catch (error) {
      console.error('Error fetching project branches:', error);
      throw new Error('Failed to fetch project branches');
    }
  }

  // Get latest commit for a project
  async getLatestCommit(projectId: number, branch = 'main') {
    try {
      const commits = await this.gitlab.Commits.all(projectId, {
        refName: branch,
        perPage: 1,
      });

      if (commits.length === 0) {
        throw new Error('No commits found');
      }

      const commit = commits[0];
      return {
        sha: commit.id,
        message: commit.message,
        author: {
          name: commit.author_name,
          email: commit.author_email,
        },
        date: commit.authored_date,
        url: commit.web_url,
      };
    } catch (error) {
      console.error('Error fetching latest commit:', error);
      throw new Error('Failed to fetch latest commit');
    }
  }

  // Get user groups
  async getUserGroups(page = 1, perPage = 30) {
    try {
      const groups = await this.gitlab.Groups.all({
        page,
        perPage,
        orderBy: 'last_activity_at',
        sort: 'desc',
      });

      return groups;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw new Error('Failed to fetch user groups');
    }
  }

  // Check if user has access to a project
  async hasProjectAccess(projectId: number): Promise<boolean> {
    try {
      await this.gitlab.Projects.show(projectId);
      return true;
    } catch (error) {
      return false;
    }
  }
}