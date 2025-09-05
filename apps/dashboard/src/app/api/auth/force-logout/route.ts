import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Create response with redirect to home
    const response = NextResponse.json({ 
      message: 'Force logout completed',
      redirect: '/',
      timestamp: new Date().toISOString()
    });
    
    // Force delete all possible NextAuth cookies
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
    
    // Set cookies to expire immediately with all possible configurations
    cookieNames.forEach(cookieName => {
      // Standard deletion
      response.cookies.delete(cookieName);
      
      // Force expire with different configurations
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        maxAge: -1,
        path: '/',
        domain: undefined,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      // Also try with /api/auth path
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        maxAge: -1,
        path: '/api/auth',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      
      // Also try with root domain for cloudflare
      response.cookies.set(cookieName, '', {
        expires: new Date(0),
        maxAge: -1,
        path: '/',
        domain: '.honercloud.com',
        httpOnly: true,
        secure: true,
        sameSite: 'lax'
      });
    });
    
    return response;
  } catch (error) {
    console.error('Force logout error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}