-- Migration: 011_add_crypto_sync_queue.sql
-- Seed the new system setting for crypto sync queue.
INSERT INTO public.system_settings (key, value, description)
VALUES ('crypto_sync_queue', '[]', 'Queue of crypto addresses needing synchronization')
ON CONFLICT (key) DO NOTHING;
