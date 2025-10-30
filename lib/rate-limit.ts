import { Redis } from 'ioredis';

// In-memory store for development (fallback when Redis is not available)
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Redis client (will be null if Redis URL is not provided)
let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL);
  } catch (error) {
    console.warn('Failed to connect to Redis, using in-memory store:', error);
  }
}

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyPrefix?: string; // Prefix for Redis keys
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

/**
 * Rate limit by key (IP, email, user ID, etc.)
 */
export async function rateLimit(
  key: string,
  options: RateLimitOptions
): Promise<RateLimitResult> {
  const { windowMs, maxRequests, keyPrefix = 'rate_limit' } = options;
  const now = Date.now();
  const resetAt = now + windowMs;
  const redisKey = `${keyPrefix}:${key}`;

  if (redisClient) {
    // Use Redis
    try {
      const count = await redisClient.incr(redisKey);
      
      if (count === 1) {
        // First request in window, set expiration
        await redisClient.pexpire(redisKey, windowMs);
      }

      const ttl = await redisClient.pttl(redisKey);
      const reset = Math.floor((now + ttl) / 1000);

      if (count > maxRequests) {
        return {
          success: false,
          limit: maxRequests,
          remaining: 0,
          reset,
        };
      }

      return {
        success: true,
        limit: maxRequests,
        remaining: Math.max(0, maxRequests - count),
        reset,
      };
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fall through to memory store
    }
  }

  // Use in-memory store
  const stored = memoryStore.get(redisKey);
  
  if (!stored || stored.resetAt < now) {
    // New window or expired
    memoryStore.set(redisKey, { count: 1, resetAt });
    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: Math.floor(resetAt / 1000),
    };
  }

  // Increment count
  stored.count += 1;
  
  if (stored.count > maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: Math.floor(stored.resetAt / 1000),
    };
  }

  return {
    success: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - stored.count),
    reset: Math.floor(stored.resetAt / 1000),
  };
}

/**
 * Rate limit by IP address
 */
export async function rateLimitByIP(
  ip: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  return rateLimit(ip, {
    windowMs,
    maxRequests,
    keyPrefix: 'rate_limit:ip',
  });
}

/**
 * Rate limit by email address
 */
export async function rateLimitByEmail(
  email: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  return rateLimit(email.toLowerCase(), {
    windowMs,
    maxRequests,
    keyPrefix: 'rate_limit:email',
  });
}

/**
 * Rate limit by user ID
 */
export async function rateLimitByUser(
  userId: string,
  windowMs: number,
  maxRequests: number
): Promise<RateLimitResult> {
  return rateLimit(userId, {
    windowMs,
    maxRequests,
    keyPrefix: 'rate_limit:user',
  });
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Check various headers (in order of preference)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback (for local development)
  return '127.0.0.1';
}

/**
 * Clean up expired entries from memory store (call periodically)
 */
export function cleanupMemoryStore() {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (value.resetAt < now) {
      memoryStore.delete(key);
    }
  }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupMemoryStore, 5 * 60 * 1000);
}

