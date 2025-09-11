import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

// Health check endpoint
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Check database connectivity
    let dbHealthy = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbHealthy = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    // Get process uptime
    const uptime = process.uptime();
    const uptimeHours = Math.floor(uptime / 3600);
    const uptimeMinutes = Math.floor((uptime % 3600) / 60);
    const uptimeSeconds = Math.floor(uptime % 60);
    const uptimeFormatted = `${uptimeHours}h ${uptimeMinutes}m ${uptimeSeconds}s`;

    // Check notification services
    const emailConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASSWORD
    );

    const pushConfigured = !!(
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY
    );

    // Build health status
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptimeFormatted,
      uptimeSeconds: uptime,
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        database: dbHealthy ? 'healthy' : 'unhealthy',
        email: emailConfigured ? 'configured' : 'not configured',
        push: pushConfigured ? 'configured' : 'not configured',
        cache: process.env.ENABLE_CACHE === 'true' ? 'enabled' : 'disabled'
      },
      version: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
    };

    // Return appropriate status code
    const statusCode = dbHealthy ? 200 : 503;

    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
        responseTime: `${Date.now() - startTime}ms`
      },
      { status: 503 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { status: 200 })
}