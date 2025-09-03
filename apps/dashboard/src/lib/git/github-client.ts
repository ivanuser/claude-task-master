import { Octokit } from "@octokit/rest";
// import { createAppAuth } from "@octokit/auth-app";

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  updated_at: string;
  owner: {
    login: string;
    id: number;
    type: string;
  };
  hasTaskMaster?: boolean;
}

export interface TaskMasterProject {
  repository: GitHubRepository;
  taskMasterPath: string;
  configExists: boolean;
  tasksExists: boolean;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(accessToken?: string) {
    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: 'TaskMaster-Dashboard/1.0',
    });
  }

  // Create authenticated client for a user
  static createUserClient(accessToken: string): GitHubClient {
    return new GitHubClient(accessToken);
  }

  // Get authenticated user information
  async getAuthenticatedUser() {
    try {
      const { data } = await this.octokit.rest.users.getAuthenticated();
      return data;
    } catch (error) {
      console.error('Error getting authenticated user:', error);
      throw new Error('Failed to get authenticated user');
    }
  }

  // Get user repositories with pagination
  async getUserRepositories(
    username?: string,
    page = 1,
    perPage = 30
  ): Promise<GitHubRepository[]> {
    try {
      const { data } = username
        ? await this.octokit.rest.repos.listForUser({
            username,
            page,
            per_page: perPage,
            sort: 'updated',
            direction: 'desc',
          })
        : await this.octokit.rest.repos.listForAuthenticatedUser({
            page,
            per_page: perPage,
            sort: 'updated',
            direction: 'desc',
          });

      return data as GitHubRepository[];
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw new Error('Failed to fetch repositories');
    }
  }

  // Get organization repositories
  async getOrgRepositories(
    org: string,
    page = 1,
    perPage = 30
  ): Promise<GitHubRepository[]> {
    try {
      const { data } = await this.octokit.rest.repos.listForOrg({
        org,
        page,
        per_page: perPage,
        sort: 'updated',
        direction: 'desc',
      });

      return data as GitHubRepository[];
    } catch (error) {
      console.error('Error fetching org repositories:', error);
      throw new Error('Failed to fetch organization repositories');
    }
  }

  // Check if repository has Task Master configuration
  async hasTaskMasterConfig(owner: string, repo: string): Promise<{
    hasConfig: boolean;
    hasTasks: boolean;
    configPath?: string;
    tasksPath?: string;
  }> {
    try {
      const configPromise = this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.taskmaster/config.json',
      }).catch(() => null);

      const tasksPromise = this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.taskmaster/tasks/tasks.json',
      }).catch(() => null);

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

  // Scan repositories for Task Master projects
  async scanRepositoriesForTaskMaster(
    repositories: GitHubRepository[]
  ): Promise<TaskMasterProject[]> {
    const taskMasterProjects: TaskMasterProject[] = [];
    
    // Process repositories in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < repositories.length; i += batchSize) {
      const batch = repositories.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (repo) => {
        try {
          const taskMasterInfo = await this.hasTaskMasterConfig(
            repo.owner.login,
            repo.name
          );

          if (taskMasterInfo.hasConfig || taskMasterInfo.hasTasks) {
            return {
              repository: {
                ...repo,
                hasTaskMaster: true,
              },
              taskMasterPath: '.taskmaster',
              configExists: taskMasterInfo.hasConfig,
              tasksExists: taskMasterInfo.hasTasks,
            };
          }
          
          return null;
        } catch (error) {
          console.error(`Error scanning repository ${repo.full_name}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter((result): result is TaskMasterProject => result !== null);
      taskMasterProjects.push(...validResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < repositories.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return taskMasterProjects;
  }

  // Get Task Master configuration from repository
  async getTaskMasterConfig(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.taskmaster/config.json',
      });

      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      throw new Error('Config file not found or not accessible');
    } catch (error) {
      console.error('Error fetching Task Master config:', error);
      throw new Error('Failed to fetch Task Master configuration');
    }
  }

  // Get Task Master tasks from repository
  async getTaskMasterTasks(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path: '.taskmaster/tasks/tasks.json',
      });

      if ('content' in data) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        return JSON.parse(content);
      }

      throw new Error('Tasks file not found or not accessible');
    } catch (error) {
      console.error('Error fetching Task Master tasks:', error);
      throw new Error('Failed to fetch Task Master tasks');
    }
  }

  // Get repository branches
  async getRepositoryBranches(owner: string, repo: string) {
    try {
      const { data } = await this.octokit.rest.repos.listBranches({
        owner,
        repo,
      });

      return data.map(branch => ({
        name: branch.name,
        sha: branch.commit.sha,
        protected: branch.protected,
      }));
    } catch (error) {
      console.error('Error fetching repository branches:', error);
      throw new Error('Failed to fetch repository branches');
    }
  }

  // Get latest commit for a repository
  async getLatestCommit(owner: string, repo: string, branch = 'main') {
    try {
      const { data } = await this.octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: branch,
      });

      return {
        sha: data.sha,
        message: data.commit.message,
        author: data.commit.author,
        date: data.commit.author?.date,
        url: data.html_url,
      };
    } catch (error) {
      console.error('Error fetching latest commit:', error);
      throw new Error('Failed to fetch latest commit');
    }
  }

  // Check API rate limit
  async getRateLimit() {
    try {
      const { data } = await this.octokit.rest.rateLimit.get();
      return data.rate;
    } catch (error) {
      console.error('Error checking rate limit:', error);
      throw new Error('Failed to check rate limit');
    }
  }
}