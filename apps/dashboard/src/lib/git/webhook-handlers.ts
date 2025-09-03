import { createHmac } from 'crypto';
import { NextRequest } from 'next/server';

export interface WebhookPayload {
  provider: 'github' | 'gitlab';
  event: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    html_url: string;
    owner: {
      login: string;
      id: number;
    };
  };
  commits?: Array<{
    id: string;
    message: string;
    author: {
      name: string;
      email: string;
    };
    timestamp: string;
    modified: string[];
    added: string[];
    removed: string[];
  }>;
  ref?: string;
  before?: string;
  after?: string;
}

export class WebhookValidator {
  // Validate GitHub webhook signature
  static validateGitHubSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    if (!signature.startsWith('sha256=')) {
      return false;
    }

    const expectedSignature = createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    const receivedSignature = signature.slice(7); // Remove 'sha256=' prefix

    // Use constant-time comparison to prevent timing attacks
    return this.constantTimeCompare(expectedSignature, receivedSignature);
  }

  // Validate GitLab webhook signature
  static validateGitLabSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    return this.constantTimeCompare(expectedSignature, signature);
  }

  // Constant-time string comparison
  private static constantTimeCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

export class GitHubWebhookHandler {
  // Parse GitHub webhook payload
  static parsePayload(headers: Headers, body: any): WebhookPayload | null {
    const event = headers.get('x-github-event');
    if (!event) return null;

    const repository = body.repository;
    if (!repository) return null;

    const payload: WebhookPayload = {
      provider: 'github',
      event,
      repository: {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        html_url: repository.html_url,
        owner: {
          login: repository.owner.login,
          id: repository.owner.id,
        },
      },
    };

    // Add push-specific data
    if (event === 'push' && body.commits) {
      payload.commits = body.commits.map((commit: any) => ({
        id: commit.id,
        message: commit.message,
        author: {
          name: commit.author.name,
          email: commit.author.email,
        },
        timestamp: commit.timestamp,
        modified: commit.modified || [],
        added: commit.added || [],
        removed: commit.removed || [],
      }));
      payload.ref = body.ref;
      payload.before = body.before;
      payload.after = body.after;
    }

    return payload;
  }

  // Check if webhook should trigger Task Master sync
  static shouldTriggerSync(payload: WebhookPayload): boolean {
    if (payload.event === 'push') {
      // Check if any commits modified Task Master files
      return payload.commits?.some(commit =>
        [...commit.modified, ...commit.added, ...commit.removed].some(file =>
          file.startsWith('.taskmaster/')
        )
      ) || false;
    }

    // Handle other relevant events
    if (payload.event === 'repository') {
      return true; // Repository events might affect access
    }

    return false;
  }
}

export class GitLabWebhookHandler {
  // Parse GitLab webhook payload
  static parsePayload(headers: Headers, body: any): WebhookPayload | null {
    const event = headers.get('x-gitlab-event');
    if (!event) return null;

    const project = body.project;
    if (!project) return null;

    const payload: WebhookPayload = {
      provider: 'gitlab',
      event: event.replace(' Hook', '').toLowerCase(),
      repository: {
        id: project.id,
        name: project.name,
        full_name: project.path_with_namespace,
        html_url: project.web_url,
        owner: {
          login: project.namespace || project.path_with_namespace.split('/')[0],
          id: project.namespace_id || 0,
        },
      },
    };

    // Add push-specific data
    if (event === 'Push Hook' && body.commits) {
      payload.commits = body.commits.map((commit: any) => ({
        id: commit.id,
        message: commit.message,
        author: {
          name: commit.author.name,
          email: commit.author.email,
        },
        timestamp: commit.timestamp,
        modified: commit.modified || [],
        added: commit.added || [],
        removed: commit.removed || [],
      }));
      payload.ref = body.ref;
      payload.before = body.before;
      payload.after = body.after;
    }

    return payload;
  }

  // Check if webhook should trigger Task Master sync
  static shouldTriggerSync(payload: WebhookPayload): boolean {
    if (payload.event === 'push') {
      // Check if any commits modified Task Master files
      return payload.commits?.some(commit =>
        [...commit.modified, ...commit.added, ...commit.removed].some(file =>
          file.startsWith('.taskmaster/')
        )
      ) || false;
    }

    // Handle other relevant events
    if (payload.event === 'project') {
      return true; // Project events might affect access
    }

    return false;
  }
}

export class WebhookProcessor {
  // Process webhook payload and determine actions
  static async processWebhook(payload: WebhookPayload): Promise<{
    shouldSync: boolean;
    syncType: 'full' | 'incremental';
    metadata: any;
  }> {
    const shouldSync = payload.provider === 'github'
      ? GitHubWebhookHandler.shouldTriggerSync(payload)
      : GitLabWebhookHandler.shouldTriggerSync(payload);

    if (!shouldSync) {
      return {
        shouldSync: false,
        syncType: 'incremental',
        metadata: { reason: 'No Task Master files modified' },
      };
    }

    // Determine sync type based on changes
    const syncType = payload.event === 'push' ? 'incremental' : 'full';

    const metadata = {
      event: payload.event,
      repository: payload.repository.full_name,
      ref: payload.ref,
      commits: payload.commits?.length || 0,
      timestamp: new Date().toISOString(),
    };

    return {
      shouldSync: true,
      syncType,
      metadata,
    };
  }

  // Extract modified Task Master files from webhook payload
  static getModifiedTaskMasterFiles(payload: WebhookPayload): string[] {
    if (!payload.commits) return [];

    const modifiedFiles = new Set<string>();

    payload.commits.forEach(commit => {
      [...commit.modified, ...commit.added, ...commit.removed]
        .filter(file => file.startsWith('.taskmaster/'))
        .forEach(file => modifiedFiles.add(file));
    });

    return Array.from(modifiedFiles);
  }
}