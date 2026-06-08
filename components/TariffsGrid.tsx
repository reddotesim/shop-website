'use client';

import { useState } from 'react';
import { TariffCard }      from './TariffCard';
import { CheckoutModal }   from './CheckoutModal';
import type { Database }   from '@/lib/supabase/types';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

export function TariffsGrid({ tariffs }: { tariffs: Tariff[] }) {
  const [selected, setSelected] = useState<Tariff | null>(null);

  if (tariffs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
        <p className="text-4xl mb-3">📡</p>
        <p className="font-medium">Keine Tarife gefunden.</p>
        <p className="text-sm mt-1">Starte den täglichen Sync unter /api/cron/sync-tariffs.</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tariffs.map((t) => (
          <TariffCard
            key={t.id}
            tariff={t}
            onBuy={(tariff) => setSelected(tariff)}
          />
        ))}
      </div>

      {selected && (
        <CheckoutModal
          tariff={selected}
          orderType="new_esim"
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
