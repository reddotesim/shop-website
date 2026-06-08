'use client';

import { useState } from 'react';
import { formatEur, formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface TariffCardProps {
  tariff:      Tariff;
  onBuy:       (tariff: Tariff) => void;
  loading?:    boolean;
}

export function TariffCard({ tariff, onBuy, loading }: TariffCardProps) {
  return (
    <div className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md">
      {/* Flag & Country */}
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl" role="img" aria-label={tariff.country_name}>
          {tariff.flag_emoji ?? '🌐'}
        </span>
        <div>
          <p className="font-semibold text-slate-800 leading-tight">{tariff.country_name}</p>
          {tariff.region && (
            <p className="text-xs text-slate-400">{tariff.region}</p>
          )}
        </div>
      </div>

      {/* Name */}
      <p className="mb-3 text-sm text-slate-500 line-clamp-2">{tariff.name}</p>

      {/* Specs grid */}
      <div className="mb-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-brand-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-brand-700">{formatGb(tariff.data_gb)}</p>
          <p className="text-xs text-slate-500">Daten</p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
          <p className="text-lg font-bold text-slate-700">{tariff.validity_days}d</p>
          <p className="text-xs text-slate-500">Gültigkeit</p>
        </div>
      </div>

      {/* Price + CTA */}
      <div className="mt-auto flex items-center justify-between">
        <p className="text-xl font-bold text-slate-900">
          {formatEur(tariff.sale_price_eur)}
        </p>
        <button
          onClick={() => onBuy(tariff)}
          disabled={loading}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? '…' : 'Kaufen'}
        </button>
      </div>
    </div>
  );
}
