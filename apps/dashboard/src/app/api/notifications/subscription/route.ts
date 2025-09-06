import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import webpush from 'web-push';

// Configure web-push with VAPID keys (generate these once and store in env)
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@taskmaster.dev'
};

// Set VAPID details if keys are available
if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// GET - Retrieve user's push subscription
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        pushSubscriptions: {
          where: { enabled: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subscription = user.pushSubscriptions[0] || null;

    return NextResponse.json({
      subscribed: !!subscription,
      subscription: subscription ? {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth
        }
      } : null,
      vapidPublicKey: vapidKeys.publicKey
    });
  } catch (error) {
    console.error('Error fetching push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subscription' },
      { status: 500 }
    );
  }
}

// POST - Create or update push subscription
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subscription, types = [] } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user agent and browser info from headers
    const userAgent = request.headers.get('user-agent') || null;
    const browser = detectBrowser(userAgent);

    // Create or update subscription
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        browser,
        types: JSON.stringify(types),
        enabled: true,
        updatedAt: new Date(),
        lastUsedAt: new Date()
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent,
        browser,
        types: JSON.stringify(types),
        enabled: true
      }
    });

    // Send test notification
    if (vapidKeys.publicKey && vapidKeys.privateKey) {
      try {
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title: 'Task Master Notifications',
            body: 'Push notifications are now enabled!',
            icon: '/icon-192x192.png',
            badge: '/icon-72x72.png',
            timestamp: new Date().toISOString()
          })
        );
      } catch (notifError) {
        console.error('Failed to send test notification:', notifError);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Push subscription saved successfully',
      subscriptionId: pushSubscription.id
    });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save subscription' },
      { status: 500 }
    );
  }
}

// DELETE - Remove push subscription
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Delete the subscription
    await prisma.pushSubscription.deleteMany({
      where: {
        userId: user.id,
        endpoint
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json(
      { error: 'Failed to remove subscription' },
      { status: 500 }
    );
  }
}

// Helper function to detect browser from user agent
function detectBrowser(userAgent: string | null): string {
  if (!userAgent) return 'unknown';
  
  if (userAgent.includes('Firefox')) return 'firefox';
  if (userAgent.includes('Chrome')) return 'chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'safari';
  if (userAgent.includes('Edge')) return 'edge';
  if (userAgent.includes('Opera')) return 'opera';
  
  return 'other';
}