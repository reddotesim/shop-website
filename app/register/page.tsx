'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// ── Passwort-Regeln ──────────────────────────────────────────
interface PasswordRule {
  id:    string;
  label: string;
  test:  (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length',  label: 'Mindestens 8 Zeichen',          test: (pw) => pw.length >= 8 },
  { id: 'upper',   label: 'Mindestens 1 Großbuchstabe',    test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower',   label: 'Mindestens 1 Kleinbuchstabe',   test: (pw) => /[a-z]/.test(pw) },
  { id: 'number',  label: 'Mindestens 1 Zahl',             test: (pw) => /[0-9]/.test(pw) },
  { id: 'special', label: 'Mindestens 1 Sonderzeichen',    test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function passwordStrength(pw: string): { score: number; label: string; color: string } {
  const passed = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  if (pw.length === 0) return { score: 0, label: '',          color: 'bg-slate-200' };
  if (passed <= 1)     return { score: 1, label: 'Sehr schwach', color: 'bg-red-500' };
  if (passed === 2)    return { score: 2, label: 'Schwach',      color: 'bg-orange-500' };
  if (passed === 3)    return { score: 3, label: 'Mittel',       color: 'bg-yellow-400' };
  if (passed === 4)    return { score: 4, label: 'Stark',        color: 'bg-blue-500' };
  return               { score: 5, label: 'Sehr stark',      color: 'bg-green-500' };
}

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = createClient();

  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [showPw,      setShowPw]      = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const rules    = useMemo(() => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })), [password]);
  const strength = useMemo(() => passwordStrength(password), [password]);
  const allPassed = rules.every((r) => r.passed);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (!allPassed) {
      setError('Bitte erfülle alle Passwort-Anforderungen.');
      return;
    }

    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  // ── Erfolgsseite ─────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <p className="text-5xl mb-4">✉️</p>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">E-Mail bestätigen</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Wir haben dir eine Bestätigungs-E-Mail an{' '}
            <strong className="text-slate-700">{email}</strong> geschickt.
            Klicke auf den Link darin, um dein Konto zu aktivieren.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            Zum Login
          </Link>
        </div>
      </div>
    );
  }

  // ── Registrierungsformular ───────────────────────────────────
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="mb-8 text-center">
          <p className="text-4xl mb-2">📡</p>
          <h1 className="text-2xl font-bold text-slate-900">Konto erstellen</h1>
          <p className="text-slate-500 text-sm mt-1">Verwalte all deine eSIMs an einem Ort.</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* E-Mail */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              E-Mail-Adresse
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
            />
          </div>

          {/* Passwort */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Passwort
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Sicheres Passwort wählen"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm"
                tabIndex={-1}
                aria-label={showPw ? 'Passwort verbergen' : 'Passwort anzeigen'}
              >
                {showPw ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Stärkemesser */}
            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                {/* Balken */}
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((seg) => (
                    <div
                      key={seg}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        strength.score >= seg ? strength.color : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-xs font-medium ${
                  strength.score <= 2 ? 'text-red-500'
                  : strength.score === 3 ? 'text-yellow-600'
                  : strength.score === 4 ? 'text-blue-600'
                  : 'text-green-600'
                }`}>
                  {strength.label}
                </p>

                {/* Regel-Checkliste */}
                <ul className="space-y-1">
                  {rules.map((r) => (
                    <li key={r.id} className={`flex items-center gap-1.5 text-xs ${r.passed ? 'text-green-600' : 'text-slate-400'}`}>
                      <span>{r.passed ? '✅' : '○'}</span>
                      {r.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Fehler */}
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !allPassed || !email}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Konto wird erstellt…' : 'Konto erstellen'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Bereits registriert?{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-800 transition-colors">
            Anmelden
          </Link>
        </p>
      </div>
    </div>
  );
}
