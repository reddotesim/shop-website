import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-brand-700">📡 eSIM Shop</p>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Günstige eSIMs für über 150 Länder – sofort einsatzbereit, keine physische SIM nötig.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-3">Navigation</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/tariffs"   className="hover:text-brand-700 transition-colors">Tarife durchsuchen</Link></li>
              <li><Link href="/topup"     className="hover:text-brand-700 transition-colors">eSIM aufladen</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-700 transition-colors">Mein Bereich</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-3">Rechtliches</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/impressum" className="hover:text-brand-700 transition-colors">Impressum</Link></li>
              <li><Link href="/datenschutz" className="hover:text-brand-700 transition-colors">Datenschutz</Link></li>
              <li><Link href="/agb"       className="hover:text-brand-700 transition-colors">AGB</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} eSIM Shop. Alle Rechte vorbehalten.
        </div>
      </div>
    </footer>
  );
}
