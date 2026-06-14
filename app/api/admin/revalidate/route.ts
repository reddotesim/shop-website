import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  // Authorization check (M2M POST)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Revalidate storefront landing, tariff pages, and destinations API
    revalidatePath('/');
    revalidatePath('/tariffs');
    revalidatePath('/api/destinations');
    
    console.log('[Revalidation] Storefront paths revalidated successfully.');
    return NextResponse.json({ success: true, revalidated: ['/', '/tariffs', '/api/destinations'] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Revalidation] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
