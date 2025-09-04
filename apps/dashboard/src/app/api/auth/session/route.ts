import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Return a mock session for demo
  return NextResponse.json({
    user: {
      id: '1',
      email: 'demo@taskmaster.com',
      name: 'Demo User',
      image: null,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  });
}