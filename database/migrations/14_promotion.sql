-- =====================================================
-- Migration 14: Promotion (Ücretsiz İlan → Mezat)
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   free_listing_votes (oylama)
--   auction_promotion_requests (mezat isteği)
-- =====================================================

-- =====================================================
-- 1) FREE_LISTING_VOTES
-- =====================================================
create table if not exists public.free_listing_votes (
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  vote_type vote_type not null,
  unique(user_id, vehicle_id)  -- bir kullanıcı bir ilana sadece 1 oy
);
create index if not exists idx_free_listing_votes_vehicle
  on public.free_listing_votes(vehicle_id);
create index if not exists idx_free_listing_votes_vehicle_type
  on public.free_listing_votes(vehicle_id, vote_type);

-- =====================================================
-- 2) AUCTION_PROMOTION_REQUESTS
-- =====================================================
-- Eşik aşılınca otomatik oluşur, admin onaylayınca mezat sistemine alınır
create table if not exists public.auction_promotion_requests (
  admin_notes text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.admin_users(id),
  id uuid primary key default uuid_generate_v4(),
  reason text,  -- "50+ kullanıcı 'fiyat yüksek' oyu verdi" gibi
  status text not null default 'pending',  -- 'pending' | 'approved' | 'rejected' | 'converted'
  trigger_type text not null,  -- 'vote_threshold_high' | 'vote_threshold_low' | 'admin_manual'
  updated_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  vote_count_high int not null default 0,
  vote_count_low int not null default 0,
  vote_count_fair int not null default 0,
  -- Oluşan auction buraya FK olacak (08'de vehicles FK'sı var, ters yön)
  resulting_auction_id uuid references public.auctions(id) on delete set null
);
create index if not exists idx_promotion_requests_status
  on public.auction_promotion_requests(status, created_at desc);
create index if not exists idx_promotion_requests_vehicle
  on public.auction_promotion_requests(vehicle_id);

-- =====================================================
-- 3) AUCTIONS.PROMOTION_REQUEST_ID FK
-- =====================================================
do $$ begin
  alter table public.auctions
    add constraint fk_auctions_promotion_request
    foreign key (promotion_request_id) references public.auction_promotion_requests(id) on delete set null;
exception when duplicate_object then null; end $$;
