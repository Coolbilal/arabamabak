-- =====================================================
-- Migration 37: vehicles.final_price kolonu ekle
-- arabamabak - Açık arttırmada satılan araçların final_price'ı
-- =====================================================

do $$ begin
  alter table public.vehicles add column if not exists final_price numeric(12,2);
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.vehicles add column if not exists sold_at timestamptz;
exception when duplicate_column then null; end $$;

-- Index for /kategori/sold query performance
create index if not exists idx_vehicles_sold_at
  on public.vehicles(sold_at desc) where status = 'sold';
