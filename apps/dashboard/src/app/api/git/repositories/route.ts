import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GitService } from '@/lib/git/git-service';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') as 'github' | 'gitlab' | null;
    const scan = searchParams.get('scan') === 'true';

    const gitService = await GitService.createFromUser(session.user.id);

    if (scan) {
      // Scan for Task Master projects
      const taskMasterProjects = await gitService.scanForTaskMasterProjects();
      
      // Filter by provider if specified
      const filteredProjects = provider 
        ? taskMasterProjects.filter(project => project.repository.provider === provider)
        : taskMasterProjects;

      return NextResponse.json({
        taskMasterProjects: filteredProjects,
        total: filteredProjects.length,
      });
    } else {
      // Get all repositories
      const repositories = await gitService.getAllRepositories();
      
      // Filter by provider if specified
      const filteredRepositories = provider
        ? repositories.filter(repo => repo.provider === provider)
        : repositories;

      return NextResponse.json({
        repositories: filteredRepositories,
        total: filteredRepositories.length,
      });
    }
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}