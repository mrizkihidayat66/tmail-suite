const attempts = new Map<string, { count: number; resetAt: number }>();
const apiKeyAttempts = new Map<string, { count: number; resetAt: number }>();

const MAX_ATTEMPTS = 10;
const WINDOW_MS = 15 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

// API Key rate limits (generous for tmail's email sync operations)
// Typical usage: 50 accounts × 8 requests/sync × 4 syncs/hour = ~1,600 req/hour
// Limit set to 10,000 to accommodate heavy usage and burst traffic
const API_KEY_MAX_REQUESTS = 10000; // 10,000 requests per hour
const API_KEY_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

if (typeof setInterval !== "undefined") {
  const interval = setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of attempts) {
      if (now > entry.resetAt) attempts.delete(ip);
    }
    for (const [keyId, entry] of apiKeyAttempts) {
      if (now > entry.resetAt) apiKeyAttempts.delete(keyId);
    }
  }, CLEANUP_INTERVAL_MS);
  
  // unref() is only available in Node.js, not in browser/jsdom
  if (typeof interval === 'object' && 'unref' in interval && typeof interval.unref === 'function') {
    interval.unref();
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = attempts.get(ip);

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true };
}

export function resetRateLimit(ip: string): void {
  attempts.delete(ip);
}

/**
 * Check rate limit for API key usage
 * @param keyId - The API key ID (not the raw key)
 * @returns Object with allowed status and optional retryAfter seconds
 */
export function checkApiKeyRateLimit(keyId: string): { 
  allowed: boolean; 
  retryAfter?: number;
  remaining?: number;
  limit?: number;
  resetAt?: number;
} {
  const now = Date.now();
  const entry = apiKeyAttempts.get(keyId);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + API_KEY_WINDOW_MS;
    apiKeyAttempts.set(keyId, { count: 1, resetAt });
    return { 
      allowed: true, 
      remaining: API_KEY_MAX_REQUESTS - 1,
      limit: API_KEY_MAX_REQUESTS,
      resetAt
    };
  }

  if (entry.count >= API_KEY_MAX_REQUESTS) {
    return { 
      allowed: false, 
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
      remaining: 0,
      limit: API_KEY_MAX_REQUESTS,
      resetAt: entry.resetAt
    };
  }

  entry.count++;
  return { 
    allowed: true,
    remaining: API_KEY_MAX_REQUESTS - entry.count,
    limit: API_KEY_MAX_REQUESTS,
    resetAt: entry.resetAt
  };
}

/**
 * Reset rate limit for a specific API key
 * @param keyId - The API key ID to reset
 */
export function resetApiKeyRateLimit(keyId: string): void {
  apiKeyAttempts.delete(keyId);
}

/**
 * Get current rate limit status for an API key without incrementing
 * @param keyId - The API key ID to check
 */
export function getApiKeyRateLimitStatus(keyId: string): {
  remaining: number;
  limit: number;
  resetAt: number;
} {
  const now = Date.now();
  const entry = apiKeyAttempts.get(keyId);

  if (!entry || now > entry.resetAt) {
    return {
      remaining: API_KEY_MAX_REQUESTS,
      limit: API_KEY_MAX_REQUESTS,
      resetAt: now + API_KEY_WINDOW_MS
    };
  }

  return {
    remaining: Math.max(0, API_KEY_MAX_REQUESTS - entry.count),
    limit: API_KEY_MAX_REQUESTS,
    resetAt: entry.resetAt
  };
}
