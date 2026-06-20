import { NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { getAppOrigin, isProduction } from './env';

const buckets = new Map();
const upstashLimiters = new Map();

export function assertSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;

  if (request.url) {
    const requestOrigin = new URL(request.url).origin;
    if (origin === requestOrigin) return;
  }

  const expected = getAppOrigin();
  if (!expected) {
    if (isProduction()) {
      const error = new Error('APP_ORIGIN must be configured for production writes');
      error.status = 500;
      throw error;
    }
    return;
  }

  if (origin !== expected) {
    const error = new Error('Request origin is not allowed');
    error.status = 403;
    throw error;
  }
}

function getUpstashLimiter(limit, windowMs) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  const key = `${limit}:${windowMs}`;
  if (!upstashLimiters.has(key)) {
    upstashLimiters.set(key, new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${Math.ceil(windowMs / 1000)} s`),
      analytics: false
    }));
  }
  return upstashLimiters.get(key);
}

export async function rateLimit(key, { limit, windowMs }) {
  const remoteLimiter = getUpstashLimiter(limit, windowMs);
  if (remoteLimiter) {
    const result = await remoteLimiter.limit(key);
    if (!result.success) {
      const error = new Error('Too many requests. Please wait before trying again.');
      error.status = 429;
      throw error;
    }
    return;
  }

  if (isProduction()) {
    const error = new Error('Upstash Redis environment variables are required for production rate limiting');
    error.status = 500;
    throw error;
  }

  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > limit) {
    const error = new Error('Too many requests. Please wait before trying again.');
    error.status = 429;
    throw error;
  }
}

export function jsonError(error) {
  const status = error.status || 500;
  return NextResponse.json(
    {
      error: error.message || 'Unexpected server error'
    },
    { status }
  );
}
