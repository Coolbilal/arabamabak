-- =====================================================
-- Migration 49: Premium auction otomatik is_premium=true
-- arabamabak - Trigger + slider interval ayarı
-- =====================================================
-- Bu migration:
--   1) vehicles tablosu trigger (premium_auction -> is_premium=true)
--   2) site_settings.premium_slider_interval_seconds
--   3) Default değerler
-- =====================================================

-- =====================================================
-- 1) TRIGGER FUNCTION
-- premium_auction ilan verildiğinde/güncellendiğinde is_premium=true olsun
-- =====================================================
create or replace function public.fn_auto_premium_auction()
returns trigger
language plpgsql
as $$
begin
  if NEW.listing_type = 'premium_auction' then
    NEW.is_premium := true;
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_auto_premium_auction on public.vehicles;
create trigger trg_auto_premium_auction
  before insert or update on public.vehicles
  for each row execute function public.fn_auto_premium_auction();

-- =====================================================
-- 2) SITE_SETTINGS: slider interval
-- =====================================================
alter table public.site_settings
  add column if not exists premium_slider_interval_seconds int not null default 5;

-- =====================================================
-- 3) Mevcut premium_auction ilanların is_premium=true yap
-- =====================================================
update public.vehicles
set is_premium = true
where listing_type = 'premium_auction'
  and is_premium = false;

-- =====================================================
-- 4) Realtime yenileme (opsiyonel)
-- =====================================================
-- (gerek yok, frontend 30s stale time ile günceller)

-- =====================================================
-- 5) Açıklayıcı yorum
-- =====================================================
comment on column public.site_settings.premium_slider_interval_seconds
  is 'Premium ilan slider'ı kaç saniyede bir slide geçişi yapar. Admin tarafından ayarlanır.';
