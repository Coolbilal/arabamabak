-- =====================================================
-- Migration 07: Valets (Eksper Vale)
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   expert_valets (arabamabak çalışanı valeler)
--   valet_ratings (kullanıcının valeyi oylaması)
-- =====================================================

-- =====================================================
-- 1) EXPERT_VALETS
-- =====================================================
create table if not exists public.expert_valets (
  average_rating numeric(3,2) default 0,  -- ortalama puan (1-5)
  city text not null,  -- çalıştığı ana şehir
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  full_name text not null,
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  license_plate text,  -- vale aracı plakası
  phone text not null,
  photo_url text,
  total_ratings int not null default 0,
  total_tasks int not null default 0,  -- tamamlanan görev sayısı
  updated_at timestamptz not null default now(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_info text  -- vale aracı marka/model
);
create index if not exists idx_expert_valets_active
  on public.expert_valets(is_active) where deleted_at is null;
create index if not exists idx_expert_valets_city
  on public.expert_valets(city);
create index if not exists idx_expert_valets_user
  on public.expert_valets(user_id);

-- =====================================================
-- 2) VALET_RATINGS
-- =====================================================
create table if not exists public.valet_ratings (
  comment text,
  created_at timestamptz not null default now(),
  expertise_request_id uuid,  -- FK migration 10'da eklenecek
  id uuid primary key default uuid_generate_v4(),
  rating int not null check (rating >= 1 and rating <= 5),
  user_id uuid not null references public.profiles(id) on delete cascade,
  valet_id uuid not null references public.expert_valets(id) on delete cascade
);
create index if not exists idx_valet_ratings_user
  on public.valet_ratings(user_id);
create index if not exists idx_valet_ratings_valet
  on public.valet_ratings(valet_id, created_at desc);

-- =====================================================
-- 3) PROFILES FK'lerini ekle
-- =====================================================
do $$ begin
  alter table public.profiles
    add constraint fk_profiles_valet
    foreign key (valet_id) references public.expert_valets(id) on delete set null;
exception when duplicate_object then null; end $$;
