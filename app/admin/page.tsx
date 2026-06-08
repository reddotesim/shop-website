import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur } from '@/lib/utils';

export const metadata: Metadata = { title: 'Übersicht' };
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  const db = createServiceClient();

  // ── Stats queries ────────────────────────────────────────────
  const [
    { count: totalOrders },
    { count: pendingOrders },
    { count: activeTariffs },
    { data: revenueRows },
    { data: recentOrders },
    { data: lastSync },
  ] = await Promise.all([
    db.from('orders').select('*', { count: 'exact', head: true }),
    db.from('orders').select('*', { count: 'exact', head: true })
      .in('status', ['pending', 'paid', 'provisioning']),
    db.from('tariffs').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('orders').select('amount_eur').eq('status', 'completed'),
    db.from('orders')
      .select('id, status, customer_email, amount_eur, created_at, tariffs(country_name, flag_emoji)')
      .order('created_at', { ascending: false })
      .limit(5),
    db.from('tariffs').select('last_synced_at').order('last_synced_at', { ascending: false }).limit(1),
  ]);

  const totalRevenue = revenueRows?.reduce((s, r) => s + (r.amount_eur ?? 0), 0) ?? 0;
  const lastSyncedAt = lastSync?.[0]?.last_synced_at;

  const STATUS_COLOR: Record<string, string> = {
    completed:    'bg-green-100 text-green-700',
    paid:         'bg-amber-100 text-amber-700',
    provisioning: 'bg-amber-100 text-amber-700',
    pending:      'bg-slate-100 text-slate-600',
    failed:       'bg-red-100 text-red-700',
    refunded:     'bg-purple-100 text-purple-700',
  };
  const STATUS_LABEL: Record<string, string> = {
    completed: 'Abgeschlossen', paid: 'Bezahlt', provisioning: 'In Arbeit',
    pending: 'Ausstehend', failed: 'Fehlgeschlagen', refunded: 'Erstattet',
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin-Übersicht</h1>
          <p className="text-sm text-slate-500 mt-1">
            Letzter Produkt-Sync:{' '}
            {lastSyncedAt
              ? new Date(lastSyncedAt).toLocaleString('de-DE')
              : 'Noch nie – jetzt synchronisieren!'}
          </p>
        </div>
        <Link
          href="/admin/sync"
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          🔄 Produkte synchronisieren
        </Link>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Bestellungen gesamt', value: totalOrders ?? 0,           icon: '🧾', color: 'text-slate-800' },
          { label: 'Offene Bestellungen', value: pendingOrders ?? 0,         icon: '⏳', color: 'text-amber-600' },
          { label: 'Aktive Tarife',        value: activeTariffs ?? 0,        icon: '📦', color: 'text-brand-700' },
          { label: 'Umsatz (completed)',   value: formatEur(totalRevenue),   icon: '💶', color: 'text-green-700' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/sync" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all">
          <span className="text-3xl">🔄</span>
          <div>
            <p className="font-semibold text-slate-800">Produkt-Sync</p>
            <p className="text-xs text-slate-500">Tarife von esimaccess laden</p>
          </div>
        </Link>
        <Link href="/admin/orders" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all">
          <span className="text-3xl">🧾</span>
          <div>
            <p className="font-semibold text-slate-800">Bestellungen</p>
            <p className="text-xs text-slate-500">Alle Bestellungen verwalten</p>
          </div>
        </Link>
        <Link href="/admin/tariffs" className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 hover:border-brand-300 hover:shadow-sm transition-all">
          <span className="text-3xl">📦</span>
          <div>
            <p className="font-semibold text-slate-800">Tarife</p>
            <p className="text-xs text-slate-500">Aktivieren / deaktivieren</p>
          </div>
        </Link>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">Letzte Bestellungen</h2>
          <Link href="/admin/orders" className="text-xs text-brand-600 hover:text-brand-800 font-medium">
            Alle anzeigen →
          </Link>
        </div>
        {!recentOrders || recentOrders.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">Noch keine Bestellungen.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 text-left">Land</th>
                <th className="px-5 py-3 text-left">Kunde</th>
                <th className="px-5 py-3 text-left">Status</th>
                <th className="px-5 py-3 text-right">Betrag</th>
                <th className="px-5 py-3 text-right">Datum</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((o) => {
                const tariff = (o as any).tariffs;
                return (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      {tariff?.flag_emoji ?? '🌐'} {tariff?.country_name ?? '–'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 truncate max-w-[160px]">{o.customer_email}</td>
                    <td className="px-5 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status] ?? 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABEL[o.status] ?? o.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatEur(o.amount_eur)}</td>
                    <td className="px-5 py-3 text-right text-slate-400">
                      {new Date(o.created_at).toLocaleDateString('de-DE')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
