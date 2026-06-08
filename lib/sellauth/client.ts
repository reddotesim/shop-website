/**
 * Sellauth API client (server-side only).
 * All credentials are loaded strictly from process.env.
 */
import type { SellauthCheckoutPayload, SellauthCheckoutResponse } from './types';

function getConfig() {
  const apiKey  = process.env.SELLAUTH_API_KEY;
  const shopId  = process.env.SELLAUTH_SHOP_ID;

  if (!apiKey || !shopId) {
    throw new Error(
      'Missing Sellauth configuration. ' +
      'Set SELLAUTH_API_KEY and SELLAUTH_SHOP_ID in your environment.'
    );
  }
  return { apiKey, shopId };
}

/**
 * Create a Sellauth checkout session and return the payment URL.
 */
export async function createCheckout(
  payload: SellauthCheckoutPayload
): Promise<SellauthCheckoutResponse> {
  const { apiKey, shopId } = getConfig();

  const res = await fetch(
    `https://sellauth.com/api/v1/shops/${shopId}/invoices`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body:   JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Sellauth checkout API ${res.status}: ${body}`);
  }

  return res.json() as Promise<SellauthCheckoutResponse>;
}
