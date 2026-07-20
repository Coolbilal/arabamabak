-- =====================================================
-- Migration 33: Açık Arttırma - Sınırsız Masa + RPC'ler
-- arabamabak - Açık arttırma düzeltmeleri
-- =====================================================
-- Bu migration:
--   1) auction_seat_holds unique constraint kaldır (sınırsız kişi masada)
--   2) site_settings tablosuna yeni ayar kolonları
--   3) RPC: place_bid, join_table, leave_table, finalize_auction
-- =====================================================

-- =====================================================
-- 1) AUCTION_SEAT_HOLDS - UNIQUE CONSTRAINT KALDIR
-- =====================================================
-- Eski: unique(auction_id, user_id) -> 1 kullanıcı 1 mezatta 1 koltuk
-- Yeni: sınırsız kişi aynı anda masaya oturabilir
alter table public.auction_seat_holds drop constraint if exists auction_seat_holds_auction_id_user_id_key;

-- =====================================================
-- 2) SITE_SETTINGS - YENİ KOLONLAR (yoksa ekle)
-- =====================================================
do $$ begin
  alter table public.site_settings add column if not exists default_seat_hold_fee numeric(10,2) default 500;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.site_settings add column if not exists default_bid_increment numeric(10,2) default 100;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.site_settings add column if not exists default_auction_duration_minutes int default 30;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 3) RPC: place_bid
-- Teklif verme: atomik işlem
-- - Kullanıcı masada olmalı (seat_hold status=holding)
-- - Son teklif + bid_increment >= amount
-- - Kendi ilanına teklif veremez
-- - auction.current_price güncellenir
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
  v_existing_winning_bid uuid;
begin
  -- Auction kontrol
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadı'; end if;
  if v_auction.status <> 'live' then raise exception 'Mezat canlı değil'; end if;

  -- Kendi ilanına teklif veremez
  if v_auction.seller_id = (select seller_id from public.vehicles where id = v_auction.vehicle_id) then
    -- vehicle.seller_id kontrolü
    if exists (select 1 from public.vehicles where id = v_auction.vehicle_id and seller_id = v_user_id) then
      raise exception 'Kendi ilanınıza teklif veremezsiniz';
    end if;
  end if;

  -- Kullanıcı masada olmalı (status=holding)
  select * into v_seat from public.auction_seat_holds
  where auction_id = p_auction_id and user_id = v_user_id and status = 'holding'
  for update;
  if not found then raise exception 'Teklif vermek için masaya oturmalısınız'; end if;

  -- Miktar kontrolü: son teklif + bid_increment
  if p_amount < v_auction.current_price + v_auction.bid_increment then
    raise exception 'Teklif en az % TL olmalı', v_auction.current_price + v_auction.bid_increment;
  end if;

  -- Eski kazanan teklifi güncelle
  update public.bids set is_winning = false
  where auction_id = p_auction_id and is_winning = true
  returning id into v_existing_winning_bid;

  -- Yeni teklif ekle
  insert into public.bids (auction_id, bidder_id, amount, is_winning)
  values (p_auction_id, v_user_id, p_amount, true)
  returning id into v_new_bid_id;

  -- Auction güncelle
  update public.auctions
  set current_price = p_amount,
      winning_bid_id = v_new_bid_id,
      total_bids = total_bids + 1
  where id = p_auction_id;

  -- Kullanıcının seat_hold.bid_id güncelle
  update public.auction_seat_holds set bid_id = v_new_bid_id
  where id = v_seat.id;

  return json_build_object(
    'success', true,
    'bid_id', v_new_bid_id,
    'current_price', p_amount
  );
end $$;

