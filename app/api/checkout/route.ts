/**
 * POST /api/checkout
 *
 * Creates a Sellauth checkout session for a given tariff.
 * Returns { checkoutUrl } to redirect the user to payment.
 *
 * Body: { tariffId, email, orderType, topUpIccid? }
 */
import { NextResponse } from 'next/server';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createCheckout }      from '@/lib/sellauth/client';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      tariffId:    string;
      email:       string;
      orderType?:  'new_esim' | 'top_up';
      topUpIccid?: string;
    };

    const { tariffId, email, orderType = 'new_esim', topUpIccid } = body;

    if (!tariffId || !email) {
      return NextResponse.json(
        { error: 'tariffId and email are required' },
        { status: 400 }
      );
    }

    if (orderType === 'top_up' && !topUpIccid) {
      return NextResponse.json(
        { error: 'topUpIccid is required for top-up orders' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // ── Fetch tariff ─────────────────────────────────────────
    const { data: tariff, error: tariffError } = await serviceClient
      .from('tariffs')
      .select('*')
      .eq('id', tariffId)
      .eq('is_active', true)
      .single();

    if (tariffError || !tariff) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    // ── Get current user (optional – guests can buy too) ────
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    // ── Create pending order ─────────────────────────────────
    const { data: order, error: orderError } = await serviceClient
      .from('orders')
      .insert({
        user_id:        user?.id ?? null,
        tariff_id:      tariffId,
        order_type:     orderType,
        status:         'pending',
        customer_email: email,
        customer_name:  user?.user_metadata?.full_name ?? null,
        amount_eur:     tariff.sale_price_eur,
        usd_eur_rate:   tariff.usd_eur_rate,
        top_up_iccid:   topUpIccid ?? null,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[checkout] Order insert error:', orderError?.message);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // ── Create Sellauth checkout ─────────────────────────────
    const checkout = await createCheckout({
      product_id: tariff.package_code,   // map to your Sellauth product ID
      quantity:   1,
      email,
      custom_fields: {
        order_id:      order.id,
        tariff_id:     tariffId,
        order_type:    orderType,
        ...(topUpIccid ? { top_up_iccid: topUpIccid } : {}),
      },
      success_url: `${appUrl}/success?order=${order.id}`,
      cancel_url:  `${appUrl}/tariffs`,
    });

    // Save the Sellauth invoice/order ID on our order
    await serviceClient
      .from('orders')
      .update({
        sellauth_order_id:   checkout.id,
        sellauth_invoice_id: checkout.id,
        sellauth_product_id: tariff.package_code,
      })
      .eq('id', order.id);

    return NextResponse.json({ checkoutUrl: checkout.url, orderId: order.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[checkout] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
