import { NextRequest, NextResponse } from 'next/server';

// GET /api/user/notification-preferences/test - Test endpoint (no auth required)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Notification preferences API is working',
    endpoints: {
      get: 'GET /api/user/notification-preferences',
      update: 'PUT /api/user/notification-preferences'
    },
    note: 'Main endpoints require authentication'
  });
}