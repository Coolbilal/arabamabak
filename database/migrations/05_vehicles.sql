-- =====================================================
-- Migration 05: Vehicles
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   vehicles (tüm ilanlar: ücretsiz + açık arttırma)
--   vehicle_images (araç fotoğrafları)
--   vehicle_views (kim neye baktı, analytics)
-- =====================================================

-- =====================================================
-- 1) VEHICLES
-- =====================================================
create table if not exists public.vehicles (
  approved_at timestamptz,
  approved_by uuid references public.admin_users(id),
  body body_type not null,
  brand_id uuid not null references public.vehicle_brands(id),
  category_id uuid references public.categories(id) on delete set null,
  city text not null,
  color text,
  contact_hidden boolean not null default false,
  contact_revealed_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  damage_detail text,
  damage_record boolean not null default false,
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  description text,
  district text,
  engine_power_kw int,
  engine_size_id uuid references public.engine_sizes(id) on delete set null,
  exchange_accepted boolean not null default false,
  expires_at timestamptz,
  favorite_count int not null default 0,
  free_listing_expires_at timestamptz,
  fuel fuel_type not null,
  id uuid primary key default uuid_generate_v4(),
  is_premium boolean not null default false,
  is_promoted_to_auction boolean not null default false,
  km int not null default 0,
  last_bump_at timestamptz,
  listing_origin text default 'manual',  -- 'manual' | 'promoted_from_free' (enum yerine text, migration sonrası eklenebilir)
  listing_type listing_type not null default 'free',
  min_price numeric(12,2),
  model_id uuid references public.vehicle_models(id) on delete set null,
  price numeric(12,2) not null,  -- free listing fiyatı veya auction açılış fiyatı
  published_at timestamptz,
  rejection_reason text,
  rejected_at timestamptz,
  rejected_by uuid references public.admin_users(id),
  search_tsv tsvector,  -- full-text search için (trigger ile güncellenecek)
  seller_id uuid not null references public.profiles(id) on delete cascade,
  slug text unique,  -- SEO URL
  status listing_status not null default 'pending',
  title text not null,
  updated_at timestamptz not null default now(),
  view_count int not null default 0,
  view_count_unique int not null default 0,
  vote_count_fair int not null default 0,
  vote_count_high int not null default 0,
  vote_count_low int not null default 0,
  year int not null
);

create index if not exists idx_vehicles_brand
  on public.vehicles(brand_id);
create index if not exists idx_vehicles_brand_model_year
  on public.vehicles(brand_id, model_id, year);
create index if not exists idx_vehicles_category
  on public.vehicles(category_id);
create index if not exists idx_vehicles_city
  on public.vehicles(city);
create index if not exists idx_vehicles_listing_origin
  on public.vehicles(listing_origin);
create index if not exists idx_vehicles_premium
  on public.vehicles(is_premium) where is_premium = true;
create index if not exists idx_vehicles_search
  on public.vehicles using gin(search_tsv);
create index if not exists idx_vehicles_seller
  on public.vehicles(seller_id);
create index if not exists idx_vehicles_slug
  on public.vehicles(slug);
create index if not exists idx_vehicles_status_created
  on public.vehicles(status, created_at desc) where deleted_at is null;
create index if not exists idx_vehicles_type
  on public.vehicles(listing_type);

-- =====================================================
-- 2) VEHICLE_IMAGES
-- =====================================================
create table if not exists public.vehicle_images (
  alt_text text,
  created_at timestamptz not null default now(),
  height int,
  id uuid primary key default uuid_generate_v4(),
  sort_order int not null default 0,
  url text not null,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  width int
);
create index if not exists idx_vehicle_images_sort
  on public.vehicle_images(vehicle_id, sort_order);
create index if not exists idx_vehicle_images_vehicle
  on public.vehicle_images(vehicle_id);

-- =====================================================
-- 3) VEHICLE_VIEWS (analytics)
-- =====================================================
create table if not exists public.vehicle_views (
  id uuid primary key default uuid_generate_v4(),
  ip_address inet,
  is_unique boolean not null default false,  -- unique visitor mı
  referrer text,
  user_agent text,
  user_id uuid references public.profiles(id) on delete set null,  -- anonim ise null
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  viewed_at timestamptz not null default now()
);
create index if not exists idx_vehicle_views_vehicle
  on public.vehicle_views(vehicle_id, viewed_at desc);
create index if not exists idx_vehicle_views_user
  on public.vehicle_views(user_id) where user_id is not null;
