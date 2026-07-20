-- =====================================================
-- Migration 43: Cüzdan gelir/kazanç kayıtları
-- arabamabak - deduct_wallet_for_listing + auction kazançları
-- =====================================================
-- Bu migration:
--   1) RPC: deduct_wallet_for_listing (ilan verme ücreti)
--   2) finalize_auction'da kazanan için transaction kaydı
--   3) auto_confirm_sale'da kazanan için transaction kaydı
-- =====================================================

-- =====================================================
-- 1) RPC: deduct_wallet_for_listing
-- İlan verme ücreti cüzdandan kesilir, transactions'a kayıt düşer
-- =====================================================
create or replace function public.deduct_wallet_for_listing(
  p_user_id uuid,
  p_amount numeric,
  p_vehicle_id uuid,
  p_description text default 'İlan verme ücreti'
)
returns json
language plpgsql
security definer
as $$
declare
  v_balance numeric;
  v_tx_id uuid;
begin
  -- Mevcut bakiyeyi kilitle
  select wallet_balance into v_balance from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Kullanici bulunamadi'; end if;
  if v_balance < p_amount then
    raise exception 'Yetersiz bakiye. Mevcut: % TL, Gerekli: % TL', v_balance, p_amount;
  end if;

  -- Bakiye düş
  update public.profiles set wallet_balance = wallet_balance - p_amount
    where id = p_user_id;

  -- Transaction kaydı
  insert into public.transactions (
    user_id, type, amount, status, payment_method,
    description, related_vehicle_id, balance_after, completed_at
  ) values (
    p_user_id, 'premium_payment', p_amount, 'completed', 'wallet',
    p_description, p_vehicle_id, v_balance - p_amount, now()
  ) returning id into v_tx_id;

  return json_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'remaining_balance', v_balance - p_amount
  );
end $$;

grant execute on function public.deduct_wallet_for_listing(uuid, numeric, uuid, text) to authenticated;

-- =====================================================
-- 2) finalize_auction - kazanan transaction kaydı
-- (Mevcut RPC'yi drop edip yeniden oluşturuyoruz)
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
  v_seat_fee numeric;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;
  if v_auction.status <> 'live' then raise exception 'Mezat zaten bitmis'; end if;

  v_winning_bid := v_auction.winning_bid_id;
  v_final_price := v_auction.current_price;
  v_seat_fee := coalesce(v_auction.seat_hold_fee, 0);

  if v_winning_bid is not null then
    select bidder_id into v_winner from public.bids where id = v_winning_bid;
    select wallet_balance into v_balance from public.profiles where id = v_winner;

    -- Kazanan seat hold: forfeited
    update public.auction_seat_holds
    set status = 'won'
    where auction_id = p_auction_id and user_id = v_winner and status = 'holding';

    -- Kazanan için transactions kaydı (site kazancı)
    insert into public.transactions (
      user_id, type, amount, status, payment_method,
      description, related_auction_id, related_vehicle_id,
      balance_after, completed_at
    ) values (
      v_winner, 'auction_payment', v_seat_fee, 'completed', 'seat_forfeit',
      'Açık arttırma kazanan - modül ücreti',
      p_auction_id, v_auction.vehicle_id,
      v_balance, now()
    );

    insert into public.auction_seat_transactions
      (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
    select id, auction_id, user_id, amount, 'forfeit', v_balance
    from public.auction_seat_holds
    where auction_id = p_auction_id and user_id = v_winner and status = 'won';

    -- Diğer katılımcıların blokesi çöz
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
    set status = 'sold_pending_confirmation', final_price = v_final_price,
        winner_id = v_winner, ended_at = now()
    where id = p_auction_id;

    update public.vehicles
    set status = 'sold', sold_at = now(), final_price = v_final_price
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

    update public.auctions set status = 'ended', ended_at = now()
    where id = p_auction_id;

    update public.vehicles set status = 'expired'
    where id = v_auction.vehicle_id and status = 'active';
  end if;

  return json_build_object('success', true, 'winner_id', v_winner, 'final_price', v_final_price);
end $$;

-- =====================================================
-- 3) auto_confirm_sale - kazanan transaction kaydı
-- finalize_auction'da kayıt atıldıysa burada atmayız
-- ama güvenlik için tekrar kontrol edelim
-- =====================================================
create or replace function public.auto_confirm_sale(p_auction_id uuid)
returns json
language plpgsql
security definer
as $$
declare v_auction record; v_seconds_since_end numeric; v_auto_confirm_seconds int := 5;
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;
  if v_auction.status <> 'sold_pending_confirmation' then return json_build_object('success', true, 'not_pending', true); end if;
  if v_auction.seller_confirmed = true then return json_build_object('success', true, 'already_confirmed', true); end if;
  v_seconds_since_end := EXTRACT(EPOCH FROM (now() - v_auction.ended_at));
  if v_seconds_since_end < v_auto_confirm_seconds then return json_build_object('success', true, 'waiting', true, 'seconds_until_auto', v_auto_confirm_seconds - v_seconds_since_end); end if;

  update public.auctions set status = 'sold', seller_confirmed = true, seller_confirmed_at = now(), final_price = current_price, ended_at = coalesce(ended_at, now()) where id = p_auction_id;
  update public.vehicles set status = 'sold', sold_at = now(), final_price = (select current_price from public.auctions where id = p_auction_id) where id = v_auction.vehicle_id;
  update public.auction_seat_holds set status = 'won' where auction_id = p_auction_id and user_id = v_auction.winner_id and status = 'holding';
  update public.auctions set contact_reveal_approved_at = now(), contact_revealed_to = winner_id where id = p_auction_id;

  -- finalize_auction'da zaten transaction kaydı atıldı, burada atmayız

  return json_build_object('success', true, 'auto_confirmed', true, 'auction_id', p_auction_id, 'final_price', v_auction.current_price);
end $$;
