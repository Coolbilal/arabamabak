-- =====================================================
-- Migration 13: User Features
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   notifications (uygulama içi bildirimler)
--   saved_searches (kayıtlı aramalar)
--   vehicle_reports (şikayet sistemi)
-- =====================================================

-- =====================================================
-- 1) NOTIFICATIONS
-- =====================================================
create table if not exists public.notifications (
  action_url text,  -- tıklanınca gidilecek URL
  body text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  id uuid primary key default uuid_generate_v4(),
  is_read boolean not null default false,
  metadata jsonb,  -- ek bilgi (hangi mezat, hangi mesaj, vb.)
  read_at timestamptz,
  title text not null,
  type notification_type not null,
  user_id uuid not null references public.profiles(id) on delete cascade
);
create index if not exists idx_notifications_user
  on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_user_unread
  on public.notifications(user_id, is_read) where is_read = false;

-- =====================================================
-- 2) SAVED_SEARCHES
-- =====================================================
create table if not exists public.saved_searches (
  created_at timestamptz not null default now(),
  filters jsonb not null,  -- {brand_id, model_id, year_min, year_max, price_min, price_max, ...}
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  last_notified_at timestamptz,  -- son yeni ilan bildirimi gönderilme zamanı
  name text not null,  -- "BMW 3 Serisi 2018-2023, 200bin TL altı" gibi
  notify_new_listings boolean not null default true,
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade
);
create index if not exists idx_saved_searches_user
  on public.saved_searches(user_id) where is_active = true;

-- =====================================================
-- 3) VEHICLE_REPORTS
-- =====================================================
create table if not exists public.vehicle_reports (
  admin_notes text,
  created_at timestamptz not null default now(),
  description text not null,
  id uuid primary key default uuid_generate_v4(),
  reason text not null,  -- 'fake_listing' | 'wrong_info' | 'duplicate' | 'spam' | 'fraud' | 'other'
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  resolution text,  -- 'dismissed' | 'listing_removed' | 'user_warned' | 'user_banned'
  resolved_at timestamptz,
  resolved_by uuid references public.admin_users(id),
  status text not null default 'pending',  -- 'pending' | 'reviewing' | 'resolved'
  updated_at timestamptz not null default now(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade
);
create index if not exists idx_vehicle_reports_status
  on public.vehicle_reports(status, created_at desc);
create index if not exists idx_vehicle_reports_vehicle
  on public.vehicle_reports(vehicle_id);
create index if not exists idx_vehicle_reports_reporter
  on public.vehicle_reports(reporter_id);
