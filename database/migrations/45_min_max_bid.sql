-- =====================================================
-- Migration 45: Min/Max Teklif Sınırları
-- arabamabak - Admin ayarlardan min/max teklif sınırı
-- =====================================================
-- Bu migration:
--   1) site_settings.min_bid_amount (default 1000)
--   2) site_settings.max_bid_amount (default 50000)
--   3) place_bid RPC güncelleme (min + max + sabit artış kontrolü)
-- =====================================================

-- =====================================================
-- 1) SITE_SETTINGS - yeni kolonlar
-- =====================================================
do $$ begin
  alter table public.site_settings add column if not exists min_bid_amount numeric(10,2) default 1000;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.site_settings add column if not exists max_bid_amount numeric(10,2) default 50000;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 2) place_bid RPC GÜNCELLE
-- - min: site_settings.min_bid_amount
-- - max: site_settings.max_bid_amount
-- - artış: current_price + bid_increment (sabit, yüzde yok)
-- =====================================================
create or replace function public.place_bid(
  p_auction_id uuid,
  p_amount numeric
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_auction record;
  v_seat record;
  v_new_bid_id uuid;
  v_min_bid numeric;
  v_min_inc numeric;
  v_max_bid numeric;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;
  if v_auction.status <> 'live' then raise exception 'Mezat canli degil'; end if;

  if exists (select 1 from public.vehicles where id = v_auction.vehicle_id and seller_id = v_user_id) then
    raise exception 'Kendi ilaniniza teklif veremezsiniz';
  end if;

  select * into v_seat from public.auction_seat_holds
  where auction_id = p_auction_id and user_id = v_user_id and status = 'holding'
  for update;
  if not found then raise exception 'Teklif vermek icin masaya oturmali siniz'; end if;

  -- Site ayarlarından min/max/inc al
  v_min_bid := coalesce((select min_bid_amount from public.site_settings where id = 1), 1000);
  v_max_bid := coalesce((select max_bid_amount from public.site_settings where id = 1), 50000);
  v_min_inc := v_auction.current_price + v_auction.bid_increment;

  -- Min teklif kontrolü (iki kural birden sağlanmalı):
  -- 1) Site min_bid_amount'tan büyük veya eşit olmalı
  -- 2) Mevcut teklif + bid_increment'ten büyük veya eşit olmalı
  v_min_inc := greatest(v_min_bid, v_min_inc);

  if p_amount < v_min_inc then
    raise exception 'Teklif en az % TL olmali', v_min_inc;
  end if;

  if p_amount > v_max_bid then
    raise exception 'Teklif en fazla % TL olabilir', v_max_bid;
  end if;

  update public.bids set is_winning = false
  where auction_id = p_auction_id and is_winning = true;

  insert into public.bids (auction_id, bidder_id, amount, is_winning)
  values (p_auction_id, v_user_id, p_amount, true)
  returning id into v_new_bid_id;

  update public.auctions
  set current_price = p_amount,
      winning_bid_id = v_new_bid_id,
      total_bids = total_bids + 1
  where id = p_auction_id;

  update public.auction_seat_holds set bid_id = v_new_bid_id
  where id = v_seat.id;

  return json_build_object('success', true, 'bid_id', v_new_bid_id, 'current_price', p_amount);
end $$;

grant execute on function public.place_bid(uuid, numeric) to authenticated;