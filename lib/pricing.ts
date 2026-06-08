/**
 * Pricing calculation for eSIM tariffs.
 *
 * Formula:
 *   1. Take EK price in USD
 *   2. Multiply by 2  (EK_USD × 2)
 *   3. Convert USD → EUR  (× usdEurRate)
 *   4. Round UP to the nearest x.x9 € cent
 *      e.g. 4.12 → 4.19 | 4.21 → 4.29 | 4.01 → 4.09 | 4.19 → 4.19
 */

/**
 * Round a price up to the nearest x.x9 € boundary.
 * Works by converting to cents, ceiling-dividing to the next 10-cent block,
 * then subtracting 1 cent to land on x.x9.
 *
 * Examples:
 *   4.12 → 419 cents → ceil(419/10)*10 - 1 = 420 - 1 = 419 → 4.19 ✓
 *   4.21 → 421 cents → ceil(421/10)*10 - 1 = 430 - 1 = 429 → 4.29 ✓
 *   4.01 → 401 cents → ceil(401/10)*10 - 1 = 410 - 1 = 409 → 4.09 ✓
 *   4.19 → 419 cents → ceil(419/10)*10 - 1 = 420 - 1 = 419 → 4.19 ✓  (already x.x9)
 *   4.09 → 409 cents → ceil(409/10)*10 - 1 = 410 - 1 = 409 → 4.09 ✓  (already x.x9)
 *   4.20 → 420 cents → ceil(420/10)*10 - 1 = 420 - 1 = 419 → 4.19 ✓
 *   4.29 → 429 cents → ceil(429/10)*10 - 1 = 430 - 1 = 429 → 4.29 ✓
 *   4.30 → 430 cents → ceil(430/10)*10 - 1 = 430 - 1 = 429 → 4.29 ✓
 */
export function roundToXX9(rawEur: number): number {
  const cents    = Math.round(rawEur * 100);        // avoid floating-point drift
  const rounded  = Math.ceil(cents / 10) * 10 - 1;  // next x9 boundary
  return rounded / 100;
}

/**
 * Calculate the EUR sale price from a USD EK price.
 *
 * @param ekPriceUsd  - Raw EK price in USD from esimaccess
 * @param usdEurRate  - Current USD→EUR exchange rate (e.g. 0.92)
 * @returns           - Final EUR sale price, rounded to x.x9
 */
export function calculateSalePrice(ekPriceUsd: number, usdEurRate: number): number {
  const doubled   = ekPriceUsd * 2;
  const inEur     = doubled * usdEurRate;
  return roundToXX9(inEur);
}

/**
 * Fetch the live USD→EUR exchange rate.
 * Falls back to the provided fallbackRate if the API call fails.
 */
export async function fetchUsdEurRate(fallbackRate: number): Promise<number> {
  const apiUrl = process.env.EXCHANGE_RATE_API_URL;
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiUrl) return fallbackRate;

  try {
    const url = apiKey ? `${apiUrl}?apikey=${apiKey}` : apiUrl;
    const res  = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);

    const data = await res.json();

    // Support Open Exchange Rates format: { rates: { EUR: 0.92 } }
    // and Open Exchange Rates v6 format:  { conversion_rates: { EUR: 0.92 } }
    const rate =
      data?.rates?.EUR ??
      data?.conversion_rates?.EUR ??
      data?.result?.EUR ??
      null;

    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Unexpected exchange rate API response format');
    }

    console.log(`[pricing] Live USD/EUR rate: ${rate}`);
    return rate;
  } catch (err) {
    console.warn(
      `[pricing] Failed to fetch live exchange rate, using fallback ${fallbackRate}:`,
      err
    );
    return fallbackRate;
  }
}
