import { NextRequest, NextResponse } from 'next/server';

// Mock authentication endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Authentication endpoint (demo mode)' 
  });
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Authentication endpoint (demo mode)' 
  });
}