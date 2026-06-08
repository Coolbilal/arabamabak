-- =====================================================
-- Migration 03: Users & Admins
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   profiles (bireysel + bayi kullanıcılar)
--   admin_users (super admin + yetkili admin)
--   admin_permissions (alan-bazlı yetkiler)
--   admin_activity_logs (admin aksiyon logu)
-- =====================================================

-- =====================================================
-- 1) PROFILES (auth.users'ı genişletir)
-- =====================================================
create table if not exists public.profiles (
  account_type user_account_type not null default 'individual',
  avatar_url text,
  bio text,
  city text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid,
  district text,
  email text,
  email_verified_at timestamptz,
  expertise_dealership_id uuid,  -- FK migration 06'da eklenecek
  full_name text,
  id uuid primary key references auth.users(id) on delete cascade,
  is_phone_verified boolean not null default false,
  last_seen_at timestamptz,
  locale text default 'tr',
  notification_preferences jsonb not null default '{
    "email_marketing": true,
    "email_transactional": true,
    "push_bid_updates": true,
    "push_messages": true,
    "push_system": true
  }'::jsonb,
  phone text,
  phone_verified_at timestamptz,
  role user_role not null default 'user',
  updated_at timestamptz not null default now(),
  user_type user_account_type not null default 'individual',  -- alias for account_type
  valet_id uuid,  -- FK migration 07'de eklenecek
  wallet_balance numeric(12,2) not null default 0
);
-- Not: account_type ve user_type aynı şey, frontend tutarlılığı için ikisi de var
create index if not exists idx_profiles_account_type
  on public.profiles(account_type) where deleted_at is null;
create index if not exists idx_profiles_email
  on public.profiles(email);
create index if not exists idx_profiles_role
  on public.profiles(role);

-- =====================================================
-- 2) ADMIN_USERS
-- =====================================================
create table if not exists public.admin_users (
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_users(id),
  full_name text,
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  is_super_admin boolean not null default false,
  last_login_at timestamptz,
  updated_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  username text unique not null
);
create index if not exists idx_admin_users_username
  on public.admin_users(username);
create index if not exists idx_admin_users_user_id
  on public.admin_users(user_id);

-- =====================================================
-- 3) ADMIN_PERMISSIONS (alan-bazlı)
-- =====================================================
create table if not exists public.admin_permissions (
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  area admin_permission_area not null,
  can_approve boolean not null default false,
  can_delete boolean not null default false,
  can_edit boolean not null default false,
  can_view boolean not null default false,
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  unique(admin_user_id, area)
);
create index if not exists idx_admin_perms_admin
  on public.admin_permissions(admin_user_id);

-- =====================================================
-- 4) ADMIN_ACTIVITY_LOGS
-- =====================================================
create table if not exists public.admin_activity_logs (
  action text not null,  -- 'approve_listing', 'reject_user', 'update_settings', vb.
  actor_id uuid not null references public.admin_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  entity_id uuid,  -- etkilenen entity'nin ID'si
  entity_type text,  -- 'vehicle', 'user', 'auction', 'setting', vb.
  id uuid primary key default uuid_generate_v4(),
  ip_address inet,
  metadata jsonb,  -- eski ve yeni değerler, ek detaylar
  user_agent text
);
create index if not exists idx_admin_activity_actor
  on public.admin_activity_logs(actor_id, created_at desc);
create index if not exists idx_admin_activity_entity
  on public.admin_activity_logs(entity_type, entity_id);

-- =====================================================
-- 5) PROFILES FK'lerini ekle (döngüsel bağımlılık için)
-- =====================================================
-- expertise_dealership_id ve valet_id migration 06 ve 07'de tanımlanacak
-- Şimdilik sadece deleted_by için FK
do $$ begin
  alter table public.profiles
    add constraint fk_profiles_deleted_by
    foreign key (deleted_by) references public.admin_users(id);
exception when duplicate_object then null; end $$;
