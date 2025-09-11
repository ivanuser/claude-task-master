import { NextRequest, NextResponse } from 'next/server';
import { notificationService } from '@/lib/notifications/notification-service';

// POST /api/notifications/process-queue - Process notification queue (for cron jobs)
export async function POST(request: NextRequest) {
  try {
    // Check for authorization header or API key for cron jobs
    const authHeader = request.headers.get('authorization');
    const apiKey = request.headers.get('x-api-key');
    
    // In production, you'd want to validate this properly
    if (!authHeader && !apiKey) {
      // For now, allow processing without auth for local development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    console.log('Processing notification queue...');
    await notificationService.processQueue();

    return NextResponse.json({
      success: true,
      message: 'Notification queue processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing notification queue:', error);
    return NextResponse.json({ 
      error: 'Failed to process notification queue',
      details: (error as Error).message 
    }, { status: 500 });
  }
}

// GET /api/notifications/process-queue - Get queue status
export async function GET(request: NextRequest) {
  try {
    // This could return queue statistics
    return NextResponse.json({
      message: 'Notification queue processor is available',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ 
      error: 'Failed to get queue status' 
    }, { status: 500 });
  }
}