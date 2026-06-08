-- =====================================================
-- Migration 10: Expertise
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   expertise_requests (ekspertiz talepleri)
--   expertise_process_steps (her aşama kaydı)
-- =====================================================

-- =====================================================
-- 1) EXPERTISE_REQUESTS
-- =====================================================
create table if not exists public.expertise_requests (
  address text,
  appointment_date timestamptz,  -- bayinin oluşturduğu randevu
  assigned_admin_id uuid references public.admin_users(id),
  brand_id uuid references public.vehicle_brands(id) on delete set null,
  city text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.admin_users(id),
  expert_notes text,
  expert_valet_id uuid references public.expert_valets(id) on delete set null,
  expertise_dealership_id uuid references public.expertise_dealerships(id) on delete set null,
  fee numeric(10,2),
  fee_paid boolean not null default false,
  id uuid primary key default uuid_generate_v4(),
  km int,
  model_id uuid references public.vehicle_models(id) on delete set null,
  plate text,
  process_status expertise_process_status not null default 'created',
  rated_at timestamptz,
  rating_id uuid,  -- FK valet_ratings'e trigger ile
  report_url text,
  scheduled_date date,
  status expertise_status not null default 'pending',
  transport_mode transport_mode not null default 'valet',
  updated_at timestamptz not null default now(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  year int
);
create index if not exists idx_expertise_process_status
  on public.expertise_requests(process_status, created_at desc);
create index if not exists idx_expertise_status
  on public.expertise_requests(status) where deleted_at is null;
create index if not exists idx_expertise_user
  on public.expertise_requests(user_id);
create index if not exists idx_expertise_valet
  on public.expertise_requests(expert_valet_id);
create index if not exists idx_expertise_dealership
  on public.expertise_requests(expertise_dealership_id);

-- =====================================================
-- 2) EXPERTISE_PROCESS_STEPS (her aşama kaydı)
-- =====================================================
create table if not exists public.expertise_process_steps (
  actor_id uuid,  -- adımı atan kişi (valet, admin, bayi)
  actor_type text not null,  -- 'valet' | 'admin' | 'dealership' | 'system'
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  notes text,  -- opsiyonel not (örn: "araç sağlam teslim alındı")
  photo_urls text[],  -- opsiyonel fotoğraflar (her aşamada)
  request_id uuid not null references public.expertise_requests(id) on delete cascade,
  step_type expertise_process_status not null,
  -- Tahmini süre (saniye), kullanıcıya "beklenen teslim" gösterimi için
  estimated_completion_at timestamptz
);
create index if not exists idx_expertise_steps_request
  on public.expertise_process_steps(request_id, created_at);

-- =====================================================
-- 3) VALET_RATINGS FK
-- =====================================================
do $$ begin
  alter table public.valet_ratings
    add constraint fk_valet_ratings_expertise_request
    foreign key (expertise_request_id) references public.expertise_requests(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.expertise_requests
    add constraint fk_expertise_requests_rating
    foreign key (rating_id) references public.valet_ratings(id) on delete set null;
exception when duplicate_object then null; end $$;
