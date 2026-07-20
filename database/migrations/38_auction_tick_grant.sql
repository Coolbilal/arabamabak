-- =====================================================
-- Migration 38: tick_auction_lifecycle GRANT + tick_rpc
-- arabamabak - Cron job yok, frontend tetikleyecek
-- =====================================================
-- pg_cron yok, bunun yerine tick RPC'yi herkes çağırabilsin
-- ve frontend'den periyodik olarak çağıralım
-- =====================================================

-- tick fonksiyonunu güvenli hale getir (sadece status değişiklikleri yapar)
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

  -- live → ended
  v_auto_hours := coalesce(
    (select auction_seller_auto_approval_hours from public.site_settings where id = 1),
    24
  );

  for rec in
    select id, vehicle_id, current_price, live_ends_at
    from public.auctions
    where status = 'live'
      and live_ends_at is not null
      and live_ends_at <= now()
  loop
    -- Son teklif kontrolü
    select * into v_last_bid
    from public.bids
    where auction_id = rec.id and is_winning = true
    limit 1;

    v_vehicle_id := rec.vehicle_id;

    if v_last_bid is not null then
      -- Kazanan var → sold_pending_confirmation
      update public.auctions
        set status = 'sold_pending_confirmation',
            ended_at = now(),
            final_price = rec.current_price,
            winner_id = v_last_bid.bidder_id,
            winning_bid_id = v_last_bid.id
        where id = rec.id;

      -- vehicles güncelle
      update public.vehicles
        set status = 'sold',
            sold_at = now(),
            final_price = rec.current_price
        where id = v_vehicle_id;

      -- Kazanan seat hold: forfeited
      update public.auction_seat_holds
        set status = 'forfeited'
        where auction_id = rec.id and user_id = v_last_bid.bidder_id and status = 'holding';

      -- Diğer seat hold'lar: released (bloke çöz)
      update public.auction_seat_holds
        set status = 'released', released_at = now()
        where auction_id = rec.id and status = 'holding' and user_id <> v_last_bid.bidder_id;

      -- Diğer kullanıcıların blokesi çöz
      update public.profiles p
        set wallet_balance = p.wallet_balance + ash.amount
        from public.auction_seat_holds ash
        where ash.id = p.id
          and ash.auction_id = rec.id
          and ash.status = 'released'
          and ash.released_at = now();
    else
      -- Kazanan yok → ended
      update public.auctions
        set status = 'ended', ended_at = now()
        where id = rec.id;

      update public.vehicles set status = 'expired'
      where id = v_vehicle_id and status = 'active';

      -- Tüm seat hold'lar released
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
end $$;

-- Grant: herkes (anon dahil) çağırabilsin, idempotent
grant execute on function public.tick_auction_lifecycle() to anon, authenticated;
