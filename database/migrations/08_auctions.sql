-- =====================================================
-- Migration 08: Auctions
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   auction_slots (zaman dilimleri)
--   auctions (mezat kayıtları)
--   bids (teklifler)
-- =====================================================

-- =====================================================
-- 1) AUCTION_SLOTS (zaman dilimleri)
-- =====================================================
create table if not exists public.auction_slots (
  created_at timestamptz not null default now(),
  end_time time not null,
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  max_items int not null default 20,
  slot_date date not null,
  start_time time not null,
  unique(slot_date, start_time)
);
create index if not exists idx_auction_slots_date
  on public.auction_slots(slot_date, is_active);

-- =====================================================
-- 2) AUCTIONS
-- =====================================================
create table if not exists public.auctions (
  anti_snipe_seconds int default 30,  -- site_settings'den miras
  bid_increment numeric(10,2) not null default 100,
  created_at timestamptz not null default now(),
  current_price numeric(12,2) not null,
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  duration_minutes int default 30,  -- site_settings'den miras
  ended_at timestamptz,
  end_at timestamptz not null,
  final_price numeric(12,2),
  id uuid primary key default uuid_generate_v4(),
  live_ends_at timestamptz,
  live_started_at timestamptz,
  max_seats int default 100,  -- site_settings'den miras
  min_bid_increment numeric(10,2) default 100,
  opening_price numeric(12,2) not null,
  promotion_request_id uuid,  -- FK migration 14'te eklenecek
  seat_hold_fee numeric(10,2) default 500,  -- site_settings'den miras
  seller_auto_approval_at timestamptz,  -- auto-approval countdown
  seller_confirmed boolean not null default false,
  seller_confirmed_at timestamptz,
  slot_id uuid references public.auction_slots(id) on delete set null,
  start_at timestamptz not null,
  status auction_status not null default 'scheduled',
  total_bids int not null default 0,
  vehicle_id uuid unique not null references public.vehicles(id) on delete cascade,
  winner_id uuid references public.profiles(id) on delete set null,
  winning_bid_id uuid  -- FK bids tablosuna, trigger ile set edilecek
);
create index if not exists idx_auctions_live_ends
  on public.auctions(live_ends_at) where status = 'live';
create index if not exists idx_auctions_promotion
  on public.auctions(promotion_request_id);
create index if not exists idx_auctions_slot
  on public.auctions(slot_id);
create index if not exists idx_auctions_status
  on public.auctions(status);
create index if not exists idx_auctions_status_start
  on public.auctions(status, start_at);
create index if not exists idx_auctions_vehicle
  on public.auctions(vehicle_id);
create index if not exists idx_auctions_winner
  on public.auctions(winner_id);

-- =====================================================
-- 3) BIDS
-- =====================================================
create table if not exists public.bids (
  amount numeric(12,2) not null,
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  is_winning boolean not null default false
);
create index if not exists idx_bids_auction
  on public.bids(auction_id);
create index if not exists idx_bids_auction_amount
  on public.bids(auction_id, amount desc, created_at desc);
create index if not exists idx_bids_bidder
  on public.bids(bidder_id);

-- =====================================================
-- 4) AUCTIONS.WINNING_BID_ID FK
-- =====================================================
do $$ begin
  alter table public.auctions
    add constraint fk_auctions_winning_bid
    foreign key (winning_bid_id) references public.bids(id) on delete set null;
exception when duplicate_object then null; end $$;
