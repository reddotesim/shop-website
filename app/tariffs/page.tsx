import type { Metadata } from 'next';
import { createClient }   from '@/lib/supabase/server';
import { TariffsGrid }    from '@/components/TariffsGrid';

export const metadata: Metadata = { title: 'Alle Tarife' };
export const revalidate = 3600;

async function getTariffs(country?: string, region?: string) {
  const supabase = await createClient();
  let query = supabase
    .from('tariffs')
    .select('*')
    .eq('is_active', true)
    .order('sale_price_eur', { ascending: true });

  if (country) query = query.eq('country_code', country.toUpperCase());
  if (region)  query = query.eq('region', region);

  const { data } = await query;
  return data ?? [];
}

export default async function TariffsPage({
  searchParams,
}: {
  searchParams: { country?: string; region?: string; q?: string };
}) {
  const { country, region, q } = await searchParams;
  let tariffs = await getTariffs(country, region);

  // Client-side search is handled by the SearchFilter component;
  // here we handle server-side country/region filtering.
  if (q) {
    const query = q.toLowerCase();
    tariffs = tariffs.filter(
      (t) =>
        t.country_name.toLowerCase().includes(query) ||
        t.name.toLowerCase().includes(query) ||
        t.region?.toLowerCase().includes(query)
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Alle Tarife</h1>
        <p className="mt-2 text-slate-500">
          {tariffs.length} Tarife verfügbar – täglich aktualisiert
        </p>
      </div>

      <TariffSearchFilter />

      <TariffsGrid tariffs={tariffs} />
    </div>
  );
}

function TariffSearchFilter() {
  return (
    <form method="GET" className="mb-8 flex flex-wrap gap-3">
      <input
        type="search"
        name="q"
        placeholder="Land oder Region suchen…"
        className="flex-1 min-w-48 rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <button
        type="submit"
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
      >
        Suchen
      </button>
      <a
        href="/tariffs"
        className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
      >
        Zurücksetzen
      </a>
    </form>
  );
}
