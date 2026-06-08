/**
 * PATCH /api/admin/settings
 * Update a system_settings key/value pair.
 */
import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PATCH(request: Request) {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const { key, value } = await request.json() as { key: string; value: string };
  if (!key || value === undefined) {
    return NextResponse.json({ error: 'key and value required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { error } = await db
    .from('system_settings')
    .update({ value })
    .eq('key', key);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
