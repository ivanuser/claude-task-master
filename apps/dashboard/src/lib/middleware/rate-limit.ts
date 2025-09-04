import { NextRequest, NextResponse } from 'next/server';
import { LRUCache } from 'lru-cache';

interface RateLimitOptions {
  interval?: number; // Time window in milliseconds
  uniqueTokenPerInterval?: number; // Max number of unique tokens per interval
}

interface RateLimitResult {
  limit: number;
  remaining: number;
  reset: number;
  allowed: boolean;
}

export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60 * 1000, // Default 1 minute
  });

  return async function rateLimitMiddleware(
    request: NextRequest,
    token: string
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const interval = options?.interval || 60 * 1000;
    const limit = 100; // Requests per interval
    
    const tokenData = tokenCache.get(token) || [];
    const windowStart = now - interval;
    
    // Filter out old requests outside the window
    const recentRequests = tokenData.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= limit) {
      return {
        limit,
        remaining: 0,
        reset: Math.min(...recentRequests) + interval,
        allowed: false,
      };
    }
    
    // Add current request
    recentRequests.push(now);
    tokenCache.set(token, recentRequests);
    
    return {
      limit,
      remaining: limit - recentRequests.length,
      reset: now + interval,
      allowed: true,
    };
  };
}

// Helper function to get client identifier
export function getClientId(request: NextRequest): string {
  // Try to get from various headers
  const forwarded = request.headers.get('x-forwarded-for');
  const real = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || real || 'unknown';
  
  // Could also use API key if present
  const apiKey = request.headers.get('x-api-key');
  
  return apiKey || ip;
}

// Middleware wrapper for API routes
export async function withRateLimit(
  request: NextRequest,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> {
  const rateLimiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
  });
  
  const clientId = getClientId(request);
  const { allowed, limit, remaining, reset } = await rateLimiter(request, clientId);
  
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: new Date(reset).toISOString(),
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }
  
  // Add rate limit headers to successful response
  const response = await handler();
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', reset.toString());
  
  return response;
}

// Per-endpoint rate limiting configuration
export const rateLimiters = {
  // Strict limits for auth endpoints
  auth: rateLimit({
    interval: 15 * 60 * 1000, // 15 minutes
    uniqueTokenPerInterval: 100,
  }),
  
  // Standard API limits
  api: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500,
  }),
  
  // Relaxed limits for read-only operations
  read: rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 1000,
  }),
  
  // Strict limits for write operations
  write: rateLimit({
    interval: 60 * 1000, // 1 minute  
    uniqueTokenPerInterval: 200,
  }),
};