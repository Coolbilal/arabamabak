-- =====================================================
-- Migration 34: İlan Sahibi Onay Mekanizması
-- arabamabak - İletişim bilgileri onay akışı
-- =====================================================
-- Bu migration:
--   1) auctions.contact_reveal_approved_at (onay anı)
--   2) auctions.contact_revealed_to (kazanan user_id, audit)
--   3) RPC: seller_approve_winner (onay/red)
-- =====================================================

-- =====================================================
-- 1) AUCTIONS - YENİ KOLONLAR
-- =====================================================
do $$ begin
  alter table public.auctions add column if not exists contact_reveal_approved_at timestamptz;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.auctions add column if not exists contact_revealed_to uuid references public.profiles(id) on delete set null;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.auctions add column if not exists seller_rejected_at timestamptz;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 2) RPC: seller_approve_winner
-- Sadece ilan sahibi çağırabilir
-- Mezuniyet 'sold_pending_confirmation' durumunda olmalı
-- approve=true: contact_reveal_approved_at set, kazanan user_id set
-- approve=false: seller_rejected_at set, ilan 'cancelled' veya 'ended' yapılabilir
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
  -- Auction
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;

  -- İlan sahibi mi?
  select * into v_vehicle from public.vehicles where id = v_auction.vehicle_id;
  if v_vehicle.seller_id <> v_user_id then
    raise exception 'Sadece ilan sahibi onay verebilir';
  end if;

  -- Durum kontrolu
  if v_auction.status not in ('sold_pending_confirmation', 'ended') then
    raise exception 'Mezat henuz bitmemis veya onaylanmamis';
  end if;

  v_winning_bid := v_auction.winning_bid_id;
  if v_winning_bid is null then
    raise exception 'Bu mezatta kazanan yok';
  end if;

  select bidder_id into v_winner from public.bids where id = v_winning_bid;

  if p_approve then
    -- ONAY: contact bilgileri açılır
    update public.auctions
    set contact_reveal_approved_at = now(),
        contact_revealed_to = v_winner,
        seller_rejected_at = null,
        seller_confirmed = true,
        seller_confirmed_at = now()
    where id = p_auction_id;
  else
    -- RED: ilan sahibi kazananı onaylamadı
    -- İlan 'ended' kalır, kazanan belirlenmez, blokeler zaten çözülmüştü
    update public.auctions
    set seller_rejected_at = now(),
        winner_id = null,
        winning_bid_id = null,
        final_price = null,
        status = 'ended',
        seller_confirmed = false,
        seller_confirmed_at = null
    where id = p_auction_id;
  end if;

  return json_build_object(
    'success', true,
    'approved', p_approve,
    'winner_id', v_winner,
    'auction_id', p_auction_id
  );
end $$;

grant execute on function public.seller_approve_winner(uuid, boolean) to authenticated;

-- =====================================================
-- 3) finalize_auction'u güncelle (eski 'sold' yerine 'sold_pending_confirmation')
-- Eğer daha önce 'sold' set ediyorsa düzelt
-- Aslında 33. migration'da 'sold_pending_confirmation' kullanmıştık, kontrol edelim
-- =====================================================
-- (33. migration'da zaten doğru, burada tekrar yok)
