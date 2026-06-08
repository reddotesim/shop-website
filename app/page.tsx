import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { TariffsGrid } from '@/components/TariffsGrid';
import { TopUpTeaser } from '@/components/TopUpTeaser';
import { formatEur } from '@/lib/utils';

export const revalidate = 3600; // ISR: revalidate every hour

async function getFeaturedTariffs() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tariffs')
    .select('*')
    .eq('is_active', true)
    .order('sale_price_eur', { ascending: true })
    .limit(8);
  return data ?? [];
}

export default async function HomePage() {
  const tariffs = await getFeaturedTariffs();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            📡 Über 150 Länder verfügbar
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            eSIM kaufen –<br />
            <span className="text-brand-200">sofort weltweit verbunden</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-brand-100">
            Kein Roaming-Schock, keine physische SIM. Einfach kaufen, QR-Code scannen, loslegen.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link
              href="/tariffs"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
            >
              Alle Tarife ansehen
            </Link>
            <Link
              href="/topup"
              className="rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              eSIM aufladen
            </Link>
          </div>
        </div>
      </section>

      {/* Feature badges */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { icon: '⚡', label: 'Sofortlieferung', desc: 'QR-Code direkt nach Kauf' },
              { icon: '🌍', label: '150+ Länder',    desc: 'Weltweit vernetzt' },
              { icon: '💶', label: 'Faire Preise',   desc: 'Keine versteckten Kosten' },
              { icon: '🔒', label: 'Sicher',         desc: 'Verschlüsselte Zahlung' },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured tariffs */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Beliebte Tarife</h2>
            <p className="text-slate-500 text-sm mt-1">Günstigste Optionen – täglich aktualisiert</p>
          </div>
          <Link
            href="/tariffs"
            className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
          >
            Alle ansehen →
          </Link>
        </div>

        <TariffsGrid tariffs={tariffs} />
      </section>

      {/* Top-Up teaser */}
      <section className="bg-gradient-to-r from-brand-50 to-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <TopUpTeaser />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-10 text-center text-2xl font-bold text-slate-900">So einfach geht's</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { step: '1', icon: '🔍', title: 'Tarif wählen', desc: 'Durchsuche unsere Tarife für dein Reiseziel.' },
            { step: '2', icon: '💳', title: 'Sicher bezahlen', desc: 'Zahle schnell und sicher per Kreditkarte oder PayPal.' },
            { step: '3', icon: '📷', title: 'QR-Code scannen', desc: 'Scanne den QR-Code in deinen iPhone/Android-Einstellungen.' },
            { step: '4', icon: '🌐', title: 'Verbunden!', desc: 'Du bist sofort mit dem lokalen Netz verbunden.' },
          ].map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white font-bold">
                {s.step}
              </div>
              <p className="text-3xl mb-2">{s.icon}</p>
              <p className="font-semibold text-slate-800">{s.title}</p>
              <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
