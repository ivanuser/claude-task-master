import { NextRequest, NextResponse } from 'next/server';
import { GitLabWebhookHandler, WebhookProcessor } from '@/lib/git/webhook-handlers';
import { prisma } from '@/lib/database';
import { syncQueue } from '@/lib/jobs/sync-queue';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-gitlab-token');
    const event = request.headers.get('x-gitlab-event');

    if (!signature || !event) {
      return NextResponse.json(
        { error: 'Missing required headers' },
        { status: 400 }
      );
    }

    const rawBody = await request.text();
    const secret = process.env.GITLAB_WEBHOOK_SECRET;

    if (!secret) {
      console.error('GitLab webhook secret not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Validate webhook signature (GitLab uses token-based authentication)
    if (signature !== secret) {
      console.error('Invalid GitLab webhook token');
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);
    const payload = GitLabWebhookHandler.parsePayload(request.headers, body);

    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid payload' },
        { status: 400 }
      );
    }

    console.log(`📥 Received GitLab webhook: ${event} for ${payload.repository.full_name}`);

    // Process the webhook
    const processingResult = await WebhookProcessor.processWebhook(payload);

    if (processingResult.shouldSync) {
      // Find the project in our database
      const project = await prisma.project.findFirst({
        where: {
          gitUrl: payload.repository.html_url,
          gitProvider: 'gitlab',
        },
      });

      if (project) {
        // Create sync history entry
        const syncHistory = await prisma.syncHistory.create({
          data: {
            projectId: project.id,
            syncType: processingResult.syncType.toUpperCase() as any,
            status: 'PENDING',
            syncData: {
              webhook: {
                event: payload.event,
                repository: payload.repository.full_name,
                commits: payload.commits?.length || 0,
              },
              ...processingResult.metadata,
            },
          },
        });

        // Add sync job to queue
        await syncQueue.add('sync-project', {
          syncHistoryId: syncHistory.id,
          projectId: project.id,
          repositoryId: payload.repository.id,
          provider: 'gitlab',
          syncType: processingResult.syncType,
          metadata: processingResult.metadata,
        });

        console.log(`🔄 Queued sync job for project ${project.name}`);

        return NextResponse.json({
          message: 'Webhook processed successfully',
          sync: {
            queued: true,
            syncHistoryId: syncHistory.id,
            syncType: processingResult.syncType,
          },
        });
      } else {
        console.warn(`No project found for repository ${payload.repository.full_name}`);
        return NextResponse.json({
          message: 'Repository not tracked',
          sync: { queued: false },
        });
      }
    } else {
      console.log(`No sync needed for ${payload.repository.full_name}: ${processingResult.metadata.reason}`);
      return NextResponse.json({
        message: 'Webhook received but no sync needed',
        sync: { queued: false },
      });
    }
  } catch (error) {
    console.error('GitLab webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}