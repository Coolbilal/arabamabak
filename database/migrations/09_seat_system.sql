-- =====================================================
-- Migration 09: Seat System
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   auction_seat_holds (masa oturma kayıtları)
--   auction_seat_transactions (bloke/kesim/çözüm audit)
-- =====================================================

-- =====================================================
-- 1) AUCTION_SEAT_HOLDS (masa oturma kayıtları)
-- =====================================================
create table if not exists public.auction_seat_holds (
  amount numeric(12,2) not null,  -- bloke edilen miktar
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bid_id uuid references public.bids(id) on delete set null,  -- bu kullanıcının son teklif (varsa)
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  left_at timestamptz,  -- masadan ayrılma zamanı
  released_at timestamptz,  -- blokenin çözüldüğü zaman
  seat_number int,  -- kullanıcının oturduğu koltuk no (1, 2, 3...)
  status seat_hold_status not null default 'holding',
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  unique(auction_id, user_id)  -- bir kullanıcı bir mezatta sadece 1 koltuk
);
create index if not exists idx_seat_holds_auction
  on public.auction_seat_holds(auction_id, status);
create index if not exists idx_seat_holds_user
  on public.auction_seat_holds(user_id);
create index if not exists idx_seat_holds_winning
  on public.auction_seat_holds(auction_id) where status = 'won';

-- =====================================================
-- 2) AUCTION_SEAT_TRANSACTIONS (bloke/kesim/çözüm audit)
-- =====================================================
create table if not exists public.auction_seat_transactions (
  amount numeric(12,2) not null,  -- işlem miktarı (bloke, kesim, çözüm)
  auction_id uuid not null references public.auctions(id) on delete cascade,
  balance_after numeric(12,2),  -- işlem sonrası cüzdan bakiyesi
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  metadata jsonb,  -- ek detaylar
  reference_transaction_id uuid,
  seat_hold_id uuid not null references public.auction_seat_holds(id) on delete cascade,
  transaction_type text not null,  -- 'hold' | 'release' | 'forfeit' | 'left'
  user_id uuid not null references public.profiles(id) on delete cascade
);
create index if not exists idx_seat_tx_seat_hold
  on public.auction_seat_transactions(seat_hold_id, created_at desc);
create index if not exists idx_seat_tx_user
  on public.auction_seat_transactions(user_id, created_at desc);
