-- ============================================
-- Migration 60: Marka - Kategori İlişkisi
-- ============================================
-- Bir marka birden fazla kategoride olabilir
-- BMW hem Otomobil hem Arazi-SUV-Pikup kategorisinde

CREATE TABLE IF NOT EXISTS public.brand_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.vehicle_brands(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.vehicle_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(brand_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_categories_brand ON public.brand_categories(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_categories_category ON public.brand_categories(category_id);

ALTER TABLE public.brand_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "brand_categories_select" ON public.brand_categories;
CREATE POLICY "brand_categories_select" ON public.brand_categories
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "brand_categories_admin_all" ON public.brand_categories;
CREATE POLICY "brand_categories_admin_all" ON public.brand_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );
