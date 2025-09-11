import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { notificationService } from '@/lib/notifications/notification-service';

// POST /api/invitations/accept - Accept a team invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { teamId, token } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Get user and their pending invitations
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has a pending invitation for this team
    const pendingInvitations = (user.settings as any)?.pendingInvitations || [];
    const invitationIndex = pendingInvitations.findIndex((inv: any) => 
      inv.teamId === teamId && (!token || inv.token === token)
    );

    if (invitationIndex === -1) {
      return NextResponse.json({ error: 'No pending invitation found for this team' }, { status: 404 });
    }

    const invitation = pendingInvitations[invitationIndex];

    // Get team details
    const team = await prisma.project.findUnique({
      where: { id: teamId },
      include: {
        members: {
          where: { userId: invitation.invitedBy },
          include: { user: true }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId: teamId
        }
      }
    });

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
    }

    // Add user to the team
    await prisma.$transaction(async (tx) => {
      // Add user as team member
      await tx.projectMember.create({
        data: {
          userId,
          projectId: teamId,
          role: invitation.role || 'MEMBER',
        }
      });

      // Remove the invitation from pending invitations
      const updatedInvitations = pendingInvitations.filter((_: any, index: number) => index !== invitationIndex);
      
      await tx.user.update({
        where: { id: userId },
        data: {
          isActive: true, // Ensure user is active
          settings: {
            ...((user.settings as any) || {}),
            pendingInvitations: updatedInvitations
          }
        }
      });
    });

    // Notify the person who invited them
    if (team.members[0]?.user) {
      const inviter = team.members[0].user;
      await notificationService.createNotification(
        inviter.id,
        'TEAM_MEMBER_JOINED',
        'Team Member Joined',
        `${user.name || user.email} accepted your invitation to join ${team.name}`,
        'LOW',
        {
          teamId,
          teamName: team.name,
          newMemberName: user.name || user.email,
          newMemberEmail: user.email
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${team.name}`,
      team: {
        id: team.id,
        name: team.name,
        description: team.description
      }
    });

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json({ error: 'Failed to accept invitation' }, { status: 500 });
  }
}

// DELETE /api/invitations/accept - Decline a team invitation
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { teamId, token } = await request.json();

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Get user and their pending invitations
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Remove the invitation from pending invitations
    const pendingInvitations = (user.settings as any)?.pendingInvitations || [];
    const updatedInvitations = pendingInvitations.filter((inv: any) => 
      !(inv.teamId === teamId && (!token || inv.token === token))
    );

    await prisma.user.update({
      where: { id: userId },
      data: {
        settings: {
          ...((user.settings as any) || {}),
          pendingInvitations: updatedInvitations
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation declined'
    });

  } catch (error) {
    console.error('Error declining invitation:', error);
    return NextResponse.json({ error: 'Failed to decline invitation' }, { status: 500 });
  }
}