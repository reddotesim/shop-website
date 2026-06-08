/**
 * POST /api/webhooks/sellauth
 *
 * Receives payment events from Sellauth, verifies the HMAC-SHA256 signature,
 * provisions the eSIM via esimaccess, sends confirmation email, and updates
 * the order in Supabase.
 *
 * This endpoint must be public (no auth) – Sellauth calls it from their servers.
 */
import { NextResponse }            from 'next/server';
import { verifySellauthSignature } from '@/lib/sellauth/webhook';
import { allocateEsim, applyTopUp } from '@/lib/esimaccess/client';
import { createServiceClient }     from '@/lib/supabase/server';
import { sendEsimEmail, sendTopUpEmail } from '@/lib/email/mailer';
import type { SellauthWebhookPayload } from '@/lib/sellauth/types';

export const runtime = 'nodejs';

// Disable Next.js body parsing – we need the raw body for HMAC verification
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // ── 1. Read raw body ─────────────────────────────────────
  const rawBody  = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-sellauth-signature');

  // ── 2. Verify signature ──────────────────────────────────
  let isValid = false;
  try {
    isValid = verifySellauthSignature(rawBody, signature);
  } catch (err) {
    console.error('[webhook/sellauth] Signature verification error:', err);
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!isValid) {
    console.warn('[webhook/sellauth] Invalid signature received');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 3. Parse payload ─────────────────────────────────────
  let payload: SellauthWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as SellauthWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // We only process paid orders
  if (payload.event !== 'order.paid') {
    return NextResponse.json({ received: true, skipped: payload.event });
  }

  const { order: sellauthOrder } = payload;
  const supabase = createServiceClient();

  // ── 4. Find our order ────────────────────────────────────
  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*, tariffs(*)')
    .eq('sellauth_order_id', sellauthOrder.id)
    .single();

  if (findError || !order) {
    // Fallback: look up via custom_fields order_id
    const customOrderId = sellauthOrder.custom_fields?.order_id;
    if (!customOrderId) {
      console.error('[webhook/sellauth] Order not found for Sellauth ID:', sellauthOrder.id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: fallbackOrder } = await supabase
      .from('orders')
      .select('*, tariffs(*)')
      .eq('id', customOrderId)
      .single();

    if (!fallbackOrder) {
      console.error('[webhook/sellauth] Order not found by custom_fields.order_id:', customOrderId);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return processOrder(supabase, fallbackOrder as OrderWithTariff, sellauthOrder);
  }

  return processOrder(supabase, order as OrderWithTariff, sellauthOrder);
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

type OrderWithTariff = {
  id:             string;
  order_type:     'new_esim' | 'top_up';
  status:         string;
  customer_email: string;
  customer_name:  string | null;
  top_up_iccid:   string | null;
  tariffs: {
    package_code:  string;
    name:          string;
    country_name:  string;
    data_gb:       number | null;
    validity_days: number;
    sale_price_eur: number;
  };
};

async function processOrder(
  supabase:       ReturnType<typeof createServiceClient>,
  order:          OrderWithTariff,
  sellauthOrder:  SellauthWebhookPayload['order']
) {
  // Idempotency: skip if already processed
  if (order.status === 'completed') {
    console.log('[webhook/sellauth] Order already completed, skipping:', order.id);
    return NextResponse.json({ received: true, idempotent: true });
  }

  // Mark as paid
  await supabase
    .from('orders')
    .update({
      status:               'paid',
      sellauth_order_id:    sellauthOrder.id,
      payment_confirmed_at: sellauthOrder.paid_at ?? new Date().toISOString(),
    })
    .eq('id', order.id);

  // Mark as provisioning
  await supabase
    .from('orders')
    .update({ status: 'provisioning' })
    .eq('id', order.id);

  try {
    if (order.order_type === 'new_esim') {
      // ── Provision new eSIM ─────────────────────────────
      const esimRes = await allocateEsim(order.tariffs.package_code, order.id);

      if (!esimRes.success) {
        throw new Error(`esimaccess allocation failed: ${esimRes.errorCode}`);
      }

      const esim = esimRes.obj;

      await supabase
        .from('orders')
        .update({
          status:          'completed',
          iccid:           esim.iccid,
          qr_code_url:     esim.qrCodeUrl,
          activation_code: esim.matchingId,
          smdp_address:    esim.smdpAddress,
          apn:             esim.apn,
        })
        .eq('id', order.id);

      // Send confirmation email
      await sendEsimEmail({
        to:             order.customer_email,
        customerName:   order.customer_name ?? undefined,
        tariffName:     order.tariffs.name,
        countryName:    order.tariffs.country_name,
        dataGb:         order.tariffs.data_gb ?? 0,
        validityDays:   order.tariffs.validity_days,
        priceEur:       order.tariffs.sale_price_eur,
        iccid:          esim.iccid,
        qrCodeUrl:      esim.qrCodeUrl,
        activationCode: esim.matchingId,
        smdpAddress:    esim.smdpAddress,
        apn:            esim.apn,
        lpaCode:        esim.lpaCode ?? '',
        orderId:        order.id,
      });

      console.log(`[webhook/sellauth] eSIM provisioned: order=${order.id} iccid=${esim.iccid}`);
    } else if (order.order_type === 'top_up') {
      // ── Apply top-up ───────────────────────────────────
      if (!order.top_up_iccid) {
        throw new Error('top_up_iccid is missing on the order');
      }

      await applyTopUp(
        order.top_up_iccid,
        order.tariffs.package_code,
        order.id
      );

      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      await sendTopUpEmail({
        to:           order.customer_email,
        customerName: order.customer_name ?? undefined,
        iccid:        order.top_up_iccid,
        tariffName:   order.tariffs.name,
        dataGb:       order.tariffs.data_gb ?? 0,
        validityDays: order.tariffs.validity_days,
        priceEur:     order.tariffs.sale_price_eur,
        orderId:      order.id,
      });

      console.log(`[webhook/sellauth] Top-up applied: order=${order.id} iccid=${order.top_up_iccid}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[webhook/sellauth] Provisioning error:', message);

    await supabase
      .from('orders')
      .update({ status: 'failed', error_message: message })
      .eq('id', order.id);

    // Return 200 to Sellauth so it doesn't keep retrying –
    // failed orders need manual handling.
    return NextResponse.json({
      received: true,
      error:    message,
      orderId:  order.id,
    });
  }

  return NextResponse.json({ received: true, orderId: order.id });
}
