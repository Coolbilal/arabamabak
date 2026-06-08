-- =====================================================
-- Migration 16: Audit Logs (Genel)
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   audit_logs (tüm önemli aksiyonların genel logu)
-- =====================================================

create table if not exists public.audit_logs (
  action text not null,  -- 'create', 'update', 'delete', 'login', 'logout', 'payment', 'bid', 'auction_start', 'auction_end', vb.
  actor_id uuid,  -- işlemi yapan (auth.uid() veya admin)
  actor_type text not null,  -- 'user' | 'admin' | 'system' | 'cron'
  created_at timestamptz not null default now(),
  entity_id uuid,
  entity_type text,  -- 'vehicle', 'auction', 'transaction', 'profile', vb.
  id uuid primary key default uuid_generate_v4(),
  ip_address inet,
  metadata jsonb,  -- eski/yeni değerler, ek detay
  user_agent text
);
create index if not exists idx_audit_actor
  on public.audit_logs(actor_id, created_at desc) where actor_id is not null;
create index if not exists idx_audit_created
  on public.audit_logs(created_at desc);
create index if not exists idx_audit_entity
  on public.audit_logs(entity_type, entity_id);
