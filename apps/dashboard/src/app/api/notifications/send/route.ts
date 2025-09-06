import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/database';
import webpush from 'web-push';

// Configure web-push with VAPID keys
const vapidKeys = {
  publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || '',
  subject: process.env.VAPID_SUBJECT || 'mailto:admin@taskmaster.dev'
};

if (vapidKeys.publicKey && vapidKeys.privateKey) {
  webpush.setVapidDetails(
    vapidKeys.subject,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
}

// POST - Send push notification to user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is admin (for testing) or system call
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      userId, 
      title, 
      body: notificationBody, 
      icon = '/icon-192x192.png',
      badge = '/icon-72x72.png',
      url = '/',
      tag,
      type = 'general',
      data = {}
    } = body;

    if (!title || !notificationBody) {
      return NextResponse.json(
        { error: 'Title and body are required' },
        { status: 400 }
      );
    }

    // Get target user's push subscriptions
    const targetUserId = userId || (await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    }))?.id;

    if (!targetUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: {
        userId: targetUserId,
        enabled: true
      }
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active push subscriptions found'
      });
    }

    // Prepare notification payload
    const payload = JSON.stringify({
      title,
      body: notificationBody,
      icon,
      badge,
      url,
      tag,
      type,
      data: {
        ...data,
        timestamp: new Date().toISOString()
      }
    });

    // Send to all active subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          
          // Update last used timestamp
          await prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { lastUsedAt: new Date() }
          });
          
          return { success: true, id: sub.id };
        } catch (error: any) {
          // Handle expired subscriptions
          if (error.statusCode === 410) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id }
            });
            return { success: false, id: sub.id, error: 'Subscription expired' };
          }
          
          console.error(`Failed to send to subscription ${sub.id}:`, error);
          return { success: false, id: sub.id, error: error.message };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;

    return NextResponse.json({
      success: true,
      message: `Notification sent to ${successful} device(s)`,
      results: {
        total: results.length,
        successful,
        failed
      }
    });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send notification' },
      { status: 500 }
    );
  }
}