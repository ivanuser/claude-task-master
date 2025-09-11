import { NextRequest, NextResponse } from 'next/server';

// Check notification configuration status
export async function GET(request: NextRequest) {
  try {
    // Check email configuration
    const emailConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    );

    // Check push notification configuration
    const pushConfigured = !!(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
    );

    // Check WebSocket/SSE configuration
    const realtimeConfigured = true; // WebSocket is always available

    return NextResponse.json({
      email: {
        configured: emailConfigured,
        host: emailConfigured ? process.env.SMTP_HOST : null,
        port: emailConfigured ? process.env.SMTP_PORT : null,
        from: emailConfigured ? process.env.SMTP_FROM : null
      },
      push: {
        configured: pushConfigured,
        vapidPublicKey: pushConfigured ? process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY : null
      },
      realtime: {
        configured: realtimeConfigured,
        websocket: true,
        sse: true
      },
      features: {
        emailNotifications: emailConfigured,
        pushNotifications: pushConfigured,
        teamInvitations: emailConfigured,
        dailyDigest: emailConfigured,
        quietHours: true,
        unsubscribe: true
      }
    });
  } catch (error) {
    console.error('Error checking notification config:', error);
    return NextResponse.json(
      { error: 'Failed to check notification configuration' },
      { status: 500 }
    );
  }
}