-- =====================================================
-- Migration 20: Views
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   v_active_auctions, v_active_listings,
--   v_auction_seats_remaining, v_user_wallet_summary,
--   v_expertise_dashboard
-- =====================================================

-- =====================================================
-- 1) v_active_auctions
-- Aktif mezatlar + araç bilgisi
-- =====================================================
create or replace view public.v_active_auctions as
  select
    a.id, a.vehicle_id, a.slot_id, a.opening_price, a.current_price,
    a.bid_increment, a.start_at, a.end_at, a.status, a.winner_id,
    a.total_bids, a.ended_at, a.created_at,
    a.max_seats, a.seat_hold_fee, a.anti_snipe_seconds, a.duration_minutes,
    a.live_ends_at, a.live_started_at, a.final_price,
    a.seller_confirmed, a.seller_auto_approval_at, a.promotion_request_id,
    v.title, v.brand_id, v.model_id, v.year, v.km, v.fuel, v.transmission,
    v.body, v.city, v.is_premium, v.contact_hidden,
    v.seller_id, v.slug,
    -- Koltuk sayısı hesaplama
    (select count(*) from public.auction_seat_holds ash
      where ash.auction_id = a.id and ash.status in ('holding', 'won')) as seats_used,
    a.max_seats - (select count(*) from public.auction_seat_holds ash
      where ash.auction_id = a.id and ash.status in ('holding', 'won')) as seats_remaining
  from public.auctions a
  join public.vehicles v on v.id = a.vehicle_id
  where a.status in ('scheduled', 'live')
    and v.status in ('active', 'sold_pending_confirmation')
    and v.deleted_at is null;

-- =====================================================
-- 2) v_active_listings
-- Aktif ilanlar + marka/model ilişkili
-- =====================================================
create or replace view public.v_active_listings as
  select
    v.*,
    b.name as brand_name, b.logo_url as brand_logo_url,
    m.name as model_name,
    c.name as category_name,
    d.name as district_name,
    ci.name as city_name,
    es.displacement as engine_size
  from public.vehicles v
  left join public.vehicle_brands b on b.id = v.brand_id
  left join public.vehicle_models m on m.id = v.model_id
  left join public.categories c on c.id = v.category_id
  left join public.cities ci on ci.name = v.city
  left join public.districts d on d.city_id = ci.id and d.name = v.district
  left join public.engine_sizes es on es.id = v.engine_size_id
  where v.status = 'active' and v.deleted_at is null;

-- =====================================================
-- 3) v_auction_seats_remaining
-- Her mezat için koltuk durumu (UI için)
-- =====================================================
create or replace view public.v_auction_seats_remaining as
  select
    a.id as auction_id,
    a.max_seats,
    coalesce(seat_counts.holding_count, 0) as seats_holding,
    coalesce(seat_counts.won_count, 0) as seats_won,
    a.max_seats - coalesce(seat_counts.holding_count, 0) - coalesce(seat_counts.won_count, 0) as seats_available
  from public.auctions a
  left join (
    select auction_id,
      count(*) filter (where status = 'holding') as holding_count,
      count(*) filter (where status = 'won') as won_count
    from public.auction_seat_holds
    group by auction_id
  ) seat_counts on seat_counts.auction_id = a.id
  where a.status in ('scheduled', 'live');

-- =====================================================
-- 4) v_user_wallet_summary
-- Kullanıcı cüzdan özeti (frontend için)
-- =====================================================
create or replace view public.v_user_wallet_summary as
  select
    p.id as user_id,
    p.wallet_balance as current_balance,
    coalesce(pending.total_pending, 0) as total_pending,
    coalesce(pending.total_completed_in, 0) as total_in,
    coalesce(pending.total_completed_out, 0) as total_out,
    (select count(*) from public.transactions t where t.user_id = p.id) as total_transactions
  from public.profiles p
  left join (
    select user_id,
      sum(amount) filter (where status = 'pending') as total_pending,
      sum(amount) filter (where status = 'completed' and type in ('deposit', 'refund')) as total_completed_in,
      sum(amount) filter (where status = 'completed' and type in ('withdraw', 'payment')) as total_completed_out
    from public.transactions
    group by user_id
  ) pending on pending.user_id = p.id
  where p.deleted_at is null;

-- =====================================================
-- 5) v_expertise_dashboard
-- Admin için ekspertiz pipeline özeti
-- =====================================================
create or replace view public.v_expertise_dashboard as
  select
    er.id, er.user_id, er.vehicle_id, er.brand_id, er.model_id, er.year,
    er.city, er.status, er.process_status, er.transport_mode,
    er.expert_valet_id, er.expertise_dealership_id,
    er.appointment_date, er.created_at, er.completed_at,
    u.full_name as user_full_name, u.phone as user_phone,
    vb.name as brand_name, vm.name as model_name,
    ev.full_name as valet_name,
    ed.name as dealership_name
  from public.expertise_requests er
  left join public.profiles u on u.id = er.user_id
  left join public.vehicle_brands vb on vb.id = er.brand_id
  left join public.vehicle_models vm on vm.id = er.model_id
  left join public.expert_valets ev on ev.id = er.expert_valet_id
  left join public.expertise_dealerships ed on ed.id = er.expertise_dealership_id
  where er.deleted_at is null;
