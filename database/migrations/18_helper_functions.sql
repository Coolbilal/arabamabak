-- =====================================================
-- Migration 18: Helper Functions
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   is_admin, is_super_admin, is_valet, is_expertise_dealership,
--   set_slug, normalize_plate, generate_search_vector
-- =====================================================

-- =====================================================
-- 1) is_admin
-- Verilen user_id aktif admin mi kontrol eder
-- =====================================================
create or replace function public.is_admin(check_user uuid)
returns boolean language sql security definer as $$
  select exists(
    select 1 from public.admin_users
    where user_id = check_user and is_active = true
  );
$$;

-- =====================================================
-- 2) is_super_admin
-- Super admin mi kontrol eder
-- =====================================================
create or replace function public.is_super_admin(check_user uuid)
returns boolean language sql security definer as $$
  select exists(
    select 1 from public.admin_users
    where user_id = check_user and is_active = true and is_super_admin = true
  );
$$;

-- =====================================================
-- 3) is_valet
-- Kullanıcı aktif vale mi kontrol eder
-- =====================================================
create or replace function public.is_valet(check_user uuid)
returns boolean language sql security definer as $$
  select exists(
    select 1 from public.expert_valets
    where user_id = check_user and is_active = true and deleted_at is null
  );
$$;

-- =====================================================
-- 4) is_expertise_dealership
-- Kullanıcı aktif ekspertiz bayisi mi kontrol eder
-- =====================================================
create or replace function public.is_expertise_dealership(check_user uuid)
returns boolean language sql security definer as $$
  select exists(
    select 1 from public.expertise_dealerships ed
    join public.profiles p on p.expertise_dealership_id = ed.id
    where p.id = check_user and ed.status = 'active' and ed.deleted_at is null
  );
$$;

-- =====================================================
-- 5) is_auction_winner
-- Verilen kullanıcı bu mezatı kazandı mı?
-- =====================================================
create or replace function public.is_auction_winner(p_auction_id uuid, check_user uuid)
returns boolean language sql security definer as $$
  select exists(
    select 1 from public.auctions
    where id = p_auction_id and winner_id = check_user
  );
$$;

-- =====================================================
-- 6) get_user_account_type
-- Kullanıcının hesap tipini döndürür
-- =====================================================
create or replace function public.get_user_account_type(check_user uuid)
returns user_account_type language sql security definer as $$
  select account_type from public.profiles where id = check_user;
$$;

-- =====================================================
-- 7) set_slug
-- Başlıktan SEO dostu slug üretir
-- =====================================================
create or replace function public.set_slug()
returns trigger as $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(
      regexp_replace(
        regexp_replace(
          coalesce(new.title, ''),
          '[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s-]', '', 'g'
        ),
        '\s+', '-', 'g'
      )
    );
    -- Türkçe karakterleri dönüştür
    new.slug := translate(new.slug,
      'ğüşıöçĞÜŞİÖÇ', 'gusiocGUSIOC');
    new.slug := trim(both '-' from new.slug);
  end if;
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- 8) update_search_vector
-- vehicles.search_tsv alanını günceller (full-text search)
-- =====================================================
create or replace function public.update_search_vector()
returns trigger as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('turkish', coalesce(new.title, '')), 'A') ||
    setweight(to_tsvector('turkish', coalesce(new.description, '')), 'B') ||
    setweight(to_tsvector('turkish', coalesce(new.city, '')), 'C');
  return new;
end;
$$ language plpgsql;

-- =====================================================
-- 9) normalize_plate
-- Plakayı büyük harf, boşluksuz formata çevirir
-- =====================================================
create or replace function public.normalize_plate(p_plate text)
returns text language sql immutable as $$
  select upper(regexp_replace(coalesce(p_plate, ''), '\s+', '', 'g'));
$$;

-- =====================================================
-- 10) get_setting
-- site_settings'den tek değer okumak için
-- =====================================================
create or replace function public.get_setting(setting_key text)
returns text language sql security definer as $$
  select case setting_key
    when 'auction_seat_capacity' then auction_seat_capacity::text
    when 'auction_seat_hold_fee' then auction_seat_hold_fee::text
    when 'auction_anti_snipe_seconds' then auction_anti_snipe_seconds::text
    when 'auction_default_duration_minutes' then auction_default_duration_minutes::text
    when 'auction_seller_auto_approval_hours' then auction_seller_auto_approval_hours::text
    when 'free_listing_duration_days' then free_listing_duration_days::text
    when 'free_listing_user_quota' then free_listing_user_quota::text
    when 'free_listing_vote_threshold' then free_listing_vote_threshold::text
    when 'free_listing_extra_fee' then free_listing_extra_fee::text
    when 'expertise_fee' then expertise_fee::text
    when 'min_bid_increment' then min_bid_increment::text
    else null
  end
  from public.site_settings where id = 1;
$$;
