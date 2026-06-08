import Link from 'next/link';

export function TopUpTeaser() {
  return (
    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          📶 eSIM Daten aufgeladen?
        </h2>
        <p className="text-slate-600 max-w-lg">
          Du hast bereits eine eSIM von uns? Lade sie ganz einfach mit neuen Datenpaketen auf –
          ohne neue Nummer, ohne Unterbrechung. Einfach ICCID eingeben und neues Paket wählen.
        </p>
      </div>
      <Link
        href="/topup"
        className="shrink-0 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors shadow-md"
      >
        Jetzt aufladen →
      </Link>
    </div>
  );
}
