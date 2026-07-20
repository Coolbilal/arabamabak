-- =====================================================
-- Migration 36: finalize_auction güncelleme
-- arabamabak - Mezat bitince vehicles.status='sold' yap
-- =====================================================
-- Bu migration:
--   finalize_auction RPC günceller:
--     vehicles.status='sold'
--     vehicles.sold_at = now()
--     vehicles.final_price = auction.final_price
--   Böylece /kategori/sold ve /arac-deger sayfaları
--   açık arttırmada satılan araçları otomatik görür
-- =====================================================

create or replace function public.finalize_auction(p_auction_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_auction record;
  v_winner uuid;
  v_winning_bid uuid;
  v_seat record;
  v_balance numeric;
  v_final_price numeric;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;
  if v_auction.status <> 'live' then raise exception 'Mezat zaten bitmis'; end if;

  v_winning_bid := v_auction.winning_bid_id;
  v_final_price := v_auction.current_price;

  if v_winning_bid is not null then
    select bidder_id into v_winner from public.bids where id = v_winning_bid;

    select wallet_balance into v_balance from public.profiles where id = v_winner;

    update public.auction_seat_holds
    set status = 'won'
    where auction_id = p_auction_id and user_id = v_winner and status = 'holding';

    insert into public.auction_seat_transactions
      (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
    select id, auction_id, user_id, amount, 'forfeit', v_balance
    from public.auction_seat_holds
    where auction_id = p_auction_id and user_id = v_winner and status = 'won';

    for v_seat in
      select * from public.auction_seat_holds
      where auction_id = p_auction_id and status = 'holding' and user_id <> v_winner
    loop
      select wallet_balance into v_balance from public.profiles where id = v_seat.user_id;
      update public.profiles set wallet_balance = wallet_balance + v_seat.amount
        where id = v_seat.user_id;
      update public.auction_seat_holds set status = 'released', released_at = now()
        where id = v_seat.id;
      insert into public.auction_seat_transactions
        (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
      values (v_seat.id, p_auction_id, v_seat.user_id, v_seat.amount, 'release', v_balance + v_seat.amount);
    end loop;

    update public.auctions
    set status = 'sold_pending_confirmation',
        final_price = v_final_price,
        winner_id = v_winner,
        ended_at = now()
    where id = p_auction_id;

    -- vehicles tablosunu da güncelle
    update public.vehicles
    set status = 'sold',
        sold_at = now(),
        final_price = v_final_price
    where id = v_auction.vehicle_id;
  else
    for v_seat in
      select * from public.auction_seat_holds
      where auction_id = p_auction_id and status = 'holding'
    loop
      select wallet_balance into v_balance from public.profiles where id = v_seat.user_id;
      update public.profiles set wallet_balance = wallet_balance + v_seat.amount
        where id = v_seat.user_id;
      update public.auction_seat_holds set status = 'released', released_at = now()
        where id = v_seat.id;
      insert into public.auction_seat_transactions
        (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
      values (v_seat.id, p_auction_id, v_seat.user_id, v_seat.amount, 'release', v_balance + v_seat.amount);
    end loop;

    update public.auctions
    set status = 'ended',
        ended_at = now()
    where id = p_auction_id;

    -- Kazanan yoksa vehicles.status='sold' yapma, ama pasif yap
    update public.vehicles
    set status = 'expired'
    where id = v_auction.vehicle_id and status = 'active';
  end if;

  return json_build_object(
    'success', true,
    'winner_id', v_winner,
    'final_price', v_final_price
  );
end $$;
