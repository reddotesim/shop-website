/**
 * PATCH /api/admin/orders/[id]
 * Update an order's status or fields.
 */
import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await request.json() as Record<string, unknown>;

  const db = createServiceClient();
  const { data, error } = await db
    .from('orders')
    .update(body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ order: data });
}
