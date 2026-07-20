-- =====================================================
-- Migration 42: seller_approve_winner güncelleme
-- arabamabak - sold status ve seller_confirmed false için de onay
-- =====================================================

create or replace function public.seller_approve_winner(
  p_auction_id uuid,
  p_approve boolean
)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_auction record;
  v_vehicle record;
  v_winner uuid;
  v_winning_bid uuid;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;

  select * into v_vehicle from public.vehicles where id = v_auction.vehicle_id;
  if v_vehicle.seller_id <> v_user_id then
    raise exception 'Sadece ilan sahibi onay verebilir';
  end if;

  -- Durum: sold_pending_confirmation, ended, veya sold (henüz onaylanmamış)
  if v_auction.status not in ('sold_pending_confirmation', 'ended', 'sold') then
    raise exception 'Mezat henuz bitmemis veya onaylanmamis';
  end if;

  -- Zaten onaylanmış veya reddedilmiş ise
  if v_auction.seller_confirmed = true and p_approve then
    raise exception 'Bu mezat zaten onaylanmis';
  end if;
  if v_auction.seller_rejected_at is not null and not p_approve then
    raise exception 'Bu mezat zaten reddedilmis';
  end if;

  v_winning_bid := v_auction.winning_bid_id;
  if v_winning_bid is null then
    raise exception 'Bu mezatta kazanan yok';
  end if;

  select bidder_id into v_winner from public.bids where id = v_winning_bid;

  if p_approve then
    update public.auctions
    set status = 'sold',
        contact_reveal_approved_at = now(),
        contact_revealed_to = v_winner,
        seller_rejected_at = null,
        seller_confirmed = true,
        seller_confirmed_at = coalesce(seller_confirmed_at, now())
    where id = p_auction_id;

    update public.vehicles
    set status = 'sold',
        sold_at = coalesce(sold_at, now()),
        final_price = v_auction.current_price
    where id = v_auction.vehicle_id;
  else
    update public.auctions
    set seller_rejected_at = now(),
        winner_id = null,
        winning_bid_id = null,
        final_price = null,
        status = 'ended',
        seller_confirmed = false,
        seller_confirmed_at = null
    where id = p_auction_id;

    update public.vehicles
    set status = 'cancelled'
    where id = v_auction.vehicle_id;
  end if;

  return json_build_object(
    'success', true,
    'approved', p_approve,
    'winner_id', v_winner,
    'auction_id', p_auction_id
  );
end $$;

grant execute on function public.seller_approve_winner(uuid, boolean) to authenticated;
