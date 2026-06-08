import type { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur, formatGb } from '@/lib/utils';
export const metadata: Metadata = { title: 'Bestellung erfolgreich' };

// Never cache this page
export const dynamic = 'force-dynamic';

async function getOrder(orderId: string) {
  if (!orderId) return null;
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('orders')
    .select('*, tariffs(*)')
    .eq('id', orderId)
    .in('status', ['completed', 'provisioning', 'paid'])
    .single();
  return data;
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const { order: orderId } = await searchParams;
  const order = orderId ? await getOrder(orderId) : null;

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bestellung nicht gefunden</h1>
        <p className="text-slate-500 mb-6">
          Deine Bestellung wird bearbeitet. Schau in deine E-Mails – du bekommst alle Details dorthin.
        </p>
        <Link href="/" className="rounded-xl bg-brand-600 px-6 py-3 text-white font-semibold hover:bg-brand-700 transition-colors">
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  const tariff = (order as any).tariffs;
  const isCompleted = order.status === 'completed';

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Status banner */}
      <div className={`mb-8 rounded-2xl p-6 text-center ${isCompleted ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <p className="text-5xl mb-3">{isCompleted ? '✅' : '⏳'}</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {isCompleted ? 'eSIM bereit!' : 'Zahlung bestätigt – eSIM wird bereitgestellt…'}
        </h1>
        <p className="text-slate-600 text-sm">
          {isCompleted
            ? 'Deine eSIM wurde erfolgreich aktiviert. Die Details wurden auch per E-Mail versendet.'
            : 'Deine eSIM wird gerade vorbereitet. Du bekommst eine E-Mail, sobald sie bereit ist.'}
        </p>
      </div>

      {/* Tariff details */}
      {tariff && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Bestelldetails</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-slate-500">Land</p>
              <p className="font-medium">{tariff.country_name}</p>
            </div>
            <div>
              <p className="text-slate-500">Tarif</p>
              <p className="font-medium">{tariff.name}</p>
            </div>
            <div>
              <p className="text-slate-500">Datenvolumen</p>
              <p className="font-medium">{formatGb(tariff.data_gb)}</p>
            </div>
            <div>
              <p className="text-slate-500">Gültigkeit</p>
              <p className="font-medium">{tariff.validity_days} Tage</p>
            </div>
            <div>
              <p className="text-slate-500">Bezahlt</p>
              <p className="font-medium">{formatEur(order.amount_eur)}</p>
            </div>
            <div>
              <p className="text-slate-500">Bestellnummer</p>
              <p className="font-mono text-xs">{order.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
        </div>
      )}

      {/* eSIM activation data */}
      {isCompleted && order.iccid && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-800 mb-4">📱 eSIM Aktivierungsdaten</h2>

          {/* QR Code */}
          {order.qr_code_url && (
            <div className="mb-5 flex justify-center">
              <div className="rounded-xl border-2 border-brand-100 bg-brand-50 p-4 text-center">
                <img
                  src={order.qr_code_url}
                  alt="eSIM QR-Code"
                  width={180}
                  height={180}
                  className="rounded-lg"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Scanne diesen Code in deinen Einstellungen
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center py-2 border-b border-slate-100">
              <span className="text-slate-500 font-medium">ICCID</span>
              <span className="font-mono text-xs text-slate-800">{order.iccid}</span>
            </div>
            {order.smdp_address && (
              <div className="flex justify-between items-start py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">SM-DP+ Adresse</span>
                <span className="font-mono text-xs text-slate-800 text-right max-w-xs">{order.smdp_address}</span>
              </div>
            )}
            {order.activation_code && (
              <div className="flex justify-between items-center py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Aktivierungscode</span>
                <span className="font-mono text-xs text-slate-800">{order.activation_code}</span>
              </div>
            )}
            {order.apn && (
              <div className="flex justify-between items-center py-2">
                <span className="text-slate-500 font-medium">APN</span>
                <span className="font-mono text-xs text-slate-800">{order.apn}</span>
              </div>
            )}
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold text-slate-700 mb-2">📖 Kurzanleitung</p>
            <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
              <li><strong>iPhone:</strong> Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code verwenden</li>
              <li><strong>Android:</strong> Einstellungen → Netzwerk → SIM-Karten → eSIM hinzufügen</li>
              <li>Wähle die eSIM für Mobilfunkdaten aus und aktiviere „Datenroaming"</li>
              <li>Die Gültigkeit beginnt mit der ersten Datennutzung</li>
            </ol>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/dashboard"
          className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Zu meinen Bestellungen
        </Link>
        <Link
          href="/tariffs"
          className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Weitere eSIMs kaufen
        </Link>
      </div>
    </div>
  );
}
