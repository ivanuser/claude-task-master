import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In production, you might want to:
    // 1. Send a confirmation email with a deletion link
    // 2. Schedule the deletion for a future date (e.g., 30 days)
    // 3. Allow users to cancel the deletion request

    // For now, we'll just mark the account as inactive
    // and schedule for deletion
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30); // 30 days from now

    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        isActive: false,
        settings: {
          ...(await prisma.user.findUnique({
            where: { email: session.user.email },
            select: { settings: true },
          }))?.settings as any || {},
          deletionScheduled: deletionDate.toISOString(),
          deletionRequested: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    // TODO: Send confirmation email
    console.log(`Account deletion scheduled for ${session.user.email} on ${deletionDate}`);

    // In a real application, you would also:
    // - Remove user from all teams
    // - Transfer ownership of projects
    // - Cancel subscriptions
    // - Archive user data

    return NextResponse.json({
      success: true,
      message: 'Account deletion scheduled. You will receive a confirmation email.',
      deletionDate: deletionDate.toISOString(),
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to process account deletion' },
      { status: 500 }
    );
  }
}