-- =====================================================
-- Migration 15: Email System
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   email_templates (şablonlar)
--   email_logs (gönderim logu)
--   email_suppressions (bounce, unsubscribe)
-- =====================================================

-- =====================================================
-- 1) EMAIL_TEMPLATES
-- =====================================================
create table if not exists public.email_templates (
  body_html text not null,
  body_text text,  -- düz metin versiyonu
  created_at timestamptz not null default now(),
  description text,  -- şablonun ne için olduğu
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  is_marketing boolean not null default false,  -- marketing mail mi
  key text unique not null,  -- 'welcome', 'password_reset', 'bid_received', vb.
  subject text not null,
  updated_at timestamptz not null default now(),
  variables jsonb not null default '[]'::jsonb  -- ['user_name', 'auction_url', 'amount'] gibi
);
create index if not exists idx_email_templates_key
  on public.email_templates(key);
create index if not exists idx_email_templates_active
  on public.email_templates(is_active) where is_active = true;

-- =====================================================
-- 2) EMAIL_LOGS
-- =====================================================
create table if not exists public.email_logs (
  created_at timestamptz not null default now(),
  error_message text,
  from_address text not null,
  id uuid primary key default uuid_generate_v4(),
  metadata jsonb,  -- provider response, headers, vb.
  provider text,  -- 'resend' | 'sendgrid' | 'smtp'
  provider_message_id text,
  sent_at timestamptz,
  status text not null default 'pending',  -- 'pending' | 'sent' | 'failed' | 'bounced'
  subject text not null,
  template_key text references public.email_templates(key) on delete set null,
  to_address text not null,
  to_user_id uuid references public.profiles(id) on delete set null
);
create index if not exists idx_email_logs_created
  on public.email_logs(created_at desc);
create index if not exists idx_email_logs_status
  on public.email_logs(status, created_at desc);
create index if not exists idx_email_logs_template
  on public.email_logs(template_key);
create index if not exists idx_email_logs_to
  on public.email_logs(to_address);

-- =====================================================
-- 3) EMAIL_SUPPRESSIONS
-- =====================================================
create table if not exists public.email_suppressions (
  created_at timestamptz not null default now(),
  email text not null,
  id uuid primary key default uuid_generate_v4(),
  reason text not null,  -- 'bounce' | 'complaint' | 'unsubscribe' | 'manual'
  source text,  -- bounce kaynağı (örn: provider feedback)
  unique(email, reason)
);
create index if not exists idx_email_suppressions_email
  on public.email_suppressions(email);
