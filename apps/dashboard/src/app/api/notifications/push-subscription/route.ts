import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';

// POST /api/notifications/push-subscription - Subscribe to push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { endpoint, p256dh, auth, userAgent } = await request.json();

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Check if subscription already exists
    const existingSubscription = await prisma.webPushSubscription.findFirst({
      where: {
        userId,
        endpoint,
      }
    });

    if (existingSubscription) {
      // Update existing subscription
      const updatedSubscription = await prisma.webPushSubscription.update({
        where: { id: existingSubscription.id },
        data: {
          p256dh,
          auth,
          userAgent: userAgent || null,
          isActive: true,
          updatedAt: new Date(),
        }
      });

      return NextResponse.json({
        success: true,
        message: 'Push subscription updated',
        subscription: updatedSubscription
      });
    }

    // Create new subscription
    const subscription = await prisma.webPushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh,
        auth,
        userAgent: userAgent || null,
        isActive: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription created',
      subscription
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating push subscription:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}

// DELETE /api/notifications/push-subscription - Unsubscribe from push notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const userId = (session.user as any).id;

    // Find and deactivate the subscription
    const subscription = await prisma.webPushSubscription.findFirst({
      where: {
        userId,
        endpoint,
      }
    });

    if (!subscription) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    await prisma.webPushSubscription.update({
      where: { id: subscription.id },
      data: { isActive: false }
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed'
    });

  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
  }
}

// GET /api/notifications/push-subscription - Get push subscription status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const subscriptions = await prisma.webPushSubscription.findMany({
      where: {
        userId,
        isActive: true
      }
    });

    return NextResponse.json({
      subscriptions: subscriptions.map(sub => ({
        id: sub.id,
        endpoint: sub.endpoint,
        createdAt: sub.createdAt,
        userAgent: sub.userAgent
      }))
    });

  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}