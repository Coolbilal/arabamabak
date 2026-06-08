-- =====================================================
-- Migration 06: Dealerships
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   dealerships (galeri / araç bayileri)
--   expertise_dealerships (franchise ekspertiz bayileri)
-- =====================================================

-- =====================================================
-- 1) DEALERSHIPS (galeri / araç bayileri)
-- =====================================================
create table if not exists public.dealerships (
  address text,
  approved_at timestamptz,
  approved_by uuid references public.admin_users(id),
  city text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  description text,
  district text,
  email text,
  id uuid primary key default uuid_generate_v4(),
  logo_url text,
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  phone text,
  status dealership_status not null default 'pending',
  tax_number text,
  type dealership_type not null default 'gallery',
  updated_at timestamptz not null default now()
);
create index if not exists idx_dealerships_city
  on public.dealerships(city);
create index if not exists idx_dealerships_owner
  on public.dealerships(owner_id);
create index if not exists idx_dealerships_status
  on public.dealerships(status) where deleted_at is null;
create index if not exists idx_dealerships_type
  on public.dealerships(type);

-- =====================================================
-- 2) EXPERTISE_DEALERSHIPS (franchise ekspertiz bayileri)
-- =====================================================
create table if not exists public.expertise_dealerships (
  address text,
  approved_at timestamptz,
  approved_by uuid references public.admin_users(id),
  city text not null,
  contact_person text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  description text,
  district text,
  email text,
  franchise_code text unique,  -- "EXP-IST-001" gibi franchise kodu
  id uuid primary key default uuid_generate_v4(),
  logo_url text,
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  phone text,
  report_template_url text,  -- kendi rapor şablonu (PDF)
  service_areas text[],  -- hizmet verdiği ilçeler
  status dealership_status not null default 'pending',
  tax_number text,
  updated_at timestamptz not null default now()
);
create index if not exists idx_expertise_dealerships_city
  on public.expertise_dealerships(city);
create index if not exists idx_expertise_dealerships_code
  on public.expertise_dealerships(franchise_code);
create index if not exists idx_expertise_dealerships_owner
  on public.expertise_dealerships(owner_id);
create index if not exists idx_expertise_dealerships_status
  on public.expertise_dealerships(status) where deleted_at is null;

-- =====================================================
-- 3) PROFILES FK'lerini ekle
-- =====================================================
do $$ begin
  alter table public.profiles
    add constraint fk_profiles_expertise_dealership
    foreign key (expertise_dealership_id) references public.expertise_dealerships(id) on delete set null;
exception when duplicate_object then null; end $$;
