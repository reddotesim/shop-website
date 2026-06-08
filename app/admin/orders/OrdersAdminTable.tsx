'use client';

import { useState, useMemo } from 'react';
import { formatEur } from '@/lib/utils';

type OrderStatus = 'pending' | 'paid' | 'provisioning' | 'completed' | 'failed' | 'refunded';

interface Order {
  id:                  string;
  status:              OrderStatus;
  order_type:          string;
  customer_email:      string;
  customer_name:       string | null;
  amount_eur:          number;
  iccid:               string | null;
  top_up_iccid:        string | null;
  error_message:       string | null;
  sellauth_order_id:   string | null;
  payment_confirmed_at: string | null;
  created_at:          string;
  tariffs:             { name: string; country_name: string; flag_emoji: string | null; data_gb: number | null; validity_days: number } | null;
}

const STATUS_COLOR: Record<string, string> = {
  completed:    'bg-green-100 text-green-700',
  paid:         'bg-amber-100 text-amber-700',
  provisioning: 'bg-blue-100 text-blue-700',
  pending:      'bg-slate-100 text-slate-600',
  failed:       'bg-red-100 text-red-700',
  refunded:     'bg-purple-100 text-purple-700',
};
const STATUS_LABEL: Record<string, string> = {
  completed: 'Abgeschlossen', paid: 'Bezahlt', provisioning: 'In Arbeit',
  pending: 'Ausstehend', failed: 'Fehlgeschlagen', refunded: 'Erstattet',
};
const ALL_STATUSES: OrderStatus[] = ['pending','paid','provisioning','completed','failed','refunded'];

export function OrdersAdminTable({ orders: initial }: { orders: Order[] }) {
  const [orders,    setOrders]    = useState(initial);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<OrderStatus | 'all'>('all');
  const [updating,  setUpdating]  = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch = search === '' ||
        o.customer_email.toLowerCase().includes(search.toLowerCase()) ||
        o.id.includes(search) ||
        (o.iccid ?? '').includes(search) ||
        (o.tariffs?.country_name ?? '').toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'all' || o.status === filter;
      return matchSearch && matchFilter;
    });
  }, [orders, search, filter]);

  async function updateStatus(id: string, status: OrderStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/orders/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="E-Mail, Bestell-ID, ICCID oder Land…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="all">Alle Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 whitespace-nowrap">{filtered.length} Ergebnisse</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Land</th>
              <th className="px-4 py-3 text-left">Kunde</th>
              <th className="px-4 py-3 text-center">Typ</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Betrag</th>
              <th className="px-4 py-3 text-center">Status ändern</th>
              <th className="px-4 py-3 text-right">Datum</th>
              <th className="px-4 py-3 text-center">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((o) => (
              <>
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium">
                    {o.tariffs?.flag_emoji ?? '🌐'} {o.tariffs?.country_name ?? '–'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-800 truncate max-w-[160px]">{o.customer_email}</p>
                    {o.customer_name && (
                      <p className="text-xs text-slate-400">{o.customer_name}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {o.order_type === 'top_up' ? '📶 Top-Up' : '🆕 Neu'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[o.status] ?? 'bg-slate-100'}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                    {o.error_message && (
                      <p className="mt-0.5 text-xs text-red-500 truncate max-w-[120px]" title={o.error_message}>
                        ⚠️ {o.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{formatEur(o.amount_eur)}</td>
                  <td className="px-4 py-3 text-center">
                    <select
                      value={o.status}
                      disabled={updating === o.id}
                      onChange={(e) => updateStatus(o.id, e.target.value as OrderStatus)}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500 disabled:opacity-50"
                    >
                      {ALL_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400 text-xs">
                    {new Date(o.created_at).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                      className="text-xs text-brand-600 hover:text-brand-800 font-medium"
                    >
                      {expanded === o.id ? '▲' : '▼'}
                    </button>
                  </td>
                </tr>

                {/* Expanded row */}
                {expanded === o.id && (
                  <tr key={`${o.id}-detail`} className="bg-slate-50">
                    <td colSpan={8} className="px-4 py-4">
                      <div className="grid gap-3 text-xs sm:grid-cols-3">
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">Bestelldetails</p>
                          <p className="text-slate-500">ID: <span className="font-mono">{o.id}</span></p>
                          {o.sellauth_order_id && (
                            <p className="text-slate-500">Sellauth: <span className="font-mono">{o.sellauth_order_id}</span></p>
                          )}
                          {o.payment_confirmed_at && (
                            <p className="text-slate-500">Zahlung: {new Date(o.payment_confirmed_at).toLocaleString('de-DE')}</p>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">eSIM Daten</p>
                          {o.iccid ? (
                            <p className="text-slate-500 font-mono">ICCID: {o.iccid}</p>
                          ) : (
                            <p className="text-slate-400 italic">Noch keine ICCID</p>
                          )}
                          {o.top_up_iccid && (
                            <p className="text-slate-500 font-mono">Top-Up ICCID: {o.top_up_iccid}</p>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700 mb-1">Tarif</p>
                          <p className="text-slate-500">{o.tariffs?.name ?? '–'}</p>
                          <p className="text-slate-500">
                            {o.tariffs?.data_gb != null ? `${o.tariffs.data_gb} GB` : '–'}
                            {' · '}{o.tariffs?.validity_days}d
                          </p>
                        </div>
                        {o.error_message && (
                          <div className="sm:col-span-3">
                            <p className="font-semibold text-red-700 mb-1">Fehlermeldung</p>
                            <p className="font-mono text-red-600 bg-red-50 rounded p-2 break-all">{o.error_message}</p>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Keine Bestellungen gefunden.</p>
        )}
      </div>
    </div>
  );
}
