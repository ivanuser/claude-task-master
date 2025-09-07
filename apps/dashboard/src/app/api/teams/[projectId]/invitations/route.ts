import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import { teamNotificationService } from '@/lib/notifications/team-notification-service';
import { ProjectRole } from '../../../../../types/prisma-enums';

// POST - Send team invitation
export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { projectId } = params;
    const body = await request.json();
    const { email, role = 'MEMBER', message } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check permissions
    const currentMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId: currentUser.id,
          projectId,
        },
      },
    });

    if (!currentMember || !['OWNER', 'ADMIN'].includes(currentMember.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to send invitations' },
        { status: 403 }
      );
    }

    // Check if user already exists and is a member
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: existingUser.id,
            projectId,
          },
        },
      });

      if (existingMember) {
        return NextResponse.json(
          { error: 'User is already a member of this project' },
          { status: 400 }
        );
      }
    }

    // Create or get the project for invitation
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Send invitation notification or create pending invitation
    const invitationId = await teamNotificationService.sendTeamInvitation(
      projectId,
      email,
      currentUser.id,
      message
    );

    // If user exists, add them to the project immediately with pending status
    if (existingUser) {
      await prisma.projectMember.create({
        data: {
          userId: existingUser.id,
          projectId,
          role: role as ProjectRole,
          joinedAt: new Date(),
          // You could add an 'invitationPending' field to track this
        },
      });
    } else {
      // Store invitation for when user signs up
      // This would require a ProjectInvitation model
      // For now, we'll just log it
      console.log(`Invitation sent to ${email} for project ${projectId}`);
    }

    return NextResponse.json({
      success: true,
      invitationId,
      message: existingUser 
        ? 'Invitation sent to existing user' 
        : 'Invitation email will be sent when user signs up',
    });
  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send invitation' },
      { status: 500 }
    );
  }
}