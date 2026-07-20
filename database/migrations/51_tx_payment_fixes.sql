-- =====================================================
-- Migration 51: Transactions ödeme hataları düzeltmesi
-- arabamabak - ilan verme ödeme adımı düzeltmeleri
-- =====================================================
-- Sorunlar:
--   1) related_vehicle_id NOT NULL -> FK ihlali (ilan henüz insert edilmedi)
--   2) deduct_wallet_for_listing RPC'ye authenticated GRANT eksik
--   3) transactions tablosu authenticated GRANT eksik
-- =====================================================

-- =====================================================
-- 1) related_vehicle_id NULL yapılabilsin
-- İlan insert edilmeden transaction oluşturulabilsin
-- =====================================================
alter table public.transactions
  alter column related_vehicle_id drop not null;

-- =====================================================
-- 2) deduct_wallet_for_listing RPC GRANT
-- =====================================================
grant execute on function public.deduct_wallet_for_listing(uuid, numeric, uuid, text) to authenticated;

-- =====================================================
-- 3) transactions tablosu GRANT (authenticated insert/update)
-- =====================================================
grant insert, update, select on public.transactions to authenticated;

-- =====================================================
-- 4) transactions_related_vehicle_id_fkey constraint
-- ON DELETE SET NULL (silinen vehicle'lar transaction'ı etkilemesin)
-- =====================================================
alter table public.transactions
  drop constraint if exists transactions_related_vehicle_id_fkey;

alter table public.transactions
  add constraint transactions_related_vehicle_id_fkey
  foreign key (related_vehicle_id)
  references public.vehicles(id)
  on delete set null;
