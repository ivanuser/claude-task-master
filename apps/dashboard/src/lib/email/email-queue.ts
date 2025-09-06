import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { emailService } from './email-service';
import { EmailType } from '@prisma/client';

// Redis connection
const connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create email queue
export const emailQueue = new Queue('emails', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
});

// Email job data interface
interface EmailJobData {
  type: 'send' | 'digest' | 'bulk';
  to?: string;
  userId: string;
  template: EmailType;
  subject: string;
  data: any;
  unsubscribeToken?: string;
  priority?: number;
}

// Add email to queue
export async function queueEmail(jobData: EmailJobData) {
  try {
    const job = await emailQueue.add('send-email', jobData, {
      priority: jobData.priority || 0,
      delay: 0,
    });

    console.log(`Email queued with job ID: ${job.id}`);
    return job.id;
  } catch (error) {
    console.error('Failed to queue email:', error);
    throw error;
  }
}

// Queue daily digest emails for all users
export async function queueDailyDigests() {
  try {
    // This would typically fetch all users who want daily digests
    // For now, we'll just add a placeholder
    const job = await emailQueue.add(
      'daily-digest',
      {
        type: 'digest',
        schedule: 'daily',
      },
      {
        repeat: {
          pattern: '0 9 * * *', // Every day at 9 AM
        },
      }
    );

    console.log(`Daily digest job scheduled: ${job.id}`);
    return job.id;
  } catch (error) {
    console.error('Failed to schedule daily digests:', error);
    throw error;
  }
}

// Queue weekly report emails
export async function queueWeeklyReports() {
  try {
    const job = await emailQueue.add(
      'weekly-report',
      {
        type: 'digest',
        schedule: 'weekly',
      },
      {
        repeat: {
          pattern: '0 9 * * 1', // Every Monday at 9 AM
        },
      }
    );

    console.log(`Weekly report job scheduled: ${job.id}`);
    return job.id;
  } catch (error) {
    console.error('Failed to schedule weekly reports:', error);
    throw error;
  }
}

// Email worker - processes email jobs
export const emailWorker = new Worker(
  'emails',
  async (job) => {
    const { type, to, userId, template, subject, data, unsubscribeToken } = job.data as EmailJobData;

    console.log(`Processing email job ${job.id}: ${type}`);

    try {
      switch (type) {
        case 'send':
          // Send individual email
          const result = await emailService.sendEmail({
            to: to!,
            subject,
            template,
            data,
            userId,
            unsubscribeToken,
          });

          if (!result.success) {
            throw new Error(result.error || 'Failed to send email');
          }

          return result;

        case 'digest':
          // Process digest emails (daily/weekly)
          if (job.name === 'daily-digest') {
            // TODO: Fetch all users with daily digest preference and queue individual emails
            console.log('Processing daily digests...');
          } else if (job.name === 'weekly-report') {
            // TODO: Fetch all users with weekly report preference and queue individual emails
            console.log('Processing weekly reports...');
          }
          break;

        case 'bulk':
          // Handle bulk email sending
          console.log('Processing bulk email...');
          break;

        default:
          throw new Error(`Unknown email job type: ${type}`);
      }
    } catch (error: any) {
      console.error(`Email job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection,
    concurrency: 5, // Process up to 5 emails simultaneously
  }
);

// Email queue events
const emailQueueEvents = new QueueEvents('emails', { connection });

emailQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  console.log(`Email job ${jobId} completed:`, returnvalue);
});

emailQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Email job ${jobId} failed:`, failedReason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down email queue...');
  await emailWorker.close();
  await emailQueue.close();
  await connection.quit();
});

// Queue utility functions
export async function getQueueStatus() {
  const [waiting, active, completed, failed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

export async function retryFailedJobs() {
  const failed = await emailQueue.getFailed();
  const results = [];

  for (const job of failed) {
    await job.retry();
    results.push(job.id);
  }

  return results;
}

export async function cleanQueue() {
  await emailQueue.clean(1000, 100, 'completed');
  await emailQueue.clean(1000, 100, 'failed');
  console.log('Email queue cleaned');
}