// Test API endpoint to verify it's working
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Profile API is working',
    timestamp: new Date().toISOString()
  });
}