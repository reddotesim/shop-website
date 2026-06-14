import { createServiceClient } from '@/lib/supabase/server';

/**
 * Adds an address to the queue of addresses needing synchronization.
 * The wallet gateway will poll this queue when it goes online.
 */
export async function queueAddressSync(address: string) {
  const db = createServiceClient();
  try {
    const { data, error } = await db
      .from('system_settings')
      .select('value')
      .eq('key', 'crypto_sync_queue')
      .maybeSingle();

    let queue: string[] = [];
    if (data?.value) {
      try {
        queue = JSON.parse(data.value);
      } catch {
        queue = [];
      }
    }

    if (!Array.isArray(queue)) {
      queue = [];
    }

    if (!queue.includes(address)) {
      queue.push(address);
      
      const { error: saveError } = await db
        .from('system_settings')
        .upsert({
          key: 'crypto_sync_queue',
          value: JSON.stringify(queue),
          description: 'Queue of crypto addresses needing synchronization'
        });

      if (saveError) {
        console.error('[Sync Queue] Failed to save queue:', saveError.message);
      } else {
        console.log(`[Sync Queue] Queued address ${address} for synchronization`);
      }
    }
  } catch (err) {
    console.error('[Sync Queue] Error queueing address:', err);
  }
}
