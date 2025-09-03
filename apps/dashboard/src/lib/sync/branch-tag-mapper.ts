import { GitService } from '../git/git-service';
import { cacheService } from '../redis';

export interface BranchTagMapping {
  projectId: string;
  branch: string;
  tag: string;
  isDefault: boolean;
  lastSync?: string;
  metadata: {
    commitSha?: string;
    lastModified?: string;
    taskCount?: number;
  };
}

export interface TagSystemConfig {
  projectId: string;
  defaultTag: string;
  branchMappings: Map<string, string>; // branch -> tag
  tagPrefixes: string[]; // e.g., ['feat/', 'hotfix/', 'release/']
  autoCreateTags: boolean;
  syncStrategy: 'branch-isolated' | 'merged' | 'feature-branch-only';
}

export class BranchTagMapper {
  private static readonly CACHE_TTL = 300; // 5 minutes
  private static readonly MAPPING_CACHE_KEY = 'branch-tag-mappings';

  // Get tag for a specific branch
  static async getTagForBranch(
    projectId: string,
    branch: string,
    gitService: GitService
  ): Promise<string | null> {
    try {
      // Check cache first
      const cacheKey = `tag-mapping:${projectId}:${branch}`;
      const cached = await cacheService.get<string>(cacheKey);
      if (cached) {
        return cached;
      }

      // Get project configuration
      const config = await this.getTagSystemConfig(projectId);
      if (!config) {
        return null;
      }

      // Check explicit branch mapping first
      const explicitTag = config.branchMappings.get(branch);
      if (explicitTag) {
        await cacheService.set(cacheKey, explicitTag, this.CACHE_TTL);
        return explicitTag;
      }

      // Apply auto-tag generation rules
      const autoTag = this.generateAutoTag(branch, config);
      if (autoTag) {
        // Cache the auto-generated tag
        await cacheService.set(cacheKey, autoTag, this.CACHE_TTL);
        return autoTag;
      }

      // Fall back to default tag
      await cacheService.set(cacheKey, config.defaultTag, this.CACHE_TTL);
      return config.defaultTag;

    } catch (error) {
      console.error('Failed to get tag for branch:', error);
      return null;
    }
  }

  // Generate automatic tag based on branch name
  private static generateAutoTag(branch: string, config: TagSystemConfig): string | null {
    if (!config.autoCreateTags) {
      return null;
    }

    // Handle common branching patterns
    const patterns = [
      { pattern: /^feature\/(.+)$/, tagFormat: 'feat-$1' },
      { pattern: /^feat\/(.+)$/, tagFormat: 'feat-$1' },
      { pattern: /^bugfix\/(.+)$/, tagFormat: 'fix-$1' },
      { pattern: /^fix\/(.+)$/, tagFormat: 'fix-$1' },
      { pattern: /^hotfix\/(.+)$/, tagFormat: 'hotfix-$1' },
      { pattern: /^release\/(.+)$/, tagFormat: 'release-$1' },
      { pattern: /^develop$/, tagFormat: 'develop' },
      { pattern: /^staging$/, tagFormat: 'staging' },
      { pattern: /^main$/, tagFormat: config.defaultTag },
      { pattern: /^master$/, tagFormat: config.defaultTag },
    ];

    for (const { pattern, tagFormat } of patterns) {
      const match = branch.match(pattern);
      if (match) {
        // Replace $1, $2, etc. with capture groups
        let tag = tagFormat;
        match.slice(1).forEach((capture, index) => {
          tag = tag.replace(`$${index + 1}`, this.sanitizeTagName(capture));
        });
        return tag;
      }
    }

    // For any other branch, use a sanitized version of the branch name
    return this.sanitizeTagName(branch);
  }

  // Sanitize branch names to valid tag names
  private static sanitizeTagName(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-') // Replace invalid chars with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  // Get all branch mappings for a project
  static async getBranchMappings(projectId: string): Promise<BranchTagMapping[]> {
    try {
      const cacheKey = `${this.MAPPING_CACHE_KEY}:${projectId}`;
      const cached = await cacheService.get<BranchTagMapping[]>(cacheKey);
      if (cached) {
        return cached;
      }

      // This would typically come from database
      // For now, return empty array and let it be populated by sync operations
      const mappings: BranchTagMapping[] = [];
      
      await cacheService.set(cacheKey, mappings, this.CACHE_TTL);
      return mappings;

    } catch (error) {
      console.error('Failed to get branch mappings:', error);
      return [];
    }
  }

  // Update branch mapping
  static async updateBranchMapping(
    projectId: string,
    branch: string,
    tag: string,
    metadata?: BranchTagMapping['metadata']
  ): Promise<void> {
    try {
      const mappings = await this.getBranchMappings(projectId);
      
      // Find existing mapping or create new one
      let mapping = mappings.find(m => m.branch === branch);
      if (mapping) {
        mapping.tag = tag;
        mapping.lastSync = new Date().toISOString();
        mapping.metadata = { ...mapping.metadata, ...metadata };
      } else {
        mapping = {
          projectId,
          branch,
          tag,
          isDefault: false,
          lastSync: new Date().toISOString(),
          metadata: metadata || {},
        };
        mappings.push(mapping);
      }

      // Update cache
      const cacheKey = `${this.MAPPING_CACHE_KEY}:${projectId}`;
      await cacheService.set(cacheKey, mappings, this.CACHE_TTL);

      // Invalidate branch-specific cache
      await cacheService.del(`tag-mapping:${projectId}:${branch}`);

      console.log(`📋 Updated branch mapping: ${branch} -> ${tag} for project ${projectId}`);

    } catch (error) {
      console.error('Failed to update branch mapping:', error);
      throw error;
    }
  }

  // Get or create tag system configuration
  static async getTagSystemConfig(projectId: string): Promise<TagSystemConfig | null> {
    try {
      const cacheKey = `tag-config:${projectId}`;
      const cached = await cacheService.get<TagSystemConfig>(cacheKey);
      if (cached) {
        return cached;
      }

      // In a real implementation, this would come from the database
      // For now, return a default configuration
      const config: TagSystemConfig = {
        projectId,
        defaultTag: 'main',
        branchMappings: new Map([
          ['main', 'main'],
          ['master', 'main'],
          ['develop', 'develop'],
          ['staging', 'staging'],
        ]),
        tagPrefixes: ['feat/', 'feature/', 'fix/', 'bugfix/', 'hotfix/', 'release/'],
        autoCreateTags: true,
        syncStrategy: 'branch-isolated',
      };

      await cacheService.set(cacheKey, config, this.CACHE_TTL);
      return config;

    } catch (error) {
      console.error('Failed to get tag system config:', error);
      return null;
    }
  }

  // Update tag system configuration
  static async updateTagSystemConfig(config: TagSystemConfig): Promise<void> {
    try {
      const cacheKey = `tag-config:${config.projectId}`;
      await cacheService.set(cacheKey, config, this.CACHE_TTL);

      // Invalidate all branch mapping caches for this project
      await this.invalidateProjectMappings(config.projectId);

      console.log(`⚙️ Updated tag system config for project ${config.projectId}`);

    } catch (error) {
      console.error('Failed to update tag system config:', error);
      throw error;
    }
  }

  // Get active branches with their tag mappings
  static async getActiveBranchMappings(
    projectId: string,
    gitService: GitService
  ): Promise<BranchTagMapping[]> {
    try {
      // Get project repository info
      const project = await gitService.getProjectRepository(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Get all branches from repository
      const branches = await gitService.getBranches(project);
      const mappings: BranchTagMapping[] = [];

      // Generate mappings for each branch
      for (const branchInfo of branches) {
        const tag = await this.getTagForBranch(projectId, branchInfo.name, gitService);
        if (tag) {
          mappings.push({
            projectId,
            branch: branchInfo.name,
            tag,
            isDefault: branchInfo.name === project.defaultBranch,
            metadata: {
              commitSha: branchInfo.commit.sha,
              lastModified: branchInfo.commit.date,
            },
          });
        }
      }

      return mappings;

    } catch (error) {
      console.error('Failed to get active branch mappings:', error);
      return [];
    }
  }

  // Sync tasks for a specific branch
  static async syncBranchTasks(
    projectId: string,
    branch: string,
    gitService: GitService
  ): Promise<{ tag: string; taskCount: number }> {
    try {
      const tag = await this.getTagForBranch(projectId, branch, gitService);
      if (!tag) {
        throw new Error(`No tag mapping found for branch ${branch}`);
      }

      // Get Task Master data for this branch/tag
      const project = await gitService.getProjectRepository(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Switch to target branch
      const originalBranch = await gitService.getCurrentBranch(project);
      if (originalBranch !== branch) {
        await gitService.switchBranch(project, branch);
      }

      try {
        const { config, tasks } = await gitService.getTaskMasterProjectData(project);
        
        // Override config tag with our mapped tag
        const taskMasterConfig = config ? { ...config, tag } : { tag };
        
        // Import sync engine to process the sync
        const { SyncEngine } = await import('./sync-engine');
        const result = await SyncEngine.syncRepository(project, {
          strategy: 'merge',
          conflictResolution: 'remote-wins',
          validateBeforeSync: true,
          createBackup: false,
          notifyClients: true,
        });

        // Update branch mapping with task count
        await this.updateBranchMapping(projectId, branch, tag, {
          taskCount: result.changes.tasksAdded + result.changes.tasksUpdated,
          lastModified: new Date().toISOString(),
        });

        return {
          tag,
          taskCount: result.changes.tasksAdded + result.changes.tasksUpdated,
        };

      } finally {
        // Switch back to original branch
        if (originalBranch !== branch) {
          await gitService.switchBranch(project, originalBranch);
        }
      }

    } catch (error) {
      console.error(`Failed to sync tasks for branch ${branch}:`, error);
      throw error;
    }
  }

  // Invalidate all project mapping caches
  static async invalidateProjectMappings(projectId: string): Promise<void> {
    try {
      const keys = [
        `${this.MAPPING_CACHE_KEY}:${projectId}`,
        `tag-config:${projectId}`,
      ];
      
      // Also invalidate branch-specific mappings (this is approximate)
      const mappings = await this.getBranchMappings(projectId);
      for (const mapping of mappings) {
        keys.push(`tag-mapping:${projectId}:${mapping.branch}`);
      }

      for (const key of keys) {
        await cacheService.del(key);
      }

      console.log(`🗑️ Invalidated branch mapping caches for project ${projectId}`);

    } catch (error) {
      console.error('Failed to invalidate project mappings:', error);
    }
  }

  // Get sync strategy recommendations
  static getSyncStrategyRecommendation(
    branchMappings: BranchTagMapping[]
  ): {
    strategy: TagSystemConfig['syncStrategy'];
    reasoning: string;
  } {
    const branchCount = branchMappings.length;
    const uniqueTags = new Set(branchMappings.map(m => m.tag)).size;

    if (branchCount <= 2) {
      return {
        strategy: 'merged',
        reasoning: 'Few branches detected, merged strategy recommended for simplicity',
      };
    }

    if (uniqueTags === branchCount) {
      return {
        strategy: 'branch-isolated',
        reasoning: 'Each branch has unique tag, isolated strategy prevents conflicts',
      };
    }

    const featureBranches = branchMappings.filter(m => 
      m.branch.startsWith('feature/') || m.branch.startsWith('feat/')
    );

    if (featureBranches.length > branchCount * 0.7) {
      return {
        strategy: 'feature-branch-only',
        reasoning: 'Mostly feature branches detected, feature-only strategy recommended',
      };
    }

    return {
      strategy: 'branch-isolated',
      reasoning: 'Mixed branch types detected, isolated strategy safest for conflict prevention',
    };
  }
}