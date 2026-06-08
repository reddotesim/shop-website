/**
 * GET /api/cron/sync-tariffs
 *
 * Fetches all packages from esimaccess, calculates EUR sale prices,
 * and upserts them into the Supabase tariffs table.
 *
 * Protected by the CRON_SECRET header. Call this daily via:
 *   - Render Cron Jobs (set URL + Authorization header)
 *   - An external scheduler (cron-job.org, etc.)
 *
 * Request header required:
 *   Authorization: Bearer <CRON_SECRET>
 */
import { NextResponse } from 'next/server';
import { fetchAllPackages } from '@/lib/esimaccess/client';
import { calculateSalePrice, fetchUsdEurRate } from '@/lib/pricing';
import { createServiceClient } from '@/lib/supabase/server';
import type { EsimAccessPackage } from '@/lib/esimaccess/types';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mbToGb(mb: number): number {
  return Math.round((mb / 1024) * 1000) / 1000;
}

function getCountryEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌐';
  try {
    return countryCode
      .toUpperCase()
      .split('')
      .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
      .join('');
  } catch {
    return '🌐';
  }
}

export async function GET(request: Request) {
  // ── Auth check ──────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = Date.now();
  const supabase  = createServiceClient();

  try {
    // ── 1. Fetch live exchange rate ──────────────────────────
    const { data: rateRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'usd_eur_rate')
      .single();

    const fallbackRate = rateRow ? parseFloat(rateRow.value) : 0.92;
    const usdEurRate   = await fetchUsdEurRate(fallbackRate);

    // Save updated rate back to system_settings
    await supabase
      .from('system_settings')
      .update({ value: String(usdEurRate) })
      .eq('key', 'usd_eur_rate');

    // ── 2. Fetch packages from esimaccess ──────────────────
    const listRes = await fetchAllPackages();
    if (!listRes.success) {
      throw new Error(`esimaccess API error: ${listRes.errorCode}`);
    }

    const packages: EsimAccessPackage[] =
      listRes.obj?.packageList ?? listRes.obj?.packageInfoList ?? [];

    if (packages.length === 0) {
      return NextResponse.json({ message: 'No packages returned from esimaccess', duration_ms: Date.now() - startedAt });
    }

    // ── 3. Build upsert rows ───────────────────────────────
    const rows = packages.map((pkg) => {
      const ekPriceUsd  = pkg.price;          // USD
      const salePriceEur = calculateSalePrice(ekPriceUsd, usdEurRate);
      const baseSlug    = slugify(`${pkg.locationCode}-${pkg.dataAmount}mb-${pkg.duration}d`);

      return {
        package_code:       pkg.packageCode,
        slug:               `${baseSlug}-${pkg.packageCode}`.substring(0, 100),
        name:               pkg.name || `${pkg.locationName} ${mbToGb(pkg.dataAmount)}GB ${pkg.duration}d`,
        description:        pkg.description || null,
        country_code:       pkg.locationCode?.toUpperCase() ?? 'XX',
        country_name:       pkg.locationName ?? pkg.locationCode,
        region:             null,   // can be enriched later
        flag_emoji:         getCountryEmoji(pkg.locationCode),
        data_gb:            mbToGb(pkg.dataAmount),
        validity_days:      pkg.duration,
        ek_price_usd:       ekPriceUsd,
        sale_price_eur:     salePriceEur,
        usd_eur_rate:       usdEurRate,
        is_active:          true,
        is_top_up_eligible: false,
        raw_data:           pkg as unknown as Record<string, unknown>,
        last_synced_at:     new Date().toISOString(),
      };
    });

    // ── 4. Upsert into Supabase (batch of 100) ─────────────
    const BATCH = 100;
    let upserted = 0;
    let errors   = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await supabase
        .from('tariffs')
        .upsert(batch, { onConflict: 'package_code' });

      if (error) {
        console.error('[sync-tariffs] Upsert error:', error.message);
        errors += batch.length;
      } else {
        upserted += batch.length;
      }
    }

    // Deactivate packages no longer returned by the API
    const activeCodes = packages.map((p) => p.packageCode);
    await supabase
      .from('tariffs')
      .update({ is_active: false })
      .not('package_code', 'in', `(${activeCodes.map((c) => `'${c}'`).join(',')})`);

    const duration = Date.now() - startedAt;
    console.log(`[sync-tariffs] Done. upserted=${upserted} errors=${errors} duration=${duration}ms`);

    return NextResponse.json({
      success:     true,
      upserted,
      errors,
      total:       packages.length,
      usdEurRate,
      duration_ms: duration,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync-tariffs] Fatal error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
