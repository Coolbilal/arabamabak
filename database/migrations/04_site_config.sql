-- =====================================================
-- Migration 04: Site Configuration
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   site_settings (singleton ayarlar)
--   site_themes (singleton tema/renk/font ayarları)
--   site_logos (çoklu logo yönetimi)
-- =====================================================

-- =====================================================
-- 1) SITE_SETTINGS (singleton, id=1)
-- =====================================================
create table if not exists public.site_settings (
  accent_color text not null default '#f59e0b',
  auction_anti_snipe_seconds int not null default 30,
  auction_default_duration_minutes int not null default 30,
  auction_listing_fee numeric(10,2) not null default 250,
  auction_seat_capacity int not null default 100,
  auction_seat_hold_fee numeric(10,2) not null default 500,
  auction_seller_auto_approval_hours int not null default 48,
  contact_email text,
  contact_phone text,
  email_from_address text,
  email_from_name text default 'arabamabak',
  email_marketing_enabled boolean not null default false,
  expertise_fee numeric(10,2) not null default 1500,
  expertise_valet_commission numeric(10,2) not null default 100,
  favicon_url text,
  featured_listing_fee numeric(10,2) not null default 100,
  footer_html text,
  free_listing_duration_days int not null default 30,
  free_listing_extra_fee numeric(10,2) not null default 100,
  free_listing_user_quota int not null default 3,
  free_listing_vote_threshold int not null default 50,
  header_html text,
  id int primary key default 1,
  logo_size text default 'md',
  logo_url text,
  min_bid_increment numeric(10,2) not null default 100,
  primary_color text not null default '#dc2626',
  secondary_color text not null default '#1f2937',
  site_name text not null default 'arabamabak',
  smtp_config jsonb not null default '{}'::jsonb,  -- {provider, api_key, from_name}
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id),
  constraint single_row check (id = 1)
);
-- İlk satırı ekle
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- =====================================================
-- 2) SITE_THEMES (singleton, id=1)
-- =====================================================
create table if not exists public.site_themes (
  accent_color text not null default '#f59e0b',
  background_color text not null default '#ffffff',
  body_line_height numeric(4,2) not null default 1.5,
  border_color text not null default '#e5e7eb',
  border_radius_lg text not null default '16px',
  border_radius_md text not null default '8px',
  border_radius_sm text not null default '4px',
  button_style text not null default 'rounded',
  danger_color text not null default '#ef4444',
  font_family_base text not null default 'Inter, system-ui, sans-serif',
  font_family_heading text not null default 'Inter, system-ui, sans-serif',
  font_size_base text not null default '16px',
  font_weight_bold int not null default 700,
  font_weight_normal int not null default 400,
  heading_line_height numeric(4,2) not null default 1.2,
  id int primary key default 1,
  info_color text not null default '#3b82f6',
  is_active boolean not null default true,
  primary_color text not null default '#dc2626',
  secondary_color text not null default '#1f2937',
  shadow_lg text not null default '0 10px 15px -3px rgba(0,0,0,0.1)',
  shadow_md text not null default '0 4px 6px -1px rgba(0,0,0,0.1)',
  shadow_sm text not null default '0 1px 2px 0 rgba(0,0,0,0.05)',
  success_color text not null default '#10b981',
  surface_color text not null default '#f9fafb',
  text_color text not null default '#111827',
  text_muted_color text not null default '#6b7280',
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id),
  warning_color text not null default '#f59e0b',
  constraint single_row check (id = 1)
);
insert into public.site_themes (id) values (1) on conflict (id) do nothing;

-- =====================================================
-- 3) SITE_LOGOS (çoklu logo)
-- =====================================================
create table if not exists public.site_logos (
  alt_text text,
  file_type text,  -- 'png', 'svg', 'webp'
  file_url text not null,
  height int,
  id uuid primary key default uuid_generate_v4(),
  is_transparent boolean not null default true,
  uploaded_at timestamptz not null default now(),
  uploaded_by uuid references public.admin_users(id),
  usage site_logo_usage not null,
  width int
);
create index if not exists idx_site_logos_usage
  on public.site_logos(usage);

-- =====================================================
-- 4) RLS - Public okuma, sadece admin yazma
-- =====================================================
alter table public.site_settings enable row level security;
alter table public.site_themes enable row level security;
alter table public.site_logos enable row level security;

-- site_settings: herkes okuyabilir
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings
  for select using (true);

-- site_themes: herkes okuyabilir (frontend tema DB'den çeker)
drop policy if exists themes_public_read on public.site_themes;
create policy themes_public_read on public.site_themes
  for select using (true);

-- site_logos: herkes okuyabilir
drop policy if exists logos_public_read on public.site_logos;
create policy logos_public_read on public.site_logos
  for select using (true);