-- =====================================================
-- 4) RPC: join_table (Masaya Otur)
-- - Bakiye kontrolü
-- - seat_hold oluştur (status=holding)
-- - Cüzdandan bloke yap
-- =====================================================
create or replace function public.join_table(p_auction_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_auction record;
  v_balance numeric;
  v_fee numeric;
  v_seat_id uuid;
begin
  -- Auction kontrol
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadı'; end if;
  if v_auction.status not in ('live', 'scheduled') then
    raise exception 'Mezat şu anda masaya açık değil';
  end if;

  -- Bakiye kontrol
  select wallet_balance into v_balance from public.profiles where id = v_user_id;
  v_fee := v_auction.seat_hold_fee;

  if v_balance < v_fee then
    raise exception 'Yetersiz bakiye. Modül ücreti: % TL, Mevcut: % TL', v_fee, v_balance;
  end if;

  -- Zaten masada mı?
  if exists (
    select 1 from public.auction_seat_holds
    where auction_id = p_auction_id and user_id = v_user_id and status = 'holding'
  ) then
    raise exception 'Zaten masada oturuyorsunuz';
  end if;

  -- Bakiyeden bloke yap
  update public.profiles set wallet_balance = wallet_balance - v_fee where id = v_user_id;

  -- seat_hold oluştur
  insert into public.auction_seat_holds (auction_id, user_id, amount, status)
  values (p_auction_id, v_user_id, v_fee, 'holding')
  returning id into v_seat_id;

  -- Audit
  insert into public.auction_seat_transactions
    (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
  values
    (v_seat_id, p_auction_id, v_user_id, v_fee, 'hold', v_balance - v_fee);

  return json_build_object(
    'success', true,
    'seat_id', v_seat_id,
    'fee', v_fee,
    'remaining_balance', v_balance - v_fee
  );
end $$;

-- =====================================================
-- 5) RPC: leave_table (Masadan Ayrıl)
-- - Son teklif sahibi DEĞİLSE bloke çözülür
-- - Son teklif sahibiyse hata
-- =====================================================
create or replace function public.leave_table(p_auction_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_user_id uuid := auth.uid();
  v_seat record;
  v_balance numeric;
begin
  -- Kullanıcının aktif seat_hold'ı bul
  select * into v_seat from public.auction_seat_holds
  where auction_id = p_auction_id and user_id = v_user_id and status = 'holding'
  for update;
  if not found then raise exception 'Masada oturmuyorsunuz'; end if;

  -- Son teklif sahibi mi?
  if exists (
    select 1 from public.auctions
    where id = p_auction_id and winning_bid_id = v_seat.bid_id
  ) then
    raise exception 'Son teklifi siz verdiniz. Yeni bir teklif gelene kadar masadan ayrılamazsınız';
  end if;

  -- Mevcut bakiye
  select wallet_balance into v_balance from public.profiles where id = v_user_id;

  -- Bloke çöz
  update public.profiles set wallet_balance = wallet_balance + v_seat.amount where id = v_user_id;

  -- seat_hold güncelle
  update public.auction_seat_holds
  set status = 'left_auction', left_at = now(), released_at = now()
  where id = v_seat.id;

  -- Audit
  insert into public.auction_seat_transactions
    (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
  values
    (v_seat.id, p_auction_id, v_user_id, v_seat.amount, 'release', v_balance + v_seat.amount);

  return json_build_object(
    'success', true,
    'released_amount', v_seat.amount,
    'new_balance', v_balance + v_seat.amount
  );
end $$;

-- =====================================================
-- 6) RPC: finalize_auction (Mezat Bitir)
-- - Kazanan belirlenir
-- - Kazanandan modül ücreti kesilir
-- - Diğer masadakilerin blokesi çözülür
-- - Status = ended / sold_pending_confirmation
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
begin
  -- Auction
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadı'; end if;
  if v_auction.status <> 'live' then raise exception 'Mezat zaten bitmiş'; end if;

  v_winning_bid := v_auction.winning_bid_id;

  -- Kazanan belirle
  if v_winning_bid is not null then
    select bidder_id into v_winner from public.bids where id = v_winning_bid;

    -- Kazanandan modül ücreti kes (zaten bloke edilmişti, audit için)
    select wallet_balance into v_balance from public.profiles where id = v_winner;

    update public.auction_seat_holds
    set status = 'won'
    where auction_id = p_auction_id and user_id = v_winner and status = 'holding';

    insert into public.auction_seat_transactions
      (seat_hold_id, auction_id, user_id, amount, transaction_type, balance_after)
    select id, auction_id, user_id, amount, 'forfeit', v_balance
    from public.auction_seat_holds
    where auction_id = p_auction_id and user_id = v_winner and status = 'won';

    -- Diğer masadakilerin blokesi çöz
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

    -- Auction güncelle
    update public.auctions
    set status = 'sold_pending_confirmation',
        final_price = v_auction.current_price,
        winner_id = v_winner,
        ended_at = now()
    where id = p_auction_id;
  else
    -- Kazanan yok: tüm blokesi çöz
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
  end if;

  return json_build_object(
    'success', true,
    'winner_id', v_winner,
    'final_price', v_auction.current_price
  );
end $$;

-- =====================================================
-- 7) RLS - RPC'leri authenticated'lara aç
-- =====================================================
grant execute on function public.place_bid(uuid, numeric) to authenticated;
grant execute on function public.join_table(uuid) to authenticated;
grant execute on function public.leave_table(uuid) to authenticated;
grant execute on function public.finalize_auction(uuid) to authenticated;
