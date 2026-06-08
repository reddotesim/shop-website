/**
 * Sellauth webhook signature verification.
 *
 * Sellauth signs each webhook request with HMAC-SHA256:
 *   signature = HMAC-SHA256(rawBody, SELLAUTH_WEBHOOK_SECRET)
 * The signature is sent in the "X-Sellauth-Signature" header as a hex string.
 */
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify an incoming Sellauth webhook request.
 *
 * @param rawBody   - The raw request body as a Buffer (do NOT parse JSON first)
 * @param signature - The value of the X-Sellauth-Signature header
 * @returns         - true if the signature is valid
 */
export function verifySellauthSignature(
  rawBody:   Buffer,
  signature: string | null
): boolean {
  if (!signature) return false;

  const secret = process.env.SELLAUTH_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error('SELLAUTH_WEBHOOK_SECRET is not configured.');
  }

  const expected = createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected,  'hex')
    );
  } catch {
    // Buffers of different length → invalid
    return false;
  }
}
