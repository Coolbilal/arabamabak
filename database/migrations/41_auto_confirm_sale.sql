-- =====================================================
-- Migration 41: Auto Confirm Sale + Sold Status
-- arabamabak - Mezat bitince 5 saniye sonra otomatik onay
-- =====================================================
-- Bu migration:
--   1) auction_status enum'a 'sold' ekle
--   2) RPC: auto_confirm_sale (5 saniye sonra otomatik onay)
-- =====================================================

-- =====================================================
-- 1) AUCTION_STATUS ENUM - 'sold' ekle
-- =====================================================
do $$ begin
  alter type auction_status add value if not exists 'sold';
exception when others then null; end $$;

-- =====================================================
-- 2) RPC: auto_confirm_sale
-- Mezat bittikten 5 saniye sonra otomatik onay
-- Eğer ilan sahibi manuel onaylamamışsa, sistem onaylar
-- =====================================================
create or replace function public.auto_confirm_sale(p_auction_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_auction record;
  v_seconds_since_end numeric;
  v_auto_confirm_seconds int := 5;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;

  -- Sadece sold_pending_confirmation durumundaysa
  if v_auction.status <> 'sold_pending_confirmation' then
    return json_build_object('success', true, 'not_pending', true);
  end if;

  -- Zaten seller onayladıysa bir şey yapma
  if v_auction.seller_confirmed = true then
    return json_build_object('success', true, 'already_confirmed', true);
  end if;

  -- Zaman kontrolü: ended_at + 5 saniye geçti mi?
  v_seconds_since_end := EXTRACT(EPOCH FROM (now() - v_auction.ended_at));

  if v_seconds_since_end < v_auto_confirm_seconds then
    return json_build_object(
      'success', true,
      'waiting', true,
      'seconds_until_auto', v_auto_confirm_seconds - v_seconds_since_end
    );
  end if;

  -- Otomatik onay
  update public.auctions
  set status = 'sold',
      seller_confirmed = true,
      seller_confirmed_at = now(),
      final_price = current_price,
      ended_at = coalesce(ended_at, now())
  where id = p_auction_id;

  -- Vehicles tablosunu güncelle
  update public.vehicles
  set status = 'sold',
      sold_at = now(),
      final_price = (select current_price from public.auctions where id = p_auction_id)
  where id = v_auction.vehicle_id;

  -- Kazanan seat hold: won
  update public.auction_seat_holds
  set status = 'won'
  where auction_id = p_auction_id and user_id = v_auction.winner_id and status = 'holding';

  -- İletişim bilgileri otomatik aç (24 saatlik bekleme yok)
  update public.auctions
  set contact_reveal_approved_at = now(),
      contact_revealed_to = winner_id
  where id = p_auction_id;

  return json_build_object(
    'success', true,
    'auto_confirmed', true,
    'auction_id', p_auction_id,
    'final_price', v_auction.current_price
  );
end $$;

grant execute on function public.auto_confirm_sale(uuid) to authenticated;

-- =====================================================
-- 3) tick_auction_lifecycle güncelle (auto_confirm_sale ekle)
-- =====================================================
create or replace function public.tick_auction_lifecycle()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
  v_last_bid record;
  v_auto_hours int;
  v_vehicle_id uuid;
begin
  -- scheduled → live
  for rec in
    select id, duration_minutes
    from public.auctions
    where status = 'scheduled' and start_at <= now()
  loop
    update public.auctions
      set status = 'live',
          live_started_at = now(),
          live_ends_at = now() + (rec.duration_minutes || ' minutes')::interval
      where id = rec.id;
  end loop;

  -- live → ended (auto-finalize)
  for rec in
    select id, vehicle_id, current_price, live_ends_at
    from public.auctions
    where status = 'live'
      and live_ends_at is not null
      and live_ends_at <= now()
  loop
    select * into v_last_bid
    from public.bids
    where auction_id = rec.id and is_winning = true
    limit 1;

    v_vehicle_id := rec.vehicle_id;

    if v_last_bid is not null then
      update public.auctions
        set status = 'sold_pending_confirmation',
            ended_at = now(),
            final_price = rec.current_price,
            winner_id = v_last_bid.bidder_id,
            winning_bid_id = v_last_bid.id
        where id = rec.id;

      update public.vehicles
        set status = 'sold',
            sold_at = now(),
            final_price = rec.current_price
        where id = v_vehicle_id;

      update public.auction_seat_holds
        set status = 'forfeited'
        where auction_id = rec.id and user_id = v_last_bid.bidder_id and status = 'holding';

      update public.profiles p
        set wallet_balance = p.wallet_balance + ash.amount
        from public.auction_seat_holds ash
        where ash.user_id = p.id
          and ash.auction_id = rec.id
          and ash.status = 'holding'
          and ash.user_id <> v_last_bid.bidder_id;

      update public.auction_seat_holds
        set status = 'released', released_at = now()
        where auction_id = rec.id and status = 'holding' and user_id <> v_last_bid.bidder_id;
    else
      update public.auctions
        set status = 'ended', ended_at = now()
        where id = rec.id;

      update public.vehicles set status = 'expired'
      where id = v_vehicle_id and status = 'active';

      update public.profiles p
        set wallet_balance = p.wallet_balance + ash.amount
        from public.auction_seat_holds ash
        where ash.user_id = p.id
          and ash.auction_id = rec.id
          and ash.status = 'holding';

      update public.auction_seat_holds
        set status = 'released', released_at = now()
        where auction_id = rec.id and status = 'holding';
    end if;
  end loop;

  -- sold_pending_confirmation → sold (5 saniye sonra otomatik onay)
  for rec in
    select id, ended_at
    from public.auctions
    where status = 'sold_pending_confirmation'
      and ended_at is not null
      and EXTRACT(EPOCH FROM (now() - ended_at)) >= 5
      and (seller_confirmed = false or seller_confirmed is null)
  loop
    perform public.auto_confirm_sale(rec.id);
  end loop;
end $$;

grant execute on function public.tick_auction_lifecycle() to anon, authenticated;
