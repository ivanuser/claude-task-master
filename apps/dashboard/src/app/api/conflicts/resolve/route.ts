import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { broadcastSSEEvent } from '@/app/api/sse/route';
import { 
  conflictResolver, 
  ResolutionStrategy, 
  ConflictType 
} from '@/lib/services/conflictResolver';
import { TaskData } from '@/app/api/sync/fetch/route';
import { sseBroadcaster } from '@/lib/services/sseBroadcaster';

export interface ResolveConflictRequest {
  conflictId: string;
  projectId: string;
  strategy: ResolutionStrategy;
  customMerge?: TaskData;
  notes?: string;
}

export interface DetectConflictsRequest {
  projectId: string;
  localTasks: TaskData[];
  remoteTasks: TaskData[];
}

// Resolve a conflict
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: ResolveConflictRequest = await request.json();
    const { conflictId, projectId, strategy, customMerge, notes } = body;

    // Verify user has access to the project
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!project || project.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Resolve the conflict
    const resolvedTask = await conflictResolver.resolveConflict(
      conflictId,
      strategy,
      customMerge,
      session.user.id
    );

    // Record resolution in database
    await prisma.conflictResolution.create({
      data: {
        conflictId,
        projectId,
        userId: session.user.id,
        strategy,
        resolvedData: resolvedTask ? JSON.stringify(resolvedTask) : null,
        notes,
        resolvedAt: new Date()
      }
    });

    // Broadcast resolution event
    sseBroadcaster.broadcastProjectSync(
      projectId,
      'completed',
      {
        conflictResolved: true,
        conflictId,
        strategy,
        resolvedBy: session.user.name || session.user.email
      }
    );

    return NextResponse.json({
      success: true,
      conflictId,
      strategy,
      resolvedTask,
      message: `Conflict resolved using ${strategy} strategy`
    });

  } catch (error) {
    console.error('❌ Conflict resolution error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to resolve conflict',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Detect conflicts between task sets
export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body: DetectConflictsRequest = await request.json();
    const { projectId, localTasks, remoteTasks } = body;

    // Verify user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!project || project.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Detect conflicts
    const conflicts = conflictResolver.detectConflicts(
      localTasks,
      remoteTasks,
      projectId
    );

    // Store conflicts in database for tracking
    if (conflicts.length > 0) {
      await prisma.conflictLog.createMany({
        data: conflicts.map(conflict => ({
          conflictId: conflict.id,
          projectId: conflict.projectId,
          taskId: String(conflict.taskId),
          conflictType: conflict.conflictType,
          localVersion: JSON.stringify(conflict.localVersion),
          remoteVersion: JSON.stringify(conflict.remoteVersion),
          detectedBy: session.user.id,
          detectedAt: conflict.detectedAt
        }))
      });

      // Broadcast conflict detection event
      broadcastSSEEvent({
        type: 'conflicts-detected',
        projectId,
        data: {
          conflictCount: conflicts.length,
          conflicts: conflicts.map(c => ({
            id: c.id,
            taskId: c.taskId,
            type: c.conflictType
          })),
          timestamp: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: true,
      conflictCount: conflicts.length,
      conflicts,
      message: conflicts.length > 0 
        ? `Detected ${conflicts.length} conflict(s)` 
        : 'No conflicts detected'
    });

  } catch (error) {
    console.error('❌ Conflict detection error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to detect conflicts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Get pending conflicts for a project
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const includeHistory = searchParams.get('includeHistory') === 'true';

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  try {
    // Verify user has access
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: session.user.id }
        }
      }
    });

    if (!project || project.members.length === 0) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get pending conflicts
    const pendingConflicts = conflictResolver.getPendingConflicts(projectId);

    let resolutionHistory = [];
    if (includeHistory) {
      resolutionHistory = conflictResolver.getResolutionHistory(projectId);
    }

    // Get additional conflict data from database
    const dbConflicts = await prisma.conflictLog.findMany({
      where: {
        projectId,
        resolved: false
      },
      orderBy: {
        detectedAt: 'desc'
      },
      take: 50
    });

    return NextResponse.json({
      pending: pendingConflicts,
      history: resolutionHistory,
      dbConflicts: dbConflicts.map(c => ({
        id: c.conflictId,
        taskId: c.taskId,
        type: c.conflictType,
        detectedAt: c.detectedAt,
        detectedBy: c.detectedBy
      })),
      totalPending: pendingConflicts.length,
      totalResolved: resolutionHistory.length
    });

  } catch (error) {
    console.error('❌ Error fetching conflicts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conflicts' },
      { status: 500 }
    );
  }
}

// Auto-resolve conflicts with safe strategies
export async function PATCH(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const autoStrategy = searchParams.get('strategy') || 'safe';

  if (!projectId) {
    return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
  }

  try {
    const pendingConflicts = conflictResolver.getPendingConflicts(projectId);
    const resolved = [];
    const deferred = [];

    for (const conflict of pendingConflicts) {
      let strategy: ResolutionStrategy;

      // Determine auto-resolution strategy
      switch (conflict.conflictType) {
        case ConflictType.STATUS_CONFLICT:
          // Prefer in-progress status
          if (conflict.localVersion.status === 'in-progress') {
            strategy = ResolutionStrategy.ACCEPT_LOCAL;
          } else if (conflict.remoteVersion.status === 'in-progress') {
            strategy = ResolutionStrategy.ACCEPT_REMOTE;
          } else {
            strategy = ResolutionStrategy.DEFER;
          }
          break;

        case ConflictType.VERSION_MISMATCH:
          // Auto-merge non-conflicting fields
          strategy = ResolutionStrategy.MERGE_FIELDS;
          break;

        case ConflictType.DELETE_EDIT:
          // Defer delete conflicts for manual review
          strategy = ResolutionStrategy.DEFER;
          break;

        default:
          if (autoStrategy === 'aggressive') {
            strategy = ResolutionStrategy.ACCEPT_REMOTE;
          } else {
            strategy = ResolutionStrategy.DEFER;
          }
      }

      if (strategy === ResolutionStrategy.DEFER) {
        deferred.push(conflict.id);
      } else {
        const resolvedTask = await conflictResolver.resolveConflict(
          conflict.id,
          strategy,
          undefined,
          'auto-resolver'
        );
        
        if (resolvedTask) {
          resolved.push({
            conflictId: conflict.id,
            strategy,
            taskId: conflict.taskId
          });
        }
      }
    }

    // Broadcast auto-resolution results
    if (resolved.length > 0 || deferred.length > 0) {
      broadcastSSEEvent({
        type: 'conflicts-auto-resolved',
        projectId,
        data: {
          resolved: resolved.length,
          deferred: deferred.length,
          timestamp: new Date().toISOString()
        }
      });
    }

    return NextResponse.json({
      success: true,
      resolved: resolved.length,
      deferred: deferred.length,
      resolvedConflicts: resolved,
      deferredConflicts: deferred,
      message: `Auto-resolved ${resolved.length} conflicts, deferred ${deferred.length} for manual review`
    });

  } catch (error) {
    console.error('❌ Auto-resolution error:', error);
    return NextResponse.json(
      { error: 'Failed to auto-resolve conflicts' },
      { status: 500 }
    );
  }
}