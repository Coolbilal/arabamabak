-- =====================================================
-- Migration 17: Advertising System
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   ad_campaigns, ad_slots, ad_creatives,
--   ad_placements, ad_impressions, ad_clicks
-- =====================================================

-- =====================================================
-- 1) AD_CAMPAIGNS
-- =====================================================
create table if not exists public.ad_campaigns (
  advertiser_name text,
  budget_daily numeric(12,2),
  budget_total numeric(12,2),
  created_at timestamptz not null default now(),
  created_by uuid references public.admin_users(id),
  end_date timestamptz not null,
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  priority int not null default 0,
  start_date timestamptz not null,
  status ad_campaign_status not null default 'draft',
  target_categories uuid[],  -- hedef kategori id'leri
  target_cities text[],  -- hedef şehirler
  target_pages text[],  -- ['home', 'listings', 'detail']
  updated_at timestamptz not null default now()
);
create index if not exists idx_ad_campaigns_status
  on public.ad_campaigns(status, start_date, end_date);

-- =====================================================
-- 2) AD_SLOTS
-- =====================================================
create table if not exists public.ad_slots (
  code text unique not null,  -- 'home_carousel', 'listing_inline', 'sidebar_top', 'detail_bottom'
  created_at timestamptz not null default now(),
  description text,
  display_rule jsonb not null default '{}'::jsonb,  -- {"every_n_items": 5, "min_listings": 10}
  height int,
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  max_creatives int not null default 1,
  name text not null,
  position ad_slot_position not null,
  sort_order int not null default 0,
  width int
);
create index if not exists idx_ad_slots_active
  on public.ad_slots(is_active, position) where is_active = true;

-- =====================================================
-- 3) AD_CREATIVES
-- =====================================================
create table if not exists public.ad_creatives (
  alt_text text,
  call_to_action text,  -- 'Hemen İncele' gibi buton metni
  campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  created_at timestamptz not null default now(),
  end_at timestamptz,
  id uuid primary key default uuid_generate_v4(),
  image_url text not null,
  is_active boolean not null default true,
  link_target text default '_blank',
  link_url text not null,
  mobile_image_url text,  -- mobil için ayrı görsel
  start_at timestamptz,
  subtitle text,
  title text,
  updated_at timestamptz not null default now(),
  weight int not null default 1  -- rotasyon için (yüksek = daha sık)
);
create index if not exists idx_ad_creatives_active
  on public.ad_creatives(is_active, campaign_id);
create index if not exists idx_ad_creatives_campaign
  on public.ad_creatives(campaign_id);

-- =====================================================
-- 4) AD_PLACEMENTS (slot-creative ataması)
-- =====================================================
create table if not exists public.ad_placements (
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  id uuid primary key default uuid_generate_v4(),
  is_active boolean not null default true,
  slot_id uuid not null references public.ad_slots(id) on delete cascade,
  sort_order int not null default 0,
  unique(slot_id, creative_id)
);
create index if not exists idx_ad_placements_slot
  on public.ad_placements(slot_id, is_active, sort_order);

-- =====================================================
-- 5) AD_IMPRESSIONS (gösterim logu - analytics)
-- =====================================================
create table if not exists public.ad_impressions (
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  id uuid primary key default uuid_generate_v4(),
  ip_address inet,
  page_url text,
  session_id text,
  slot_id uuid not null references public.ad_slots(id) on delete cascade,
  user_agent text,
  user_id uuid references public.profiles(id) on delete set null,  -- anonim ise null
  viewed_at timestamptz not null default now()
);
create index if not exists idx_ad_impressions_creative
  on public.ad_impressions(creative_id, viewed_at desc);
create index if not exists idx_ad_impressions_slot
  on public.ad_impressions(slot_id, viewed_at desc);

-- =====================================================
-- 6) AD_CLICKS (tıklama logu - analytics)
-- =====================================================
create table if not exists public.ad_clicks (
  clicked_at timestamptz not null default now(),
  creative_id uuid not null references public.ad_creatives(id) on delete cascade,
  id uuid primary key default uuid_generate_v4(),
  session_id text,
  slot_id uuid not null references public.ad_slots(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null
);
create index if not exists idx_ad_clicks_creative
  on public.ad_clicks(creative_id, clicked_at desc);
create index if not exists idx_ad_clicks_slot
  on public.ad_clicks(slot_id, clicked_at desc);
