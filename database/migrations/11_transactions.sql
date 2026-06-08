-- =====================================================
-- Migration 11: Transactions
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   transactions (cüzdan + ödeme hareketleri)
-- =====================================================

create table if not exists public.transactions (
  amount numeric(12,2) not null,
  balance_after numeric(12,2),  -- işlem sonrası kullanıcının cüzdan bakiyesi
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  description text,
  id uuid primary key default uuid_generate_v4(),
  payment_method text,  -- 'credit_card' | 'bank_transfer' | 'wallet' | 'admin_manual'
  payment_provider text,  -- 'stripe' | 'iyzico' | 'paytr' | null
  provider_transaction_id text,  -- provider'dan dönen ID
  receipt_url text,
  reference_id text,  -- kendi referans numaramız
  related_auction_id uuid references public.auctions(id) on delete set null,
  related_vehicle_id uuid references public.vehicles(id) on delete set null,
  status tx_status not null default 'pending',
  type tx_type not null,
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade
);
create index if not exists idx_tx_provider_id
  on public.transactions(provider_transaction_id) where provider_transaction_id is not null;
create index if not exists idx_tx_status
  on public.transactions(status, created_at desc);
create index if not exists idx_tx_type
  on public.transactions(type);
create index if not exists idx_tx_user
  on public.transactions(user_id, created_at desc);
create index if not exists idx_tx_vehicle
  on public.transactions(related_vehicle_id) where related_vehicle_id is not null;
create index if not exists idx_tx_auction
  on public.transactions(related_auction_id) where related_auction_id is not null;
-- =====================================================
-- 12) GERİ DÖNÜŞ FK'leri (döngüsel bağımlılık için)
-- =====================================================
do $$ begin
  alter table public.auction_seat_transactions
    add constraint fk_seat_tx_reference_transaction
    foreign key (reference_transaction_id) references public.transactions(id) on delete set null;
exception when duplicate_object then null; end $$;