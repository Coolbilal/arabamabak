-- =====================================================
-- Migration 39: payment_methods tablosu
-- arabamabak - Ödeme yöntemleri yönetimi
-- =====================================================
-- Bu migration:
--   1) payment_methods tablosu
--   2) RLS policies
--   3) Seed data: cüzdan, iyzico, PayTR, banka havalesi
-- =====================================================

-- =====================================================
-- 1) ENUM
-- =====================================================
do $$ begin
  create type payment_method_type as enum ('wallet', 'card', 'bank', 'manual');
exception when duplicate_object then null; end $$;

-- =====================================================
-- 2) PAYMENT_METHODS TABLOSU
-- =====================================================
create table if not exists public.payment_methods (
  id uuid primary key default uuid_generate_v4(),
  type payment_method_type not null,
  code text not null unique,
  name text not null,
  description text,
  icon text,
  is_active boolean not null default true,
  is_default boolean not null default false,
  fee_percent numeric(5,2) not null default 0,
  fee_fixed numeric(10,2) not null default 0,
  config jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_payment_methods_type on public.payment_methods(type);
create index if not exists idx_payment_methods_active on public.payment_methods(is_active, sort_order);

-- updated_at trigger
drop trigger if exists trg_touch_payment_methods on public.payment_methods;
create trigger trg_touch_payment_methods before update on public.payment_methods
  for each row execute function public.touch_updated_at();

-- =====================================================
-- 3) RLS POLICIES
-- =====================================================
alter table public.payment_methods enable row level security;

drop policy if exists payment_methods_public_read on public.payment_methods;
create policy payment_methods_public_read on public.payment_methods
  for select using (is_active = true);

drop policy if exists payment_methods_admin_all on public.payment_methods;
create policy payment_methods_admin_all on public.payment_methods
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =====================================================
-- 4) SEED DATA
-- =====================================================
insert into public.payment_methods (type, code, name, description, icon, is_active, is_default, fee_percent, fee_fixed, config, sort_order) values
  ('wallet', 'wallet', 'Cüzdandan Aktarım', 'Mevcut cüzdan bakiyenizden ödeme', 'Wallet', true, false, 0, 0, '{}'::jsonb, 1),
  ('bank', 'bank_transfer', 'Banka Havalesi', 'IBAN''a havale yapıp dekont yükleyin. Admin onayından sonra bakiyenize yüklenir.', 'Building2', true, false, 0, 0, '{
    "iban": "TR12 0006 4000 0011 2345 6789 01",
    "bank_name": "Ziraat Bankası",
    "account_holder": "Arabamabak Teknoloji A.Ş."
  }'::jsonb, 2),
  ('card', 'iyzico', 'iyzico (Kredi Kartı)', 'iyzico güvenli ödeme altyapısı ile kredi/banka kartı ile ödeme', 'CreditCard', true, false, 2.79, 0.29, '{
    "sandbox": true,
    "api_key": "",
    "secret_key": "",
    "callback_url": "/wallet/callback"
  }'::jsonb, 3),
  ('card', 'paytr', 'PayTR (Kredi Kartı)', 'PayTR güvenli ödeme altyapısı', 'CreditCard', false, false, 2.79, 0.29, '{
    "sandbox": true,
    "merchant_id": "",
    "merchant_key": "",
    "merchant_salt": ""
  }'::jsonb, 4),
  ('card', 'stripe', 'Stripe (Kredi Kartı)', 'Stripe uluslararası ödeme altyapısı', 'CreditCard', false, false, 2.90, 0.30, '{
    "sandbox": true,
    "publishable_key": "",
    "secret_key": ""
  }'::jsonb, 5)
on conflict (code) do nothing;

-- Cüzdan varsayılan olsun (mevcutsa güncelle)
update public.payment_methods
set is_default = true
where code = 'wallet' and is_active = true
  and not exists (select 1 from public.payment_methods where is_default = true);
