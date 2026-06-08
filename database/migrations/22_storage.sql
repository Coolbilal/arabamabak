-- =====================================================
-- Migration 22: Storage Buckets
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- 7 storage bucket + RLS politikaları
-- =====================================================

-- =====================================================
-- 1) Bucket oluşturma
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', true, 10485760,
    array['image/jpeg','image/png','image/webp','image/avif']),
  ('avatars', 'avatars', true, 2097152,
    array['image/jpeg','image/png','image/webp']),
  ('site-assets', 'site-assets', true, 5242880,
    array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('expertise-reports', 'expertise-reports', false, 20971520,
    array['application/pdf','image/jpeg','image/png']),
  ('dealership-logos', 'dealership-logos', true, 2097152,
    array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('category-icons', 'category-icons', true, 1048576,
    array['image/svg+xml','image/png','image/jpeg','image/webp']),
  ('ad-creatives', 'ad-creatives', true, 2097152,
    array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- =====================================================
-- 2) VEHICLE-IMAGES policies
-- =====================================================
drop policy if exists vehicle_images_public_read on storage.objects;
create policy vehicle_images_public_read on storage.objects
  for select using (bucket_id = 'vehicle-images');

drop policy if exists vehicle_images_authenticated_insert on storage.objects;
create policy vehicle_images_authenticated_insert on storage.objects
  for insert with check (bucket_id = 'vehicle-images' and auth.role() = 'authenticated');

drop policy if exists vehicle_images_owner_update on storage.objects;
create policy vehicle_images_owner_update on storage.objects
  for update using (
    bucket_id = 'vehicle-images' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  );

drop policy if exists vehicle_images_owner_delete on storage.objects;
create policy vehicle_images_owner_delete on storage.objects
  for delete using (
    bucket_id = 'vehicle-images' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  );

-- =====================================================
-- 3) AVATARS policies
-- =====================================================
drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects
  for insert with check (
    bucket_id = 'avatars' and
    storage.foldername(name) = auth.uid()::text
  );

drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects
  for update using (
    bucket_id = 'avatars' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  );

drop policy if exists avatars_owner_delete on storage.objects;
create policy avatars_owner_delete on storage.objects
  for delete using (
    bucket_id = 'avatars' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  );

-- =====================================================
-- 4) SITE-ASSETS policies
-- =====================================================
drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read on storage.objects
  for select using (bucket_id = 'site-assets');

drop policy if exists site_assets_admin_write on storage.objects;
create policy site_assets_admin_write on storage.objects
  for all using (
    bucket_id = 'site-assets' and public.is_admin(auth.uid())
  ) with check (
    bucket_id = 'site-assets' and public.is_admin(auth.uid())
  );

-- =====================================================
-- 5) EXPERTISE-REPORTS policies (private)
-- =====================================================
drop policy if exists expertise_reports_owner_read on storage.objects;
create policy expertise_reports_owner_read on storage.objects
  for select using (
    bucket_id = 'expertise-reports' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  );

drop policy if exists expertise_reports_write on storage.objects;
create policy expertise_reports_write on storage.objects
  for insert with check (
    bucket_id = 'expertise-reports' and public.is_admin(auth.uid())
  );

-- =====================================================
-- 6) DEALERSHIP-LOGOS policies
-- =====================================================
drop policy if exists dealer_logos_public_read on storage.objects;
create policy dealer_logos_public_read on storage.objects
  for select using (bucket_id = 'dealership-logos');

drop policy if exists dealer_logos_owner_write on storage.objects;
create policy dealer_logos_owner_write on storage.objects
  for all using (
    bucket_id = 'dealership-logos' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  ) with check (
    bucket_id = 'dealership-logos' and
    (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
  );

-- =====================================================
-- 7) CATEGORY-ICONS policies
-- =====================================================
drop policy if exists category_icons_public_read on storage.objects;
create policy category_icons_public_read on storage.objects
  for select using (bucket_id = 'category-icons');

drop policy if exists category_icons_admin_write on storage.objects;
create policy category_icons_admin_write on storage.objects
  for all using (
    bucket_id = 'category-icons' and public.is_admin(auth.uid())
  ) with check (
    bucket_id = 'category-icons' and public.is_admin(auth.uid())
  );

-- =====================================================
-- 8) AD-CREATIVES policies
-- =====================================================
drop policy if exists ad_creatives_public_read on storage.objects;
create policy ad_creatives_public_read on storage.objects
  for select using (bucket_id = 'ad-creatives');

drop policy if exists ad_creatives_admin_write on storage.objects;
create policy ad_creatives_admin_write on storage.objects
  for all using (
    bucket_id = 'ad-creatives' and public.is_admin(auth.uid())
  ) with check (
    bucket_id = 'ad-creatives' and public.is_admin(auth.uid())
  );
