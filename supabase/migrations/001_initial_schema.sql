-- ============================================================
-- eSIM Shop – Initial Schema
-- Run this in the Supabase SQL Editor or via supabase db push
-- ============================================================

-- Enable UUID extension (already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS (mirrors Supabase Auth, extended with shop data)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  full_name     TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Automatically create a public.users row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TARIFFS (synced daily from esimaccess)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tariffs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- esimaccess identifiers
  package_code          TEXT NOT NULL UNIQUE,   -- esimaccess packageCode
  slug                  TEXT NOT NULL UNIQUE,   -- URL-friendly identifier
  -- Display info
  name                  TEXT NOT NULL,
  description           TEXT,
  country_code          TEXT NOT NULL,          -- ISO 3166-1 alpha-2 or "GLOBAL"
  country_name          TEXT NOT NULL,
  region                TEXT,                   -- e.g. "Europe", "Asia"
  flag_emoji            TEXT,
  -- Data specs
  data_gb               NUMERIC(10,3),          -- e.g. 5.000 = 5 GB
  validity_days         INTEGER NOT NULL,       -- validity in days
  -- Pricing
  ek_price_usd          NUMERIC(10,4) NOT NULL, -- raw EK from esimaccess (USD)
  sale_price_eur        NUMERIC(10,2) NOT NULL, -- calculated sell price (EUR, rounded to x.x9)
  usd_eur_rate          NUMERIC(10,6) NOT NULL, -- exchange rate used at last sync
  -- State
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_top_up_eligible    BOOLEAN NOT NULL DEFAULT FALSE,
  -- Metadata from esimaccess
  raw_data              JSONB,                  -- full API response for debugging
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tariffs_country_code ON public.tariffs(country_code);
CREATE INDEX IF NOT EXISTS idx_tariffs_is_active ON public.tariffs(is_active);
CREATE INDEX IF NOT EXISTS idx_tariffs_region ON public.tariffs(region);

-- ============================================================
-- ORDERS
-- ============================================================
CREATE TYPE public.order_status AS ENUM (
  'pending',        -- created, awaiting payment
  'paid',           -- payment confirmed by webhook
  'provisioning',   -- fetching eSIM from esimaccess
  'completed',      -- eSIM delivered to customer
  'failed',         -- provisioning or payment failed
  'refunded'        -- refund issued
);

CREATE TYPE public.order_type AS ENUM (
  'new_esim',
  'top_up'
);

CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Relations
  user_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tariff_id             UUID NOT NULL REFERENCES public.tariffs(id),
  -- Order details
  order_type            public.order_type NOT NULL DEFAULT 'new_esim',
  status                public.order_status NOT NULL DEFAULT 'pending',
  -- Customer info (snapshot at order time, in case user changes data later)
  customer_email        TEXT NOT NULL,
  customer_name         TEXT,
  -- Pricing snapshot
  amount_eur            NUMERIC(10,2) NOT NULL,
  usd_eur_rate          NUMERIC(10,6) NOT NULL,
  -- Payment provider (Sellauth)
  sellauth_order_id     TEXT UNIQUE,
  sellauth_product_id   TEXT,
  sellauth_invoice_id   TEXT,
  payment_confirmed_at  TIMESTAMPTZ,
  -- eSIM provisioning data (from esimaccess)
  iccid                 TEXT,
  qr_code_url           TEXT,
  qr_code_base64        TEXT,
  activation_code       TEXT,       -- manual LPA activation string
  smdp_address          TEXT,
  apn                   TEXT,
  -- For top-ups: the ICCID being topped up
  top_up_iccid          TEXT,
  -- Error tracking
  error_message         TEXT,
  -- Timestamps
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_sellauth_order_id ON public.orders(sellauth_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_iccid ON public.orders(iccid);
CREATE INDEX IF NOT EXISTS idx_orders_top_up_iccid ON public.orders(top_up_iccid);

-- ============================================================
-- SYSTEM SETTINGS (key/value store for global config)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default settings
INSERT INTO public.system_settings (key, value, description) VALUES
  ('usd_eur_rate',       '0.92',   'Fallback USD→EUR exchange rate if live API is unavailable'),
  ('sync_enabled',       'true',   'Enable/disable the daily tariff sync cron job'),
  ('shop_name',          'eSIM Shop', 'Display name of the shop'),
  ('support_email',      'support@example.com', 'Customer support email address')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Users: can only read/update their own row
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users_select_own" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_update_own" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Tariffs: public read, only service-role can write
ALTER TABLE public.tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tariffs_public_read" ON public.tariffs FOR SELECT USING (true);

-- Orders: users can read their own; service-role bypasses RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- System settings: public read (no secrets stored here)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_public_read" ON public.system_settings FOR SELECT USING (true);

-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tariffs_updated_at
  BEFORE UPDATE ON public.tariffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
