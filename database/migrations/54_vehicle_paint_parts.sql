-- =====================================================
-- Migration 54: vehicle_paint_parts (Boya / Değişen)
-- =====================================================
-- İlan detay sayfasında "Boya / Değişen" diyagramı için
-- Her ilan için 14 parça × durum kaydı tutar
-- =====================================================

create table if not exists public.vehicle_paint_parts (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  part_code text not null,
  status text not null check (status in ('original', 'painted', 'changed', 'none')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Bir ilan için aynı parça tekrar eklenmesin
create unique index if not exists idx_vehicle_paint_parts_unique
  on public.vehicle_paint_parts(vehicle_id, part_code);

-- Hızlı sorgu için
create index if not exists idx_vehicle_paint_parts_vehicle
  on public.vehicle_paint_parts(vehicle_id);

-- updated_at otomatik güncelleme (varsa trigger fonksiyonunu kullan)
drop trigger if exists trg_touch_vehicle_paint_parts on public.vehicle_paint_parts;
create trigger trg_touch_vehicle_paint_parts before update on public.vehicle_paint_parts
  for each row execute function public.touch_updated_at();

-- =====================================================
-- RLS POLICIES
-- =====================================================
alter table public.vehicle_paint_parts enable row level security;

-- Herkes okuyabilir (public listing)
drop policy if exists "vehicle_paint_parts_select_all" on public.vehicle_paint_parts;
create policy "vehicle_paint_parts_select_all"
  on public.vehicle_paint_parts
  for select
  using (true);

-- İlan sahibi INSERT yapabilir
drop policy if exists "vehicle_paint_parts_insert_owner" on public.vehicle_paint_parts;
create policy "vehicle_paint_parts_insert_owner"
  on public.vehicle_paint_parts
  for insert
  with check (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_paint_parts.vehicle_id
      and v.seller_id = auth.uid()
    )
  );

-- İlan sahibi UPDATE yapabilir
drop policy if exists "vehicle_paint_parts_update_owner" on public.vehicle_paint_parts;
create policy "vehicle_paint_parts_update_owner"
  on public.vehicle_paint_parts
  for update
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_paint_parts.vehicle_id
      and v.seller_id = auth.uid()
    )
  );

-- İlan sahibi DELETE yapabilir
drop policy if exists "vehicle_paint_parts_delete_owner" on public.vehicle_paint_parts;
create policy "vehicle_paint_parts_delete_owner"
  on public.vehicle_paint_parts
  for delete
  using (
    exists (
      select 1 from public.vehicles v
      where v.id = vehicle_paint_parts.vehicle_id
      and v.seller_id = auth.uid()
    )
  );

-- =====================================================
-- YORUM: Bu migration yeni bir tablo ekler, mevcut tablolara dokunmaz.
-- 14 parça kodu kullanılacak (ön/arka tampon, kaput, tavan, 4 kapı, 4 çamurluk, bagaj, vb.)
-- İlan sahibi form üzerinden doldurur, herkes görebilir.
-- =====================================================
