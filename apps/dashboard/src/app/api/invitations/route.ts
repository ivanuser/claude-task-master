import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { notificationService } from '@/lib/notifications/notification-service';
import { emailService } from '@/lib/email/email-service';

// POST /api/invitations - Send team invitation by email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { email, teamId, message, role = 'MEMBER' } = await request.json();

    if (!email || !teamId) {
      return NextResponse.json({ error: 'Email and team ID are required' }, { status: 400 });
    }

    // Get team details and check if user has permission to invite
    const team = await prisma.project.findFirst({
      where: {
        id: teamId,
        members: {
          some: {
            userId: (session.user as any).id,
            role: {
              in: ['ADMIN', 'OWNER']
            }
          }
        }
      },
      include: {
        members: {
          where: {
            userId: (session.user as any).id
          },
          include: {
            user: true
          }
        }
      }
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found or insufficient permissions' }, { status: 404 });
    }

    const currentUser = team.members[0]?.user;
    if (!currentUser) {
      return NextResponse.json({ error: 'Current user not found' }, { status: 404 });
    }

    // Check if user already exists
    let invitedUser = await prisma.user.findUnique({
      where: { email }
    });

    let invitationToken = '';
    
    if (invitedUser) {
      // User exists, check if already a member
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: invitedUser.id,
            projectId: teamId
          }
        }
      });

      if (existingMember) {
        return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
      }

      // Send notification to existing user
      await notificationService.sendTeamInvitationNotification(
        invitedUser.id,
        team.name,
        currentUser.name || currentUser.email,
        `${process.env.NEXTAUTH_URL}/teams/${teamId}/join`
      );
    } else {
      // User doesn't exist, create invitation token
      invitationToken = `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create pending user record with invitation token
      invitedUser = await prisma.user.create({
        data: {
          email,
          name: email.split('@')[0], // Use email prefix as name
          isActive: false, // Mark as inactive until they accept
          settings: {
            invitationToken,
            invitedToTeam: teamId,
            invitedBy: currentUser.id,
            invitedAt: new Date().toISOString(),
          }
        }
      });
    }

    // Send email invitation
    const invitationUrl = invitedUser.isActive
      ? `${process.env.NEXTAUTH_URL}/teams/${teamId}/join`
      : `${process.env.NEXTAUTH_URL}/auth/signup?token=${invitationToken}&team=${teamId}`;

    const emailResult = await emailService.sendEmail({
      to: email,
      subject: `You're invited to join ${team.name} on Task Master`,
      template: 'TEAM_INVITATION' as any,
      data: {
        userName: invitedUser.name || 'there',
        teamName: team.name,
        invitedBy: currentUser.name || currentUser.email,
        invitationUrl,
        message: message || `Join us on Task Master to collaborate on ${team.name}!`,
      },
      userId: invitedUser.id,
    });

    if (!emailResult.success) {
      return NextResponse.json({ error: 'Failed to send invitation email' }, { status: 500 });
    }

    // Create invitation record for tracking
    const invitation = await prisma.$transaction(async (tx) => {
      return await tx.user.update({
        where: { id: invitedUser!.id },
        data: {
          settings: {
            ...((invitedUser!.settings as any) || {}),
            pendingInvitations: [
              ...((invitedUser!.settings as any)?.pendingInvitations || []),
              {
                teamId,
                teamName: team.name,
                invitedBy: currentUser.id,
                invitedByName: currentUser.name || currentUser.email,
                role,
                message,
                invitedAt: new Date().toISOString(),
                token: invitationToken,
              }
            ]
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        email,
        teamName: team.name,
        invitedBy: currentUser.name || currentUser.email,
        status: invitedUser.isActive ? 'sent_to_existing_user' : 'sent_to_new_user',
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 });
  }
}

// GET /api/invitations - Get pending invitations for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: (session.user as any).id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const pendingInvitations = (user.settings as any)?.pendingInvitations || [];

    // Filter out expired invitations (older than 7 days)
    const validInvitations = pendingInvitations.filter((inv: any) => {
      const invitedAt = new Date(inv.invitedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - invitedAt.getTime()) / (1000 * 3600 * 24);
      return daysDiff <= 7;
    });

    // Update user settings if we filtered out any invitations
    if (validInvitations.length !== pendingInvitations.length) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          settings: {
            ...((user.settings as any) || {}),
            pendingInvitations: validInvitations
          }
        }
      });
    }

    return NextResponse.json({
      invitations: validInvitations
    });

  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 });
  }
}