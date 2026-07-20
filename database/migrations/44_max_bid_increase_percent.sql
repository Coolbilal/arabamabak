-- =====================================================
-- Migration 44: Max Bid Increase Percent
-- arabamabak - Minimum teklif artışı yüzde olarak ayarlanabilir
-- =====================================================
-- Bu migration:
--   1) site_settings.max_bid_increase_percent (default 2%)
--   2) place_bid RPC güncelleme (yüzdeye göre min artış)
-- =====================================================

-- =====================================================
-- 1) SITE_SETTINGS - max_bid_increase_percent
-- =====================================================
do $$ begin
  alter table public.site_settings add column if not exists max_bid_increase_percent numeric(5,2) default 2;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 2) RPC: place_bid (güncelleme)
-- Min artış: current_price * (percent / 100)
-- Bid_increment (sabit) da kontrol edilir (herhangi biri yeterli)
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
  v_min_amount numeric;
  v_pct numeric;
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

  -- Min teklif: current_price + (current_price * pct/100)
  -- VEYA current_price + bid_increment (hangisi büyükse)
  v_pct := coalesce(
    (select max_bid_increase_percent from public.site_settings where id = 1),
    2
  );

  v_min_amount := v_auction.current_price + greatest(
    v_auction.current_price * (v_pct / 100),
    v_auction.bid_increment
  );

  if p_amount < v_min_amount then
    raise exception 'Teklif en az % TL olmali', v_min_amount;
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
