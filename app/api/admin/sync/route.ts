/**
 * POST /api/admin/sync
 *
 * Triggers the tariff sync from the Admin UI.
 * Verifies admin session, then calls the cron endpoint internally
 * so all sync logic stays in one place.
 */
import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';

export const runtime = 'nodejs';

export async function POST() {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  try {
    const res = await fetch(`${appUrl}/api/cron/sync-tariffs`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${cronSecret}` },
      // Allow up to 5 minutes for a full sync
      signal: AbortSignal.timeout(290_000),
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json({ error: data.error ?? 'Sync failed', detail: data }, { status: 502 });
    }

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
