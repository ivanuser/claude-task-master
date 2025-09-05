import { LRUCache } from 'lru-cache';
import { NextRequest, NextResponse } from 'next/server';

type RateLimitOptions = {
  uniqueTokenPerInterval?: number;
  interval?: number;
  limit?: number;
};

export function rateLimit(options?: RateLimitOptions) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000, // 60 seconds default
  });

  return {
    check: async (request: NextRequest, limit?: number) => {
      const effectiveLimit = limit || options?.limit || 10;
      const token = getIPAddress(request) || 'anonymous';
      const tokenCount = (tokenCache.get(token) as number[]) || [0];
      
      if (tokenCount[0] === 0) {
        tokenCache.set(token, [1]);
      } else {
        tokenCache.set(token, [tokenCount[0] + 1]);
      }

      const currentUsage = tokenCache.get(token) as number[];
      const isRateLimited = currentUsage[0] > effectiveLimit;

      return {
        success: !isRateLimited,
        limit: effectiveLimit,
        remaining: Math.max(0, effectiveLimit - currentUsage[0]),
        reset: new Date(Date.now() + (options?.interval || 60000)),
      };
    },
  };
}

function getIPAddress(request: NextRequest): string | undefined {
  const xff = request.headers.get('x-forwarded-for');
  const xri = request.headers.get('x-real-ip');
  const cfIp = request.headers.get('cf-connecting-ip');
  
  if (xff) {
    return xff.split(',')[0].trim();
  }
  
  if (xri) {
    return xri.trim();
  }
  
  if (cfIp) {
    return cfIp.trim();
  }
  
  return undefined;
}

// Pre-configured limiters for different endpoints
export const authLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  limit: 5, // 5 requests per minute
  uniqueTokenPerInterval: 500,
});

export const apiLimiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  limit: 100, // 100 requests per minute
  uniqueTokenPerInterval: 500,
});

export const strictLimiter = rateLimit({
  interval: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 requests per hour
  uniqueTokenPerInterval: 500,
});