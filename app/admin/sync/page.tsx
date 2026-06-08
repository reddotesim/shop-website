'use client';

import { useState } from 'react';

interface SyncResult {
  success:     boolean;
  upserted?:   number;
  errors?:     number;
  total?:      number;
  usdEurRate?: number;
  duration_ms?: number;
  error?:      string;
}

export default function SyncPage() {
  const [status,   setStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result,   setResult]   = useState<SyncResult | null>(null);
  const [log,      setLog]      = useState<string[]>([]);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString('de-DE')}] ${msg}`]);
  }

  async function handleSync() {
    setStatus('running');
    setResult(null);
    setLog([]);
    addLog('Starte Produkt-Sync…');

    try {
      addLog('Rufe /api/admin/sync auf…');
      const res  = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json() as SyncResult;

      if (!res.ok || !data.success) {
        addLog(`❌ Fehler: ${data.error ?? 'Unbekannter Fehler'}`);
        setResult(data);
        setStatus('error');
        return;
      }

      addLog(`✅ Sync abgeschlossen in ${((data.duration_ms ?? 0) / 1000).toFixed(1)}s`);
      addLog(`📦 Tarife verarbeitet: ${data.total}`);
      addLog(`💾 Upserted: ${data.upserted}  |  Fehler: ${data.errors}`);
      addLog(`💱 USD/EUR Rate: ${data.usdEurRate}`);
      setResult(data);
      setStatus('done');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Netzwerkfehler: ${msg}`);
      setStatus('error');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Produkt-Sync</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lädt alle Tarife von der esimaccess API, berechnet EUR-Preise und speichert sie in der Datenbank.
          Inaktiv gewordene Pakete werden automatisch deaktiviert.
        </p>
      </div>

      {/* Info cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '🌍', title: 'Quelle', desc: 'esimaccess API – alle aktiven Pakete' },
          { icon: '💱', title: 'Preisformel', desc: 'EK-USD × 2 × USD/EUR-Kurs → x.x9 Rundung' },
          { icon: '⏱️', title: 'Dauer', desc: 'Ca. 10–60 Sekunden je nach Paketanzahl' },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-3xl mb-2">{c.icon}</p>
            <p className="font-semibold text-slate-800">{c.title}</p>
            <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Action */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Initialen Sync starten</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Bestehende Tarife werden aktualisiert (upsert), neue hinzugefügt.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={status === 'running'}
            className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {status === 'running' ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Synchronisiert…
              </span>
            ) : '🔄 Jetzt synchronisieren'}
          </button>
        </div>

        {/* Log output */}
        {log.length > 0 && (
          <div className="mt-5 rounded-xl bg-slate-900 p-4 font-mono text-xs text-slate-300 space-y-1 max-h-60 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i} className={
                line.includes('❌') ? 'text-red-400'
                : line.includes('✅') ? 'text-green-400'
                : 'text-slate-300'
              }>
                {line}
              </div>
            ))}
            {status === 'running' && (
              <div className="flex items-center gap-1 text-brand-400">
                <span className="animate-pulse">▋</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result */}
      {result && status === 'done' && (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 className="mb-4 font-semibold text-green-800">✅ Sync erfolgreich</h2>
          <div className="grid gap-3 sm:grid-cols-4 text-center">
            {[
              { label: 'Gesamt',    value: result.total     ?? 0 },
              { label: 'Upserted', value: result.upserted  ?? 0 },
              { label: 'Fehler',   value: result.errors    ?? 0 },
              { label: 'USD/EUR',  value: result.usdEurRate?.toFixed(4) ?? '–' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white p-4 border border-green-100">
                <p className="text-2xl font-bold text-green-700">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-slate-500">
            Dauer: {((result.duration_ms ?? 0) / 1000).toFixed(1)}s
            {' · '}
            <a href="/admin/tariffs" className="text-brand-600 hover:text-brand-800 font-medium">
              Tarife anzeigen →
            </a>
          </p>
        </div>
      )}

      {result && status === 'error' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 font-semibold text-red-800">❌ Sync fehlgeschlagen</h2>
          <p className="text-sm text-red-700">{result.error}</p>
          <p className="mt-2 text-xs text-slate-500">
            Prüfe die Konsole des Servers und stelle sicher, dass{' '}
            <code className="font-mono">ESIMACCESS_ACCESS_CODE</code> korrekt gesetzt ist.
          </p>
        </div>
      )}
    </div>
  );
}
