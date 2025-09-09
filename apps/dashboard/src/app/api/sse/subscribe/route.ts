import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { subscribeToProject, unsubscribeFromProject, getSSEStats } from '@/app/api/sse/route';

// Subscribe to project updates
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Subscribe the user to the project
    subscribeToProject(session.user.id, projectId);

    return NextResponse.json({
      success: true,
      message: `Subscribed to project ${projectId}`,
      projectId
    });

  } catch (error) {
    console.error('❌ Subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe to project' },
      { status: 500 }
    );
  }
}

// Unsubscribe from project updates
export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Unsubscribe the user from the project
    unsubscribeFromProject(session.user.id, projectId);

    return NextResponse.json({
      success: true,
      message: `Unsubscribed from project ${projectId}`,
      projectId
    });

  } catch (error) {
    console.error('❌ Unsubscription error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe from project' },
      { status: 500 }
    );
  }
}

// Get subscription status
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const stats = getSSEStats();
    const userConnections = stats.connections.filter(
      conn => conn.userId === session.user.id
    );

    return NextResponse.json({
      userId: session.user.id,
      connections: userConnections,
      totalConnections: stats.totalConnections
    });

  } catch (error) {
    console.error('❌ Error getting subscription status:', error);
    return NextResponse.json(
      { error: 'Failed to get subscription status' },
      { status: 500 }
    );
  }
}