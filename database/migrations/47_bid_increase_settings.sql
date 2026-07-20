-- =====================================================
-- Migration 47: Min/Max Bid Increase
-- arabamabak - Min/max artış (current_price üzerine eklenen)
-- =====================================================
-- Bu migration:
--   1) min_bid_increase (default 1000)
--   2) max_bid_increase (default 50000)
--   3) place_bid RPC güncelleme (yeni mantık)
-- =====================================================

-- =====================================================
-- 1) SITE_SETTINGS - yeni kolonlar
-- =====================================================
do $$ begin
  alter table public.site_settings add column if not exists min_bid_increase numeric(10,2) default 1000;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.site_settings add column if not exists max_bid_increase numeric(10,2) default 50000;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 2) place_bid RPC GÜNCELLE
-- - min: current_price + min_bid_increase (1000)
-- - max: current_price + max_bid_increase (50000)
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
  v_min_inc numeric;
  v_max_inc numeric;
  v_min_bid numeric;
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

  -- Site ayarlarından min/max artış
  v_min_inc := coalesce((select min_bid_increase from public.site_settings where id = 1), 1000);
  v_max_inc := coalesce((select max_bid_increase from public.site_settings where id = 1), 50000);

  -- Geçerli teklif aralığı: current_price + [min_inc, max_inc]
  v_min_bid := v_auction.current_price + v_min_inc;
  v_max_bid := v_auction.current_price + v_max_inc;

  if p_amount < v_min_bid then
    raise exception 'Teklif en az % TL olmali (son teklif + min artış)', v_min_bid;
  end if;

  if p_amount > v_max_bid then
    raise exception 'Teklif en fazla % TL olabilir (son teklif + max artış)', v_max_bid;
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

-- =====================================================
-- 3) Eski kolonları kaldır (migration 45'ten kalan)
-- DİKKAT: Veri kaybı olabilir, ama zaten sıfırlanabilir defaultlar
-- =====================================================
alter table public.site_settings drop column if exists min_bid_amount;
alter table public.site_settings drop column if exists max_bid_amount;
alter table public.site_settings drop column if exists max_bid_increase_percent;