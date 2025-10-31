/**
 * IP-BASED RATE LIMITER for PUBLIC endpoints
 * 
 * Diferença do rate-limiter.ts:
 * - Este: Por IP (público, sem auth)
 * - Outro: Por CPF (autenticado, com DB)
 * 
 * Usage:
 * ```typescript
 * import { RateLimiters } from '../_shared/rate-limiter-ip.ts';
 * 
 * // No início da função
 * await RateLimiters.publicAPI.check(req);
 * ```
 */

interface RateLimitRecord {
  count: number;
  expiresAt: number; // timestamp
}

// In-memory store (resets on cold start - acceptable for public endpoints)
const store = new Map<string, RateLimitRecord>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.expiresAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Get client IP from request headers
 */
function getClientIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') || // Cloudflare
    'anonymous'
  );
}

/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  message?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later.',
    keyGenerator = getClientIP,
  } = config;

  return {
    /**
     * Check if request should be rate limited
     * @throws {Response} 429 if rate limit exceeded
     */
    async check(req: Request): Promise<void> {
      const key = keyGenerator(req);
      const now = Date.now();
      const expiresAt = now + windowMs;

      const record = store.get(key);

      // No record or expired
      if (!record || record.expiresAt < now) {
        store.set(key, { count: 1, expiresAt });
        return;
      }

      // Rate limit exceeded
      if (record.count >= max) {
        const retryAfter = Math.ceil((record.expiresAt - now) / 1000);
        
        console.warn(`🚫 Rate limit exceeded for ${key}: ${record.count}/${max} requests`);

        throw new Response(
          JSON.stringify({
            error: message,
            retryAfter,
            limit: max,
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': max.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': new Date(record.expiresAt).toISOString(),
            },
          }
        );
      }

      // Increment count
      record.count++;
      store.set(key, record);
    },

    /**
     * Get current rate limit info
     */
    getInfo(req: Request): {
      limit: number;
      remaining: number;
      reset: Date | null;
    } {
      const key = keyGenerator(req);
      const record = store.get(key);
      const now = Date.now();

      if (!record || record.expiresAt < now) {
        return { limit: max, remaining: max, reset: null };
      }

      return {
        limit: max,
        remaining: Math.max(0, max - record.count),
        reset: new Date(record.expiresAt),
      };
    },
  };
}

/**
 * Preset rate limiters for common public use cases
 */
export const RateLimiters = {
  /**
   * Strict: 10 requests/minute
   * Use for: Sensitive public endpoints
   */
  strict: createRateLimiter({
    windowMs: 60000,
    max: 10,
    message: 'Rate limit exceeded. Maximum 10 requests per minute.',
  }),

  /**
   * Moderate: 30 requests/minute
   * Use for: Standard public APIs
   */
  moderate: createRateLimiter({
    windowMs: 60000,
    max: 30,
    message: 'Rate limit exceeded. Maximum 30 requests per minute.',
  }),

  /**
   * Lenient: 100 requests/minute
   * Use for: High-traffic public endpoints
   */
  lenient: createRateLimiter({
    windowMs: 60000,
    max: 100,
    message: 'Rate limit exceeded. Maximum 100 requests per minute.',
  }),

  /**
   * Public API: 5 requests/minute
   * Use for: Unauthenticated/anonymous access
   * RECOMMENDED FOR KANBAN PUBLIC
   */
  publicAPI: createRateLimiter({
    windowMs: 60000,
    max: 5,
    message: 'Too many requests from this IP. Please try again in 1 minute.',
  }),
};

/**
 * Wrapper for easy integration
 */
export function withRateLimit(
  limiter: ReturnType<typeof createRateLimiter>,
  handler: (req: Request) => Promise<Response>
) {
  return async (req: Request): Promise<Response> => {
    try {
      await limiter.check(req);
      return await handler(req);
    } catch (error) {
      if (error instanceof Response) {
        return error;
      }
      throw error;
    }
  };
}
