-- =====================================================
-- Migration 19: Trigger Functions
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   touch_updated_at (tüm tablolarda)
--   handle_new_user (yeni kullanıcı → profile)
--   set_slug_trigger (vehicles)
--   search_vector_trigger (vehicles)
--   validate_bid (bids)
--   extend_auction_on_late_bid (bids)
--   wallet_balance_update (transactions)
--   favorite_count_sync (favorites)
-- =====================================================

-- =====================================================
-- 1) touch_updated_at
-- updated_at otomatik güncelleme
-- =====================================================
create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Tüm tablolara uygula
drop trigger if exists trg_touch_profiles on public.profiles;
create trigger trg_touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_vehicles on public.vehicles;
create trigger trg_touch_vehicles before update on public.vehicles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_vehicle_images on public.vehicle_images;
create trigger trg_touch_vehicle_images before update on public.vehicle_images
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_site_settings on public.site_settings;
create trigger trg_touch_site_settings before update on public.site_settings
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_site_themes on public.site_themes;
create trigger trg_touch_site_themes before update on public.site_themes
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_admin_users on public.admin_users;
create trigger trg_touch_admin_users before update on public.admin_users
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_dealerships on public.dealerships;
create trigger trg_touch_dealerships before update on public.dealerships
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_expertise_dealerships on public.expertise_dealerships;
create trigger trg_touch_expertise_dealerships before update on public.expertise_dealerships
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_expert_valets on public.expert_valets;
create trigger trg_touch_expert_valets before update on public.expert_valets
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_expertise_requests on public.expertise_requests;
create trigger trg_touch_expertise_requests before update on public.expertise_requests
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_transactions on public.transactions;
create trigger trg_touch_transactions before update on public.transactions
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_conversations on public.conversations;
create trigger trg_touch_conversations before update on public.conversations
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_saved_searches on public.saved_searches;
create trigger trg_touch_saved_searches before update on public.saved_searches
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_vehicle_reports on public.vehicle_reports;
create trigger trg_touch_vehicle_reports before update on public.vehicle_reports
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_email_templates on public.email_templates;
create trigger trg_touch_email_templates before update on public.email_templates
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_ad_campaigns on public.ad_campaigns;
create trigger trg_touch_ad_campaigns before update on public.ad_campaigns
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_auction_seat_holds on public.auction_seat_holds;
create trigger trg_touch_auction_seat_holds before update on public.auction_seat_holds
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_auction_promotion_requests on public.auction_promotion_requests;
create trigger trg_touch_auction_promotion_requests before update on public.auction_promotion_requests
  for each row execute function public.touch_updated_at();

-- =====================================================
-- 2) handle_new_user
-- Yeni kullanıcı kaydında otomatik profile oluştur
-- =====================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (
    id, email, full_name, role, email_verified_at, wallet_balance
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    'user',
    new.email_confirmed_at,
    1000  -- başlangıç cüzdan bakiyesi
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================
-- 3) vehicles set_slug (insert/update'de slug otomatik)
-- =====================================================
drop trigger if exists trg_vehicles_set_slug on public.vehicles;
create trigger trg_vehicles_set_slug
  before insert or update of title on public.vehicles
  for each row
  when (new.slug is null or new.slug = '')
  execute function public.set_slug();

-- =====================================================
-- 4) vehicles search_vector (insert/update'de güncelle)
-- =====================================================
drop trigger if exists trg_vehicles_search_vector on public.vehicles;
create trigger trg_vehicles_search_vector
  before insert or update of title, description, city on public.vehicles
  for each row execute function public.update_search_vector();

-- =====================================================
-- 5) on_new_bid
-- Yeni teklif gelince auction güncelle, anti-snipe uygula
-- =====================================================
create or replace function public.on_new_bid()
returns trigger as $$
declare
  v_min_bid numeric(12,2);
  v_auction_status auction_status;
  v_auction_ends timestamptz;
  v_anti_snipe int;
begin
  -- Auction durumunu kontrol et
  select status, live_ends_at, anti_snipe_seconds
    into v_auction_status, v_auction_ends, v_anti_snipe
    from public.auctions where id = new.auction_id;

  if v_auction_status != 'live' then
    raise exception 'Mezat şu an canlı değil';
  end if;

  -- Minimum teklif kontrolü
  v_min_bid := (
    select current_price + bid_increment
    from public.auctions where id = new.auction_id
  );
  if new.amount < v_min_bid then
    raise exception 'Teklif minimum % TL olmalı', v_min_bid;
  end if;

  -- Auction güncelle
  update public.auctions
    set current_price = new.amount,
        total_bids = total_bids + 1
    where id = new.auction_id;

  -- Eski teklifleri winning=false yap
  update public.bids
    set is_winning = false
    where auction_id = new.auction_id and id != new.id;

  new.is_winning := true;

  -- Anti-snipe: son X saniyede teklif gelirse süreyi uzat
  if v_auction_ends is not null and v_anti_snipe is not null and v_anti_snipe > 0 then
    if v_auction_ends - now() <= (v_anti_snipe || ' seconds')::interval then
      update public.auctions
        set live_ends_at = v_auction_ends + (v_anti_snipe || ' seconds')::interval
        where id = new.auction_id;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_on_new_bid on public.bids;
create trigger trg_on_new_bid before insert on public.bids
  for each row execute function public.on_new_bid();

