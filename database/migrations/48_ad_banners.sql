-- =====================================================
-- Migration 48: ad_banners tablosu
-- arabamabak - Reklam bannerları (Hero slider arası)
-- =====================================================
-- Bu migration:
--   1) ad_banners tablosu
--   2) RLS policies
--   3) Storage bucket: ad-banners
-- =====================================================

-- =====================================================
-- 1) AD_BANNERS TABLOSU
-- =====================================================
create table if not exists public.ad_banners (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  image_url text not null,
  link_url text,
  display_position text not null default 'hero_inline',
  display_order int not null default 0,
  is_active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  impression_count int not null default 0,
  click_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ad_banners_active
  on public.ad_banners(is_active, display_position, display_order);

drop trigger if exists trg_touch_ad_banners on public.ad_banners;
create trigger trg_touch_ad_banners before update on public.ad_banners
  for each row execute function public.touch_updated_at();

-- =====================================================
-- 2) RLS POLICIES
-- =====================================================
alter table public.ad_banners enable row level security;

drop policy if exists ad_banners_public_read on public.ad_banners;
create policy ad_banners_public_read on public.ad_banners
  for select using (
    is_active = true
    and (start_at is null or start_at <= now())
    and (end_at is null or end_at >= now())
  );

drop policy if exists ad_banners_admin_all on public.ad_banners;
create policy ad_banners_admin_all on public.ad_banners
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =====================================================
-- 3) STORAGE BUCKET
-- =====================================================
insert into storage.buckets (id, name, public)
values ('ad-banners', 'ad-banners', true)
on conflict (id) do nothing;

drop policy if exists ad_banners_storage_select on storage.objects;
create policy ad_banners_storage_select on storage.objects
  for select to public using (bucket_id = 'ad-banners');

drop policy if exists ad_banners_storage_insert on storage.objects;
create policy ad_banners_storage_insert on storage.objects
  for insert to authenticated with check (bucket_id = 'ad-banners');

drop policy if exists ad_banners_storage_update on storage.objects;
create policy ad_banners_storage_update on storage.objects
  for update to authenticated using (bucket_id = 'ad-banners');

drop policy if exists ad_banners_storage_delete on storage.objects;
create policy ad_banners_storage_delete on storage.objects
  for delete to authenticated using (bucket_id = 'ad-banners');

-- =====================================================
-- 4) RPC: track_ad_click
-- Banner tıklanma sayacı
-- =====================================================
create or replace function public.track_ad_click(p_banner_id uuid)
returns void
language sql
security definer
as $$
  update public.ad_banners
  set click_count = click_count + 1
  where id = p_banner_id;
$$;

grant execute on function public.track_ad_click(uuid) to anon, authenticated;

-- =====================================================
-- 5) RPC: track_ad_impression
-- Banner gösterim sayacı
-- =====================================================
create or replace function public.track_ad_impression(p_banner_id uuid)
returns void
language sql
security definer
as $$
  update public.ad_banners
  set impression_count = impression_count + 1
  where id = p_banner_id;
$$;

grant execute on function public.track_ad_impression(uuid) to anon, authenticated;