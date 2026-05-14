/**
 * CSRF (Cross-Site Request Forgery) Protection
 * 
 * Generates and validates CSRF tokens for state-changing operations.
 * Tokens are stored in session and validated on POST/PATCH/DELETE requests.
 */

import crypto from 'crypto';

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Validate CSRF token using timing-safe comparison
 * 
 * @param token - Token from request
 * @param expected - Expected token from session
 * @returns true if tokens match
 */
export function validateCsrfToken(token: string | null | undefined, expected: string | null | undefined): boolean {
  if (!token || !expected) return false;
  
  try {
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expected);
    
    if (tokenBuffer.length !== expectedBuffer.length) return false;
    
    return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch {
    return false;
  }
}
