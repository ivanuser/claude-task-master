import { Queue, Worker, Job } from 'bullmq';
import { getRedisClient } from '../redis';
import { GitService } from '../git/git-service';
import { prisma } from '../database';

// Job data interfaces
export interface SyncProjectJobData {
  syncHistoryId: string;
  projectId: string;
  repositoryId: number;
  provider: 'github' | 'gitlab';
  syncType: 'full' | 'incremental';
  metadata: any;
}

export interface ScanRepositoriesJobData {
  userId: string;
  providers: ('github' | 'gitlab')[];
  autoSync: boolean;
}

// Create Redis connection for Bull
const redis = getRedisClient();

// Create sync queue
export const syncQueue = new Queue('sync-queue', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 50, // Keep last 50 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

// Create scan queue
export const scanQueue = new Queue('scan-queue', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 20,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

// Sync project job processor
async function processSyncProject(job: Job<SyncProjectJobData>): Promise<void> {
  const { syncHistoryId, projectId, repositoryId, provider, syncType, metadata } = job.data;

  try {
    console.log(`🔄 Processing sync job for project ${projectId} (${provider})`);

    // Update sync history to running
    await prisma.syncHistory.update({
      where: { id: syncHistoryId },
      data: { status: 'RUNNING' },
    });

    // Get project and find associated user account
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              include: {
                accounts: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    // Find a user with the appropriate git provider account
    const memberWithAccount = project.members.find(member =>
      member.user.accounts.some(account => account.provider === provider)
    );

    if (!memberWithAccount) {
      throw new Error(`No member with ${provider} account found for project ${project.name}`);
    }

    // Create GitService instance
    const gitService = await GitService.createFromUser(memberWithAccount.userId);

    // Get all repositories to find the one we need to sync
    const repositories = await gitService.getAllRepositories();
    const targetRepo = repositories.find(repo => 
      repo.id === `${provider}_${repositoryId}`
    );

    if (!targetRepo) {
      throw new Error(`Repository ${provider}_${repositoryId} not found in user's repositories`);
    }

    // Perform the sync
    await gitService.syncTaskMasterProject(targetRepo);

    // Update sync history to completed
    await prisma.syncHistory.update({
      where: { id: syncHistoryId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        tasksAdded: 0, // TODO: Track actual numbers
        tasksUpdated: 0,
        tasksRemoved: 0,
      },
    });

    console.log(`✅ Sync job completed for project ${project.name}`);
  } catch (error) {
    console.error(`❌ Sync job failed for project ${projectId}:`, error);

    // Update sync history to failed
    await prisma.syncHistory.update({
      where: { id: syncHistoryId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : String(error),
      },
    });

    throw error; // Re-throw to mark job as failed
  }
}

// Scan repositories job processor
async function processScanRepositories(job: Job<ScanRepositoriesJobData>): Promise<void> {
  const { userId, providers, autoSync } = job.data;

  try {
    console.log(`🔍 Scanning repositories for user ${userId} (${providers.join(', ')})`);

    // Create GitService instance
    const gitService = await GitService.createFromUser(userId);

    // Scan for Task Master projects
    const taskMasterProjects = await gitService.scanForTaskMasterProjects();

    console.log(`Found ${taskMasterProjects.length} Task Master projects`);

    if (autoSync) {
      // Auto-sync discovered projects
      for (const project of taskMasterProjects) {
        try {
          await gitService.syncTaskMasterProject(project.repository);
          console.log(`✅ Auto-synced project: ${project.repository.fullName}`);
        } catch (error) {
          console.error(`❌ Failed to auto-sync project ${project.repository.fullName}:`, error);
          // Continue with other projects
        }
      }
    }

    console.log(`✅ Repository scan completed for user ${userId}`);
  } catch (error) {
    console.error(`❌ Repository scan failed for user ${userId}:`, error);
    throw error;
  }
}

// Create workers
export const syncWorker = new Worker('sync-queue', processSyncProject, {
  connection: redis,
  concurrency: 3, // Process up to 3 sync jobs concurrently
});

export const scanWorker = new Worker('scan-queue', processScanRepositories, {
  connection: redis,
  concurrency: 1, // Process scan jobs one at a time
});

// Worker event handlers
syncWorker.on('completed', (job) => {
  console.log(`✅ Sync job ${job.id} completed`);
});

syncWorker.on('failed', (job, err) => {
  console.error(`❌ Sync job ${job?.id} failed:`, err.message);
});

syncWorker.on('stalled', (jobId) => {
  console.warn(`⚠️ Sync job ${jobId} stalled`);
});

scanWorker.on('completed', (job) => {
  console.log(`✅ Scan job ${job.id} completed`);
});

scanWorker.on('failed', (job, err) => {
  console.error(`❌ Scan job ${job?.id} failed:`, err.message);
});

// Queue management functions
export async function addSyncJob(data: SyncProjectJobData, options?: any) {
  return syncQueue.add('sync-project', data, options);
}

export async function addScanJob(data: ScanRepositoriesJobData, options?: any) {
  return scanQueue.add('scan-repositories', data, options);
}

// Get queue stats
export async function getQueueStats() {
  const [syncStats, scanStats] = await Promise.all([
    syncQueue.getJobCounts(),
    scanQueue.getJobCounts(),
  ]);

  return {
    sync: syncStats,
    scan: scanStats,
  };
}

// Clean old jobs
export async function cleanOldJobs() {
  await Promise.all([
    syncQueue.clean(24 * 60 * 60 * 1000, 100, 'completed'), // Clean completed jobs older than 24h
    syncQueue.clean(7 * 24 * 60 * 60 * 1000, 50, 'failed'), // Clean failed jobs older than 7 days
    scanQueue.clean(24 * 60 * 60 * 1000, 50, 'completed'),
    scanQueue.clean(7 * 24 * 60 * 60 * 1000, 20, 'failed'),
  ]);
}

// Graceful shutdown
export async function shutdownQueues() {
  console.log('🔄 Shutting down job queues...');
  
  await Promise.all([
    syncWorker.close(),
    scanWorker.close(),
    syncQueue.close(),
    scanQueue.close(),
  ]);
  
  console.log('✅ Job queues shut down successfully');
}