-- =====================================================
-- 6) wallet_balance_update
-- Transaction tamamlanınca cüzdan bakiyesi güncelle
-- =====================================================
create or replace function public.wallet_balance_update()
returns trigger as $$
begin
  if new.status = 'completed' and (old.status is null or old.status != 'completed') then
    if new.type in ('deposit', 'refund', 'auction_payment', 'premium_payment', 'expertise_payment') then
      -- Cüzdana para girişi (auction_payment ve premium_payment ters mantık olabilir, bağlama göre)
      update public.profiles
        set wallet_balance = wallet_balance + new.amount,
            balance_after := new.balance_after
        where id = new.user_id;
    elsif new.type in ('withdraw', 'payment') then
      -- Cüzdandan para çıkışı
      update public.profiles
        set wallet_balance = wallet_balance - new.amount
        where id = new.user_id;
    end if;

    new.completed_at := now();
    new.balance_after := (
      select wallet_balance from public.profiles where id = new.user_id
    );
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_wallet_balance_update on public.transactions;
create trigger trg_wallet_balance_update
  before update on public.transactions
  for each row execute function public.wallet_balance_update();

-- =====================================================
-- 7) on_favorite_change
-- Favori sayısı senkronizasyonu
-- =====================================================
create or replace function public.on_favorite_change()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.vehicles set favorite_count = favorite_count + 1
      where id = new.vehicle_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.vehicles set favorite_count = greatest(0, favorite_count - 1)
      where id = old.vehicle_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_favorite_change on public.favorites;
create trigger trg_favorite_change after insert or delete on public.favorites
  for each row execute function public.on_favorite_change();

-- =====================================================
-- 8) on_free_listing_vote
-- Oy sayısı senkronizasyonu
-- =====================================================
create or replace function public.on_free_listing_vote()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.vehicles
      set vote_count_high = vote_count_high + (case when new.vote_type = 'price_too_high' then 1 else 0 end),
          vote_count_low = vote_count_low + (case when new.vote_type = 'price_too_low' then 1 else 0 end),
          vote_count_fair = vote_count_fair + (case when new.vote_type = 'fair_price' then 1 else 0 end)
      where id = new.vehicle_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.vehicles
      set vote_count_high = greatest(0, vote_count_high - (case when old.vote_type = 'price_too_high' then 1 else 0 end)),
          vote_count_low = greatest(0, vote_count_low - (case when old.vote_type = 'price_too_low' then 1 else 0 end)),
          vote_count_fair = greatest(0, vote_count_fair - (case when old.vote_type = 'fair_price' then 1 else 0 end))
      where id = old.vehicle_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_free_listing_vote on public.free_listing_votes;
create trigger trg_free_listing_vote after insert or delete on public.free_listing_votes
  for each row execute function public.on_free_listing_vote();

-- =====================================================
-- 9) auto_approve_auction_sale
-- Mezat bittikten sonra satıcı onaylamazsa otomatik onay
-- Cron tarafından çağrılacak fonksiyon
-- =====================================================
create or replace function public.auto_approve_auction_sale()
returns void language plpgsql as $$
declare
  rec record;
  v_auto_hours int;
begin
  v_auto_hours := (
    select auction_seller_auto_approval_hours
    from public.site_settings where id = 1
  );

  for rec in
    select id, vehicle_id, winner_id, final_price
    from public.auctions
    where status = 'ended'
      and seller_confirmed = false
      and seller_auto_approval_at is not null
      and seller_auto_approval_at <= now()
  loop
    update public.auctions
      set seller_confirmed = true,
          seller_confirmed_at = now(),
          status = 'ended'
      where id = rec.id;

    update public.vehicles
      set status = 'sold',
          published_at = coalesce(published_at, now())
      where id = rec.vehicle_id;
  end loop;
end;
$$;

-- =====================================================
-- 10) tick_auction_lifecycle
-- scheduled → live, live → ended geçişlerini yapar
-- Cron tarafından her dakika çağrılacak
-- =====================================================
create or replace function public.tick_auction_lifecycle()
returns void language plpgsql as $$
declare
  rec record;
  v_last_bid record;
  v_auto_hours int;
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
  v_auto_hours := (
    select auction_seller_auto_approval_hours
    from public.site_settings where id = 1
  );

  for rec in
    select id, vehicle_id, current_price, live_ends_at
    from public.auctions
    where status = 'live'
      and live_ends_at is not null
      and live_ends_at <= now()
  loop
    -- Son teklif
    select bidder_id, amount into v_last_bid
    from public.bids
    where auction_id = rec.id
    order by amount desc, created_at desc
    limit 1;

    -- Auction'ı kapat
    update public.auctions
      set status = 'ended',
          ended_at = now(),
          winner_id = v_last_bid.bidder_id,
          final_price = coalesce(v_last_bid.amount, rec.current_price),
          winning_bid_id = (
            select id from public.bids
            where auction_id = rec.id
            order by amount desc, created_at desc limit 1
          ),
          seller_auto_approval_at = now() + (v_auto_hours || ' hours')::interval
      where id = rec.id;

    -- Vehicle'ı güncelle
    if v_last_bid.bidder_id is not null then
      update public.vehicles
        set status = 'sold_pending_confirmation'
        where id = rec.vehicle_id;
    else
      update public.vehicles
        set status = 'expired'
        where id = rec.vehicle_id;
    end if;

    -- Kazanan seat hold: forfeited (bloke kesilecek, transactions'a düşecek)
    update public.auction_seat_holds
      set status = 'forfeited'
      where auction_id = rec.id and user_id = v_last_bid.bidder_id and status = 'holding';

    -- Diğer seat hold'lar: released (bloke çözülecek)
    update public.auction_seat_holds
      set status = 'released', released_at = now()
      where auction_id = rec.id and user_id != v_last_bid.bidder_id and status = 'holding';
  end loop;
end;
$$;
