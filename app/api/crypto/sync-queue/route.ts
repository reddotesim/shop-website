import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/crypto/sync-queue
 * Returns the list of addresses queued for synchronization.
 */
export async function GET(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceClient();
    const { data, error } = await db
      .from('system_settings')
      .select('value')
      .eq('key', 'crypto_sync_queue')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let queue: string[] = [];
    if (data?.value) {
      try {
        queue = JSON.parse(data.value);
      } catch {
        queue = [];
      }
    }

    return NextResponse.json({ queue: Array.isArray(queue) ? queue : [] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync-queue GET] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST /api/crypto/sync-queue
 * Removes processed addresses from the synchronization queue.
 */
export async function POST(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { addresses } = body;

    const db = createServiceClient();
    const { data } = await db
      .from('system_settings')
      .select('value')
      .eq('key', 'crypto_sync_queue')
      .maybeSingle();

    let queue: string[] = [];
    if (data?.value) {
      try {
        queue = JSON.parse(data.value);
      } catch {
        queue = [];
      }
    }

    if (!Array.isArray(queue)) {
      queue = [];
    }

    if (Array.isArray(addresses)) {
      queue = queue.filter(addr => !addresses.includes(addr));
    } else {
      queue = [];
    }

    const { error: saveError } = await db
      .from('system_settings')
      .upsert({
        key: 'crypto_sync_queue',
        value: JSON.stringify(queue),
        description: 'Queue of crypto addresses needing synchronization'
      });

    if (saveError) {
      return NextResponse.json({ error: saveError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: queue.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[sync-queue POST] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
