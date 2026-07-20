-- =====================================================
-- Migration 46: place_bid max_bid_amount fix
-- arabamabak - current_price max'tan büyükse teklif vermesine izin ver
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
  v_effective_min numeric;
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

  v_min_bid := coalesce((select min_bid_amount from public.site_settings where id = 1), 1000);
  v_max_bid := coalesce((select max_bid_amount from public.site_settings where id = 1), 50000);

  -- Eğer current_price max'tan büyükse, yeni teklif sadece current_price + 1 olabilir
  if v_auction.current_price >= v_max_bid then
    v_effective_min := v_auction.current_price + 1;
    v_max_bid := v_effective_min; -- max'ı da yükselt (artış gerekli)
  else
    v_min_inc := v_auction.current_price + v_auction.bid_increment;
    v_effective_min := greatest(v_min_bid, v_min_inc);
  end if;

  if p_amount < v_effective_min then
    raise exception 'Teklif en az % TL olmali', v_effective_min;
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