import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Clear any server-side caches
  const response = NextResponse.json({ 
    success: true, 
    message: 'Cache cleared successfully',
    timestamp: new Date().toISOString()
  });

  // Add cache control headers to prevent caching
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  response.headers.set('Surrogate-Control', 'no-store');

  return response;
}

export async function GET(request: NextRequest) {
  return POST(request);
}