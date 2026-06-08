import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { SettingsForm } from './SettingsForm';

export const metadata: Metadata = { title: 'Einstellungen' };
export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = createServiceClient();

  const { data: settings } = await db
    .from('system_settings')
    .select('key, value, description')
    .order('key');

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Einstellungen</h1>
        <p className="mt-1 text-sm text-slate-500">
          System-Einstellungen aus der Datenbank (system_settings Tabelle).
        </p>
      </div>

      <SettingsForm settings={settings ?? []} />
    </div>
  );
}
