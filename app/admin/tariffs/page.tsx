import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur } from '@/lib/utils';
import { TariffsAdminTable } from './TariffsAdminTable';

export const metadata: Metadata = { title: 'Tarife' };
export const dynamic = 'force-dynamic';

export default async function AdminTariffsPage() {
  await requireAdmin();
  const db = createServiceClient();

  const { data: tariffs } = await db
    .from('tariffs')
    .select('id, name, country_name, flag_emoji, data_gb, validity_days, sale_price_eur, ek_price_usd, is_active, is_top_up_eligible, last_synced_at, package_code')
    .order('country_name', { ascending: true })
    .limit(500);

  const active   = tariffs?.filter((t) => t.is_active).length  ?? 0;
  const inactive = tariffs?.filter((t) => !t.is_active).length ?? 0;

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tarife</h1>
          <p className="mt-1 text-sm text-slate-500">
            {active} aktiv · {inactive} inaktiv · {tariffs?.length ?? 0} gesamt
          </p>
        </div>
        <a
          href="/admin/sync"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          🔄 Neu synchronisieren
        </a>
      </div>

      {!tariffs || tariffs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-400">
          <p className="text-5xl mb-4">📦</p>
          <p className="font-semibold text-lg">Noch keine Tarife</p>
          <p className="text-sm mt-2">Führe zuerst einen Produkt-Sync durch.</p>
          <a
            href="/admin/sync"
            className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            🔄 Jetzt synchronisieren
          </a>
        </div>
      ) : (
        <TariffsAdminTable tariffs={tariffs} />
      )}
    </div>
  );
}
