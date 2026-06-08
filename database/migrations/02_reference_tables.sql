-- =====================================================
-- Migration 02: Reference Tables
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   cities, districts, engine_sizes, categories,
--   vehicle_brands, vehicle_models
-- =====================================================

-- =====================================================
-- 1) CITIES (81 il)
-- =====================================================
create table if not exists public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  plate_code text unique,  -- "01" (Adana), "34" (İstanbul) gibi
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_cities_active_sort
  on public.cities(is_active, sort_order);

-- =====================================================
-- 2) DISTRICTS (975+ ilçe)
-- =====================================================
create table if not exists public.districts (
  city_id uuid not null references public.cities(id) on delete cascade,
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  name text not null,
  sort_order int not null default 0,
  unique(city_id, name)
);
create index if not exists idx_districts_city
  on public.districts(city_id);

-- =====================================================
-- 3) ENGINE_SIZES (55+ motor hacmi)
-- =====================================================
create table if not exists public.engine_sizes (
  created_at timestamptz not null default now(),
  displacement text not null,  -- "1.0", "1.4 TSI", "2.0 TDI" gibi
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  sort_order int not null default 0,
  unique(displacement)
);
create index if not exists idx_engine_sizes_sort
  on public.engine_sizes(sort_order);

-- =====================================================
-- 4) CATEGORIES (araç kategorileri: Sedan, SUV, vs.)
-- =====================================================
create table if not exists public.categories (
  created_at timestamptz not null default now(),
  description text,
  icon_url text,
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  name text unique not null,
  parent_id uuid references public.categories(id) on delete set null,  -- alt kategori desteği
  slug text unique not null,
  sort_order int not null default 0
);
create index if not exists idx_categories_active_sort
  on public.categories(is_active, sort_order);
create index if not exists idx_categories_parent
  on public.categories(parent_id);

-- =====================================================
-- 5) VEHICLE_BRANDS (49+ marka)
-- =====================================================
create table if not exists public.vehicle_brands (
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  logo_url text,
  name text unique not null,
  sort_order int not null default 0
);
create index if not exists idx_vehicle_brands_sort
  on public.vehicle_brands(is_active, sort_order);

-- =====================================================
-- 6) VEHICLE_MODELS (564+ model)
-- =====================================================
create table if not exists public.vehicle_models (
  brand_id uuid not null references public.vehicle_brands(id) on delete cascade,
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  name text not null,
  sort_order int not null default 0,
  unique(brand_id, name)
);
create index if not exists idx_vehicle_models_brand
  on public.vehicle_models(brand_id, is_active, sort_order);

-- =====================================================
-- 7) RLS - Tüm reference tablolar public okuma
-- =====================================================
alter table public.cities enable row level security;
alter table public.districts enable row level security;
alter table public.engine_sizes enable row level security;
alter table public.categories enable row level security;
alter table public.vehicle_brands enable row level security;
alter table public.vehicle_models enable row level security;

drop policy if exists cities_public_read on public.cities;
create policy cities_public_read on public.cities
  for select using (true);

drop policy if exists districts_public_read on public.districts;
create policy districts_public_read on public.districts
  for select using (true);

drop policy if exists engine_sizes_public_read on public.engine_sizes;
create policy engine_sizes_public_read on public.engine_sizes
  for select using (true);

drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (true);

drop policy if exists vehicle_brands_public_read on public.vehicle_brands;
create policy vehicle_brands_public_read on public.vehicle_brands
  for select using (true);

drop policy if exists vehicle_models_public_read on public.vehicle_models;
create policy vehicle_models_public_read on public.vehicle_models
  for select using (true);
