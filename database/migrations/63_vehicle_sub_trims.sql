-- ============================================
-- Migration 63: Araç Alt Paket Sistemi
-- ============================================
-- Yeni tablo: vehicle_sub_trims (paket altinda)
-- Audi A1 Ambition 1.4 TFSI → "Ambition" trim, "1.4 TFSI" alt paket
-- Renault Clio Touch 1.0 TCe → "Touch" trim, "1.0 TCe" alt paket

CREATE TABLE IF NOT EXISTS public.vehicle_sub_trims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trim_id UUID NOT NULL REFERENCES public.vehicle_trims(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- vehicles tablosuna sub_trim_id kolonu
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS sub_trim_id UUID REFERENCES public.vehicle_sub_trims(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_sub_trims_trim ON public.vehicle_sub_trims(trim_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_sub_trim ON public.vehicles(sub_trim_id);

ALTER TABLE public.vehicle_sub_trims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehicle_sub_trims_select" ON public.vehicle_sub_trims;
CREATE POLICY "vehicle_sub_trims_select" ON public.vehicle_sub_trims
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "vehicle_sub_trims_admin_all" ON public.vehicle_sub_trims;
CREATE POLICY "vehicle_sub_trims_admin_all" ON public.vehicle_sub_trims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );
