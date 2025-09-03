import { SyncEngine, SyncOptions, SyncResult } from './sync-engine';
import { BranchTagMapper, BranchTagMapping, TagSystemConfig } from './branch-tag-mapper';
import { SyncErrorHandler, SyncErrorCode } from './sync-error-handler';
import { GitService, UnifiedRepository } from '../git/git-service';
import { broadcastSyncEvent } from '../websockets/socket-server';
import { prisma } from '../database';
import { cacheService } from '../redis';
import { addSyncJob } from '../jobs/sync-queue';

export interface AdvancedSyncOptions extends SyncOptions {
  // Branch processing
  syncAllBranches?: boolean;
  branchFilter?: string[]; // Only sync specific branches
  branchExclude?: string[]; // Exclude specific branches
  
  // Advanced processing
  enableBatchProcessing?: boolean;
  batchSize?: number;
  parallelBranches?: number;
  
  // Error handling
  retryFailedTasks?: boolean;
  maxRetries?: number;
  errorThreshold?: number; // Stop if error rate exceeds threshold
  
  // Performance
  enableDeltaSync?: boolean; // Only sync changed files
  compressionEnabled?: boolean;
  cacheResults?: boolean;
  
  // Monitoring
  enableMetrics?: boolean;
  webhookEndpoints?: string[];
  
  // Scheduling
  isScheduledSync?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

export interface SyncMetrics {
  startTime: string;
  endTime?: string;
  duration?: number;
  totalBranches: number;
  processedBranches: number;
  failedBranches: number;
  totalTasks: number;
  tasksProcessed: number;
  errors: number;
  warnings: number;
  performanceStats: {
    avgBranchProcessingTime: number;
    peakMemoryUsage: number;
    networkRequests: number;
    cacheHits: number;
    cacheMisses: number;
  };
}

export interface AdvancedSyncResult extends SyncResult {
  metrics: SyncMetrics;
  branchResults: Array<{
    branch: string;
    tag: string;
    success: boolean;
    changes: SyncResult['changes'];
    error?: string;
    duration: number;
  }>;
  recommendations: string[];
}

export class AdvancedSyncService {
  private static readonly DEFAULT_OPTIONS: AdvancedSyncOptions = {
    strategy: 'merge',
    conflictResolution: 'timestamp',
    validateBeforeSync: true,
    createBackup: true,
    notifyClients: true,
    syncAllBranches: false,
    enableBatchProcessing: true,
    batchSize: 50,
    parallelBranches: 3,
    retryFailedTasks: true,
    maxRetries: 3,
    errorThreshold: 0.2, // 20% error rate
    enableDeltaSync: true,
    compressionEnabled: false,
    cacheResults: true,
    enableMetrics: true,
    priority: 'normal',
  };

  // Main advanced sync method
  static async syncProjectAdvanced(
    projectId: string,
    options: Partial<AdvancedSyncOptions> = {}
  ): Promise<AdvancedSyncResult> {
    const finalOptions = { ...this.DEFAULT_OPTIONS, ...options };
    const startTime = Date.now();
    
    const metrics: SyncMetrics = {
      startTime: new Date().toISOString(),
      totalBranches: 0,
      processedBranches: 0,
      failedBranches: 0,
      totalTasks: 0,
      tasksProcessed: 0,
      errors: 0,
      warnings: 0,
      performanceStats: {
        avgBranchProcessingTime: 0,
        peakMemoryUsage: 0,
        networkRequests: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
    };

    const branchResults: AdvancedSyncResult['branchResults'] = [];
    const recommendations: string[] = [];

    try {
      // Get project and setup
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // Initialize git service
      const gitService = await GitService.createFromUser(
        project.members[0]?.userId || 'system'
      );

      // Create unified repository object
      const repository: UnifiedRepository = {
        id: `${project.gitProvider}_${projectId}`,
        name: project.name,
        fullName: project.name,
        description: project.description,
        isPrivate: true,
        webUrl: project.gitUrl || '',
        cloneUrl: project.gitUrl || '',
        sshUrl: project.gitUrl || '',
        defaultBranch: project.gitBranch || 'main',
        lastActivity: new Date().toISOString(),
        provider: project.gitProvider as 'github' | 'gitlab',
        owner: {
          login: 'unknown',
          id: 'unknown',
          type: 'unknown',
        },
      };

      // Broadcast sync started
      if (finalOptions.notifyClients) {
        broadcastSyncEvent({
          type: 'sync-started',
          projectId,
          data: { 
            branches: finalOptions.syncAllBranches ? 'all' : 'default',
            options: finalOptions,
          },
          timestamp: new Date().toISOString(),
        });
      }

      // Get branch mappings
      const branchMappings = finalOptions.syncAllBranches 
        ? await BranchTagMapper.getActiveBranchMappings(projectId, gitService)
        : await this.getDefaultBranchMapping(projectId, repository, gitService);

      metrics.totalBranches = branchMappings.length;

      // Apply branch filters
      const filteredMappings = this.applyBranchFilters(branchMappings, finalOptions);
      
      if (filteredMappings.length === 0) {
        recommendations.push('No branches match the specified filters');
      }

      // Process branches
      if (finalOptions.enableBatchProcessing) {
        await this.processBranchesBatched(
          projectId,
          filteredMappings,
          repository,
          gitService,
          finalOptions,
          metrics,
          branchResults
        );
      } else {
        await this.processBranchesSequential(
          projectId,
          filteredMappings,
          repository,
          gitService,
          finalOptions,
          metrics,
          branchResults
        );
      }

      // Generate recommendations
      recommendations.push(...this.generateRecommendations(branchResults, metrics, finalOptions));

      // Calculate final metrics
      const endTime = Date.now();
      metrics.endTime = new Date().toISOString();
      metrics.duration = endTime - startTime;
      metrics.performanceStats.avgBranchProcessingTime = 
        branchResults.length > 0 
          ? branchResults.reduce((sum, r) => sum + r.duration, 0) / branchResults.length
          : 0;

      // Aggregate changes
      const totalChanges = branchResults.reduce((acc, result) => ({
        tasksAdded: acc.tasksAdded + result.changes.tasksAdded,
        tasksUpdated: acc.tasksUpdated + result.changes.tasksUpdated,
        tasksRemoved: acc.tasksRemoved + result.changes.tasksRemoved,
        conflictsResolved: acc.conflictsResolved + result.changes.conflictsResolved,
      }), { tasksAdded: 0, tasksUpdated: 0, tasksRemoved: 0, conflictsResolved: 0 });

      // Broadcast completion
      if (finalOptions.notifyClients) {
        broadcastSyncEvent({
          type: 'sync-completed',
          projectId,
          data: { 
            changes: totalChanges,
            branchCount: branchResults.length,
            metrics,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: metrics.failedBranches < branchResults.length,
        projectId,
        changes: totalChanges,
        metadata: {
          syncType: finalOptions.syncAllBranches ? 'full' : 'incremental',
          duration: metrics.duration || 0,
          errors: [],
          warnings: [],
        },
        metrics,
        branchResults,
        recommendations,
      };

    } catch (error) {
      const syncError = await SyncErrorHandler.handleError(error, {
        projectId,
        operation: 'advanced-sync',
      });

      metrics.errors++;
      metrics.endTime = new Date().toISOString();
      metrics.duration = Date.now() - startTime;

      // Broadcast failure
      if (finalOptions.notifyClients) {
        broadcastSyncEvent({
          type: 'sync-failed',
          projectId,
          data: { error: syncError.message },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: false,
        projectId,
        changes: { tasksAdded: 0, tasksUpdated: 0, tasksRemoved: 0, conflictsResolved: 0 },
        metadata: {
          syncType: 'full',
          duration: metrics.duration,
          errors: [syncError.message],
          warnings: [],
        },
        metrics,
        branchResults,
        recommendations: ['Check error logs and retry with adjusted settings'],
      };
    }
  }

  // Schedule recurring sync
  static async scheduleRecurringSync(
    projectId: string,
    cronExpression: string,
    options: Partial<AdvancedSyncOptions> = {}
  ): Promise<void> {
    try {
      const scheduleOptions = {
        ...options,
        isScheduledSync: true,
        priority: options.priority || 'low',
      };

      // Add to job queue with cron schedule
      await addSyncJob({
        syncHistoryId: `scheduled-${projectId}-${Date.now()}`,
        projectId,
        repositoryId: 0,
        provider: 'github', // Will be resolved
        syncType: 'full',
        metadata: {
          scheduled: true,
          cronExpression,
          options: scheduleOptions,
        },
      });

      console.log(`📅 Scheduled recurring sync for project ${projectId} with cron: ${cronExpression}`);

    } catch (error) {
      await SyncErrorHandler.handleError(error, {
        projectId,
        operation: 'schedule-recurring-sync',
      });
      throw error;
    }
  }

  // Analyze sync performance and suggest optimizations
  static async analyzeSyncPerformance(projectId: string): Promise<{
    currentPerformance: SyncMetrics;
    suggestions: string[];
    optimizedOptions: Partial<AdvancedSyncOptions>;
  }> {
    try {
      // Get recent sync history
      const recentSyncs = await prisma.syncHistory.findMany({
        where: { projectId },
        orderBy: { startedAt: 'desc' },
        take: 10,
      });

      if (recentSyncs.length === 0) {
        return {
          currentPerformance: {} as SyncMetrics,
          suggestions: ['No sync history available for analysis'],
          optimizedOptions: {},
        };
      }

      // Calculate average performance metrics
      const avgDuration = recentSyncs.reduce((sum, sync) => {
        if (sync.completedAt && sync.startedAt) {
          return sum + (sync.completedAt.getTime() - sync.startedAt.getTime());
        }
        return sum;
      }, 0) / recentSyncs.length;

      const successRate = recentSyncs.filter(s => s.status === 'COMPLETED').length / recentSyncs.length;

      // Generate suggestions
      const suggestions: string[] = [];
      const optimizedOptions: Partial<AdvancedSyncOptions> = {};

      if (avgDuration > 30000) { // > 30 seconds
        suggestions.push('Enable batch processing to improve sync speed');
        optimizedOptions.enableBatchProcessing = true;
        optimizedOptions.parallelBranches = 5;
      }

      if (successRate < 0.8) { // < 80% success rate
        suggestions.push('Enable retry mechanism for failed tasks');
        optimizedOptions.retryFailedTasks = true;
        optimizedOptions.maxRetries = 3;
      }

      const avgTasksProcessed = recentSyncs.reduce((sum, sync) => 
        sum + (sync.tasksAdded || 0) + (sync.tasksUpdated || 0)
      , 0) / recentSyncs.length;

      if (avgTasksProcessed > 100) {
        suggestions.push('Enable delta sync for large task sets');
        optimizedOptions.enableDeltaSync = true;
        optimizedOptions.cacheResults = true;
      }

      return {
        currentPerformance: {
          startTime: new Date().toISOString(),
          totalBranches: 1,
          processedBranches: 1,
          failedBranches: recentSyncs.filter(s => s.status === 'FAILED').length,
          totalTasks: avgTasksProcessed,
          tasksProcessed: avgTasksProcessed,
          errors: 0,
          warnings: 0,
          performanceStats: {
            avgBranchProcessingTime: avgDuration,
            peakMemoryUsage: 0,
            networkRequests: 0,
            cacheHits: 0,
            cacheMisses: 0,
          },
        },
        suggestions,
        optimizedOptions,
      };

    } catch (error) {
      await SyncErrorHandler.handleError(error, {
        projectId,
        operation: 'analyze-sync-performance',
      });
      throw error;
    }
  }

  // Private helper methods

  private static async getDefaultBranchMapping(
    projectId: string,
    repository: UnifiedRepository,
    gitService: GitService
  ): Promise<BranchTagMapping[]> {
    const tag = await BranchTagMapper.getTagForBranch(
      projectId,
      repository.defaultBranch,
      gitService
    );

    return [{
      projectId,
      branch: repository.defaultBranch,
      tag: tag || 'main',
      isDefault: true,
      metadata: {},
    }];
  }

  private static applyBranchFilters(
    mappings: BranchTagMapping[],
    options: AdvancedSyncOptions
  ): BranchTagMapping[] {
    let filtered = [...mappings];

    if (options.branchFilter && options.branchFilter.length > 0) {
      filtered = filtered.filter(m => options.branchFilter!.includes(m.branch));
    }

    if (options.branchExclude && options.branchExclude.length > 0) {
      filtered = filtered.filter(m => !options.branchExclude!.includes(m.branch));
    }

    return filtered;
  }

  private static async processBranchesBatched(
    projectId: string,
    mappings: BranchTagMapping[],
    repository: UnifiedRepository,
    gitService: GitService,
    options: AdvancedSyncOptions,
    metrics: SyncMetrics,
    results: AdvancedSyncResult['branchResults']
  ): Promise<void> {
    const batchSize = options.parallelBranches || 3;
    
    for (let i = 0; i < mappings.length; i += batchSize) {
      const batch = mappings.slice(i, i + batchSize);
      
      const promises = batch.map(mapping => 
        this.processSingleBranch(projectId, mapping, repository, gitService, options, metrics)
      );

      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          metrics.processedBranches++;
        } else {
          results.push({
            branch: batch[index].branch,
            tag: batch[index].tag,
            success: false,
            changes: { tasksAdded: 0, tasksUpdated: 0, tasksRemoved: 0, conflictsResolved: 0 },
            error: result.reason?.message || 'Unknown error',
            duration: 0,
          });
          metrics.failedBranches++;
          metrics.errors++;
        }
      });
    }
  }

  private static async processBranchesSequential(
    projectId: string,
    mappings: BranchTagMapping[],
    repository: UnifiedRepository,
    gitService: GitService,
    options: AdvancedSyncOptions,
    metrics: SyncMetrics,
    results: AdvancedSyncResult['branchResults']
  ): Promise<void> {
    for (const mapping of mappings) {
      try {
        const result = await this.processSingleBranch(
          projectId, mapping, repository, gitService, options, metrics
        );
        results.push(result);
        metrics.processedBranches++;
      } catch (error) {
        results.push({
          branch: mapping.branch,
          tag: mapping.tag,
          success: false,
          changes: { tasksAdded: 0, tasksUpdated: 0, tasksRemoved: 0, conflictsResolved: 0 },
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: 0,
        });
        metrics.failedBranches++;
        metrics.errors++;
      }
    }
  }

  private static async processSingleBranch(
    projectId: string,
    mapping: BranchTagMapping,
    repository: UnifiedRepository,
    gitService: GitService,
    options: AdvancedSyncOptions,
    metrics: SyncMetrics
  ): Promise<AdvancedSyncResult['branchResults'][0]> {
    const startTime = Date.now();

    try {
      const result = await BranchTagMapper.syncBranchTasks(
        projectId,
        mapping.branch,
        gitService
      );

      const duration = Date.now() - startTime;
      metrics.tasksProcessed += result.taskCount;

      return {
        branch: mapping.branch,
        tag: result.tag,
        success: true,
        changes: {
          tasksAdded: result.taskCount,
          tasksUpdated: 0,
          tasksRemoved: 0,
          conflictsResolved: 0,
        },
        duration,
      };

    } catch (error) {
      const syncError = await SyncErrorHandler.handleError(error, {
        projectId,
        branch: mapping.branch,
        operation: 'process-single-branch',
      });

      return {
        branch: mapping.branch,
        tag: mapping.tag,
        success: false,
        changes: { tasksAdded: 0, tasksUpdated: 0, tasksRemoved: 0, conflictsResolved: 0 },
        error: syncError.message,
        duration: Date.now() - startTime,
      };
    }
  }

  private static generateRecommendations(
    branchResults: AdvancedSyncResult['branchResults'],
    metrics: SyncMetrics,
    options: AdvancedSyncOptions
  ): string[] {
    const recommendations: string[] = [];

    const successRate = branchResults.length > 0 
      ? branchResults.filter(r => r.success).length / branchResults.length 
      : 0;

    if (successRate < 0.8) {
      recommendations.push('Consider enabling retry mechanism for failed branches');
    }

    if (metrics.performanceStats.avgBranchProcessingTime > 15000) {
      recommendations.push('Enable batch processing to improve performance');
    }

    if (metrics.errors > 0) {
      recommendations.push('Review error logs and consider adjusting sync settings');
    }

    if (!options.enableDeltaSync && metrics.totalTasks > 50) {
      recommendations.push('Enable delta sync for better performance with large task sets');
    }

    return recommendations;
  }
}