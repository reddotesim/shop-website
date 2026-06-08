import type { Metadata }      from 'next';
import { redirect }            from 'next/navigation';
import Link                    from 'next/link';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur, formatGb } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mein Bereich' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const service = createServiceClient();

  // Fetch user's orders with tariff details
  const { data: orders } = await service
    .from('orders')
    .select('*, tariffs(name, country_name, data_gb, validity_days, flag_emoji)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const orderList = orders ?? [];
  const completed = orderList.filter((o) => o.status === 'completed');
  const pending   = orderList.filter((o) => ['pending', 'paid', 'provisioning'].includes(o.status));

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Mein Bereich</h1>
          <p className="text-slate-500 text-sm mt-1">{user.email}</p>
        </div>
        <Link
          href="/tariffs"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          + Neue eSIM
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{orderList.length}</p>
          <p className="text-xs text-slate-500 mt-1">Bestellungen</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
          <p className="text-xs text-slate-500 mt-1">Aktiv</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">
            {formatEur(orderList.reduce((s, o) => s + (o.amount_eur ?? 0), 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">Gesamt ausgegeben</p>
        </div>
      </div>

      {/* Pending orders */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h2 className="font-semibold text-slate-800 mb-3">⏳ In Bearbeitung</h2>
          <div className="space-y-3">
            {pending.map((order) => (
              <OrderRow key={order.id} order={order} />
            ))}
          </div>
        </div>
      )}

      {/* Completed orders */}
      <div>
        <h2 className="font-semibold text-slate-800 mb-3">📱 Meine eSIMs</h2>
        {orderList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
            <p className="text-4xl mb-3">📡</p>
            <p className="font-medium">Noch keine Bestellungen</p>
            <Link href="/tariffs" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-800">
              Erste eSIM kaufen →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((order) => (
              <OrderRow key={order.id} order={order} showEsim />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type OrderType = {
  id:             string;
  status:         string;
  order_type:     string;
  amount_eur:     number;
  iccid:          string | null;
  qr_code_url:    string | null;
  activation_code: string | null;
  smdp_address:   string | null;
  apn:            string | null;
  top_up_iccid:   string | null;
  created_at:     string;
  tariffs:        { name: string; country_name: string; data_gb: number | null; validity_days: number; flag_emoji: string | null } | null;
};

function statusBadge(status: string) {
  const map: Record<string, string> = {
    completed:    'bg-green-100 text-green-700',
    paid:         'bg-amber-100 text-amber-700',
    provisioning: 'bg-amber-100 text-amber-700',
    pending:      'bg-slate-100 text-slate-600',
    failed:       'bg-red-100 text-red-700',
    refunded:     'bg-purple-100 text-purple-700',
  };
  const labels: Record<string, string> = {
    completed:    'Aktiv',
    paid:         'Bezahlt',
    provisioning: 'Wird aktiviert',
    pending:      'Ausstehend',
    failed:       'Fehlgeschlagen',
    refunded:     'Erstattet',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function OrderRow({ order, showEsim }: { order: OrderType; showEsim?: boolean }) {
  const tariff = order.tariffs;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl">{tariff?.flag_emoji ?? '🌐'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">
            {tariff?.country_name ?? 'Unbekannt'}
            {order.order_type === 'top_up' && (
              <span className="ml-2 text-xs bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">Top-Up</span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            {tariff ? `${formatGb(tariff.data_gb)} · ${tariff.validity_days}d` : ''}
            {' · '}
            {new Date(order.created_at).toLocaleDateString('de-DE')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {statusBadge(order.status)}
          <span className="font-semibold text-slate-800 text-sm">{formatEur(order.amount_eur)}</span>
        </div>
        {showEsim && order.iccid && (
          <Link
            href={`/dashboard/orders/${order.id}`}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium"
          >
            Details →
          </Link>
        )}
      </div>
      {order.iccid && showEsim && (
        <div className="border-t border-slate-100 px-4 py-2 flex items-center gap-2">
          <span className="text-xs text-slate-400">ICCID:</span>
          <span className="text-xs font-mono text-slate-600">{order.iccid}</span>
          {order.top_up_iccid === null && (
            <Link
              href={`/topup?iccid=${order.iccid}`}
              className="ml-auto text-xs text-brand-600 hover:text-brand-800 font-medium"
            >
              📶 Aufladen
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
