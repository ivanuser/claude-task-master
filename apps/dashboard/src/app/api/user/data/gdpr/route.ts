import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import crypto from 'crypto';

// GET - Get GDPR compliance status and available actions
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        _count: {
          select: {
            projects: true,
            notifications: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      gdprRights: {
        dataPortability: true,
        rightToAccess: true,
        rightToRectification: true,
        rightToErasure: true,
        rightToRestriction: true,
        rightToObjection: true,
      },
      userData: {
        accountCreated: user.createdAt,
        lastUpdated: user.updatedAt,
        projectCount: user._count.projects,
        notificationCount: user._count.notifications,
        apiKeyCount: user._count.apiKeys,
      },
      availableActions: [
        {
          id: 'export',
          name: 'Export All Data',
          description: 'Download all your data in JSON or CSV format',
          endpoint: '/api/user/data/export',
        },
        {
          id: 'anonymize',
          name: 'Anonymize Account',
          description: 'Replace personal information with anonymous data',
          endpoint: '/api/user/data/gdpr',
          method: 'PATCH',
        },
        {
          id: 'delete',
          name: 'Delete Account',
          description: 'Permanently delete your account and all associated data',
          endpoint: '/api/user/data/gdpr',
          method: 'DELETE',
        },
      ],
    });
  } catch (error: any) {
    console.error('Error fetching GDPR status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch GDPR status' },
      { status: 500 }
    );
  }
}

// PATCH - Anonymize user data (right to be forgotten - soft delete)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { confirmAnonymize } = body;

    if (!confirmAnonymize) {
      return NextResponse.json(
        { error: 'Please confirm anonymization by setting confirmAnonymize to true' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Generate anonymous identifier
    const anonymousId = `anon_${crypto.randomBytes(8).toString('hex')}`;

    // Anonymize user data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: `${anonymousId}@anonymized.local`,
        name: `Anonymous User ${anonymousId}`,
        image: null,
        isAnonymized: true,
        anonymizedAt: new Date(),
      },
    });

    // Remove all API keys
    await prisma.apiKey.deleteMany({
      where: { userId: user.id },
    });

    // Clear notification content
    await prisma.notification.updateMany({
      where: { userId: user.id },
      data: {
        title: 'Anonymized',
        message: 'Content removed for privacy',
        metadata: {},
      },
    });

    // Anonymize project membership names
    await prisma.projectMember.updateMany({
      where: { userId: user.id },
      data: {
        permissions: {},
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Your account has been anonymized. Personal data has been removed.',
      anonymousId,
    });
  } catch (error: any) {
    console.error('Error anonymizing user data:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to anonymize user data' },
      { status: 500 }
    );
  }
}

// DELETE - Complete account deletion (right to erasure)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const confirmDelete = searchParams.get('confirm') === 'DELETE_MY_ACCOUNT';
    const keepProjects = searchParams.get('keepProjects') === 'true';

    if (!confirmDelete) {
      return NextResponse.json(
        { 
          error: 'Please confirm deletion by adding ?confirm=DELETE_MY_ACCOUNT to the URL',
          warning: 'This action is irreversible and will delete all your data',
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        projects: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const deletionSummary = {
      userId: user.id,
      email: user.email,
      deletedAt: new Date(),
      projectsTransferred: 0,
      projectsDeleted: 0,
      tasksDeleted: 0,
      notificationsDeleted: 0,
    };

    // Handle projects
    for (const project of user.projects) {
      const otherMembers = project.members.filter(m => m.userId !== user.id);
      
      if (keepProjects && otherMembers.length > 0) {
        // Transfer ownership to another member
        const newOwner = otherMembers[0];
        await prisma.projectMember.update({
          where: { id: newOwner.id },
          data: { role: 'OWNER' },
        });
        deletionSummary.projectsTransferred++;
      } else {
        // Delete the project and all related data
        const taskCount = await prisma.task.count({
          where: { projectId: project.id },
        });
        
        await prisma.task.deleteMany({ where: { projectId: project.id } });
        await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
        await prisma.syncHistory.deleteMany({ where: { projectId: project.id } });
        await prisma.project.delete({ where: { id: project.id } });
        
        deletionSummary.projectsDeleted++;
        deletionSummary.tasksDeleted += taskCount;
      }
    }

    // Delete all user-specific data
    const notificationCount = await prisma.notification.count({
      where: { userId: user.id },
    });
    
    await prisma.notification.deleteMany({ where: { userId: user.id } });
    await prisma.notificationPreference.deleteMany({ where: { userId: user.id } });
    await prisma.themePreference.deleteMany({ where: { userId: user.id } });
    await prisma.emailPreference.deleteMany({ where: { userId: user.id } });
    await prisma.apiKey.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    
    deletionSummary.notificationsDeleted = notificationCount;

    // Remove user from any projects they're a member of but don't own
    await prisma.projectMember.deleteMany({
      where: { userId: user.id },
    });

    // Finally, delete the user
    await prisma.user.delete({
      where: { id: user.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Your account and all associated data have been permanently deleted',
      summary: deletionSummary,
    });
  } catch (error: any) {
    console.error('Error deleting user account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user account' },
      { status: 500 }
    );
  }
}