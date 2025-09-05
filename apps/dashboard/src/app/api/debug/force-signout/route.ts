import { NextResponse } from "next/server";
import { cookies } from 'next/headers';

export async function POST() {
  try {
    const response = NextResponse.json({ 
      message: 'Force signout completed',
      timestamp: new Date().toISOString()
    });
    
    // Clear all possible NextAuth cookies with different variations
    const cookieNames = [
      'next-auth.session-token',
      'next-auth.csrf-token', 
      'next-auth.callback-url',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.pkce.code_verifier',
      'next-auth.state'
    ];
    
    cookieNames.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
    });
    
    // Also clear with different path variations
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/api/auth',
      httpOnly: true
    });
    
    return response;
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}