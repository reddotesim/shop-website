import type { Metadata }      from 'next';
import { notFound, redirect } from 'next/navigation';
import Link                    from 'next/link';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur, formatGb } from '@/lib/utils';

export const metadata: Metadata = { title: 'Bestelldetails' };
export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('*, tariffs(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!order) notFound();

  const tariff = (order as any).tariffs;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:text-brand-800">← Mein Bereich</Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Bestelldetails</h1>

      {/* Tariff info */}
      {tariff && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{tariff.flag_emoji ?? '🌐'}</span>
            <div>
              <p className="font-bold text-slate-800">{tariff.country_name}</p>
              <p className="text-sm text-slate-500">{tariff.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-slate-500">Daten</p><p className="font-medium">{formatGb(tariff.data_gb)}</p></div>
            <div><p className="text-slate-500">Gültigkeit</p><p className="font-medium">{tariff.validity_days} Tage</p></div>
            <div><p className="text-slate-500">Bezahlt</p><p className="font-medium">{formatEur(order.amount_eur)}</p></div>
            <div><p className="text-slate-500">Status</p><p className="font-medium capitalize">{order.status}</p></div>
          </div>
        </div>
      )}

      {/* eSIM data */}
      {order.iccid && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold text-slate-800 mb-4">📱 Aktivierungsdaten</h2>

          {order.qr_code_url && (
            <div className="mb-4 flex justify-center">
              <div className="rounded-xl bg-brand-50 p-4 text-center border border-brand-100">
                <img src={order.qr_code_url} alt="QR Code" width={160} height={160} className="rounded-lg" />
                <p className="text-xs text-slate-500 mt-2">QR-Code scannen</p>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            {[
              { label: 'ICCID',              value: order.iccid },
              { label: 'SM-DP+ Adresse',     value: order.smdp_address },
              { label: 'Aktivierungscode',   value: order.activation_code },
              { label: 'APN',                value: order.apn },
            ].filter((r) => r.value).map((row) => (
              <div key={row.label} className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0">
                <span className="text-slate-500 font-medium shrink-0 mr-4">{row.label}</span>
                <span className="font-mono text-xs text-slate-800 text-right break-all">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {order.iccid && (
          <Link
            href={`/topup?iccid=${order.iccid}`}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            📶 eSIM aufladen
          </Link>
        )}
        <Link
          href="/tariffs"
          className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Neue eSIM kaufen
        </Link>
      </div>
    </div>
  );
}
