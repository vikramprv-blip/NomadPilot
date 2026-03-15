import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limiters for different routes
export const limiters = {
  // Beta signup — 5 attempts per IP per hour
  beta: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '1 h'),
    prefix: 'rl:beta',
  }),

  // Approve endpoint — 30 per minute (admin use)
  approve: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, '1 m'),
    prefix: 'rl:approve',
  }),

  // AI/chat routes — 20 requests per minute per IP
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:ai',
  }),

  // General API — 60 per minute
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'rl:general',
  }),
};

// Helper — call this at the top of any API route
export async function checkRateLimit(
  req: NextRequest,
  limiter: Ratelimit
): Promise<NextResponse | null> {
  // Get IP from Vercel header or fallback
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';

  const { success, limit, remaining, reset } = await limiter.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset':     reset.toString(),
          'Retry-After':           Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  return null; // null means allowed through
}
