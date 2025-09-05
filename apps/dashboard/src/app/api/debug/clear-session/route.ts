import { NextRequest, NextResponse } from "next/server";
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const cookieStore = cookies();
    
    // Get all NextAuth cookies
    const nextAuthCookies = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];
    
    // Clear all NextAuth cookies
    const response = NextResponse.json({ 
      message: 'Session cookies cleared',
      timestamp: new Date().toISOString()
    });
    
    nextAuthCookies.forEach(cookieName => {
      response.cookies.delete(cookieName);
      response.cookies.set(cookieName, '', { 
        expires: new Date(0),
        path: '/',
        httpOnly: true
      });
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}