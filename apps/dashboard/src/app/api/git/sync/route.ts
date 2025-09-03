import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GitService } from '@/lib/git/git-service';
import { addSyncJob, addScanJob } from '@/lib/jobs/sync-queue';
import { prisma } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, repositoryId, provider, syncType = 'full' } = body;

    if (action === 'sync-project' && repositoryId && provider) {
      // Sync a specific project
      const [providerName, repoId] = repositoryId.split('_');
      const numericRepoId = parseInt(repoId);

      if (providerName !== provider || isNaN(numericRepoId)) {
        return NextResponse.json(
          { error: 'Invalid repository ID format' },
          { status: 400 }
        );
      }

      // Find the project in database
      const gitService = await GitService.createFromUser(session.user.id);
      const repositories = await gitService.getAllRepositories();
      const targetRepo = repositories.find(repo => repo.id === repositoryId);

      if (!targetRepo) {
        return NextResponse.json(
          { error: 'Repository not found' },
          { status: 404 }
        );
      }

      // Find or create project in database
      let project = await prisma.project.findFirst({
        where: {
          gitUrl: targetRepo.webUrl,
          gitProvider: provider,
        },
      });

      if (!project) {
        // Create new project
        project = await prisma.project.create({
          data: {
            name: targetRepo.name,
            description: targetRepo.description,
            tag: targetRepo.fullName.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
            gitUrl: targetRepo.webUrl,
            gitBranch: targetRepo.defaultBranch,
            gitProvider: provider,
            status: 'ACTIVE',
          },
        });

        // Add user as project owner
        await prisma.projectMember.create({
          data: {
            userId: session.user.id,
            projectId: project.id,
            role: 'OWNER',
            permissions: {
              canRead: true,
              canWrite: true,
              canDelete: true,
              canManageMembers: true,
              canManageSettings: true,
            },
          },
        });
      }

      // Create sync history entry
      const syncHistory = await prisma.syncHistory.create({
        data: {
          projectId: project.id,
          userId: session.user.id,
          syncType: syncType.toUpperCase() as any,
          status: 'PENDING',
          syncData: {
            manual: true,
            repository: targetRepo.fullName,
            provider,
          },
        },
      });

      // Add sync job to queue
      await addSyncJob({
        syncHistoryId: syncHistory.id,
        projectId: project.id,
        repositoryId: numericRepoId,
        provider,
        syncType,
        metadata: {
          manual: true,
          userId: session.user.id,
        },
      });

      return NextResponse.json({
        message: 'Sync job queued successfully',
        syncHistoryId: syncHistory.id,
        projectId: project.id,
        syncType,
      });

    } else if (action === 'scan-repositories') {
      // Scan all repositories for Task Master projects
      const { providers = ['github', 'gitlab'], autoSync = false } = body;

      await addScanJob({
        userId: session.user.id,
        providers,
        autoSync,
      });

      return NextResponse.json({
        message: 'Repository scan queued successfully',
        providers,
        autoSync,
      });

    } else {
      return NextResponse.json(
        { error: 'Invalid action or missing parameters' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error processing sync request:', error);
    return NextResponse.json(
      { error: 'Failed to process sync request' },
      { status: 500 }
    );
  }
}