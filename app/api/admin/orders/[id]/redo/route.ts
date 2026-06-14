/**
 * POST /api/admin/orders/[id]/redo
 *
 * Protected by Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 * Triggers manual fulfillment for a paid or failed order.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrder } from '@/lib/fulfillment';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the storefront' },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== `Bearer ${serviceRoleKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    
    // Check if order exists
    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('status')
      .eq('id', id)
      .single();

    if (findError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // fulfillOrder handles the status checks, esim allocation retry, and emailing.
    const result = await fulfillOrder(supabase, id);
    
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error || 'Fulfillment execution failed' },
        { status: 500 }
      );
    }

    // Fetch the updated order details (including ICCID, QR code, and final status)
    const { data: updatedOrder } = await supabase
      .from('orders')
      .select('*, tariffs(*)')
      .eq('id', id)
      .single();

    return NextResponse.json({ success: true, result, order: updatedOrder });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[admin/orders/redo] manual fulfillment error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
