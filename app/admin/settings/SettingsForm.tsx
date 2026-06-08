'use client';

import { useState } from 'react';

interface Setting {
  key:         string;
  value:       string;
  description: string | null;
}

export function SettingsForm({ settings: initial }: { settings: Setting[] }) {
  const [settings, setSettings] = useState(initial);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [saved,    setSaved]    = useState<string | null>(null);

  async function handleSave(key: string, value: string) {
    setSaving(key);
    try {
      await fetch('/api/admin/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ key, value }),
      });
      setSaved(key);
      setTimeout(() => setSaved(null), 2000);
    } finally {
      setSaving(null);
    }
  }

  function updateLocal(key: string, value: string) {
    setSettings((prev) => prev.map((s) => s.key === key ? { ...s, value } : s));
  }

  return (
    <div className="space-y-4">
      {settings.map((s) => (
        <div key={s.key} className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="mb-2 flex items-start justify-between">
            <div>
              <p className="font-semibold text-slate-800 font-mono text-sm">{s.key}</p>
              {s.description && (
                <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
              )}
            </div>
            {saved === s.key && (
              <span className="text-xs text-green-600 font-medium">✅ Gespeichert</span>
            )}
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={s.value}
              onChange={(e) => updateLocal(s.key, e.target.value)}
              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={() => handleSave(s.key, s.value)}
              disabled={saving === s.key}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {saving === s.key ? '…' : 'Speichern'}
            </button>
          </div>
        </div>
      ))}

      {settings.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400">
          Keine Einstellungen gefunden. Stelle sicher, dass die DB-Migration ausgeführt wurde.
        </p>
      )}
    </div>
  );
}
