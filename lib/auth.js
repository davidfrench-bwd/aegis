import crypto from 'crypto';

/**
 * Verifies internal trigger secret for protected endpoints.
 * 
 * @param {string} authHeader - Authorization header value
 * @returns {boolean} - true if authorized, false otherwise
 */
export function verifyInternalSecret(authHeader) {
  const secret = process.env.INTERNAL_TRIGGER_SECRET;
  
  if (!secret) {
    console.error('INTERNAL_TRIGGER_SECRET is not set in environment');
    return false;
  }
  
  if (!authHeader) {
    return false;
  }
  
  const parts = authHeader.split('Bearer ');
  if (parts.length !== 2) {
    return false;
  }
  
  const token = parts[1];
  
  // Use timing-safe comparison
  const secretBuffer = Buffer.from(secret);
  const tokenBuffer = Buffer.from(token);
  
  if (secretBuffer.length !== tokenBuffer.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(secretBuffer, tokenBuffer);
}