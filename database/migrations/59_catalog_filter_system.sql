-- ============================================
-- Migration 59: Araç Kataloğu & Gelişmiş Filtreleme
-- ============================================
-- Yeni tablolar: vehicle_categories, vehicle_trims, vehicle_engine_powers
-- vehicles tablosuna yeni FK kolonları (NULL default, geriye uyumlu)
-- Mevcut tablolara ve verilere dokunmuyoruz

-- 1. Araç Cinsi (5 sabit kategori + admin ekleyebilir)
CREATE TABLE IF NOT EXISTS public.vehicle_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🚗',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Paket (Trim) - Model altında
CREATE TABLE IF NOT EXISTS public.vehicle_trims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Motor HP (Beygir Gücü) - Model altında
CREATE TABLE IF NOT EXISTS public.vehicle_engine_powers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.vehicle_models(id) ON DELETE CASCADE,
  hp INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. İlçe (District) - Şehir altında
CREATE TABLE IF NOT EXISTS public.districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES public.cities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. vehicles tablosuna yeni kolonlar (NULL default, geriye uyumlu)
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.vehicle_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS trim_id UUID REFERENCES public.vehicle_trims(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS engine_power_id UUID REFERENCES public.vehicle_engine_powers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS district_id UUID REFERENCES public.districts(id) ON DELETE SET NULL;

-- Indexler (filtreleme performansı için)
CREATE INDEX IF NOT EXISTS idx_vehicle_categories_active ON public.vehicle_categories(is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_vehicle_trims_model ON public.vehicle_trims(model_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vehicle_engine_powers_model ON public.vehicle_engine_powers(model_id, is_active);
CREATE INDEX IF NOT EXISTS idx_districts_city ON public.districts(city_id, is_active);
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON public.vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_trim ON public.vehicles(trim_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_engine_power ON public.vehicles(engine_power_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_district ON public.vehicles(district_id);

-- RLS Policies
ALTER TABLE public.vehicle_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_trims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_engine_powers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;

-- Herkes aktif olanları görebilir
DROP POLICY IF EXISTS "vehicle_categories_select" ON public.vehicle_categories;
CREATE POLICY "vehicle_categories_select" ON public.vehicle_categories
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "vehicle_trims_select" ON public.vehicle_trims;
CREATE POLICY "vehicle_trims_select" ON public.vehicle_trims
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "vehicle_engine_powers_select" ON public.vehicle_engine_powers;
CREATE POLICY "vehicle_engine_powers_select" ON public.vehicle_engine_powers
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "districts_select" ON public.districts;
CREATE POLICY "districts_select" ON public.districts
  FOR SELECT USING (is_active = true);

-- Admin/dealer CRUD yapabilir
DROP POLICY IF EXISTS "vehicle_categories_admin_all" ON public.vehicle_categories;
CREATE POLICY "vehicle_categories_admin_all" ON public.vehicle_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "vehicle_trims_admin_all" ON public.vehicle_trims;
CREATE POLICY "vehicle_trims_admin_all" ON public.vehicle_trims
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "vehicle_engine_powers_admin_all" ON public.vehicle_engine_powers;
CREATE POLICY "vehicle_engine_powers_admin_all" ON public.vehicle_engine_powers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "districts_admin_all" ON public.districts;
CREATE POLICY "districts_admin_all" ON public.districts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- 5 Sabit kategori başlangıç verisi
INSERT INTO public.vehicle_categories (slug, name, icon, sort_order) VALUES
  ('otomobil', 'Otomobil', '🚗', 1),
  ('arazi-suv-pikup', 'Arazi-SUV-Pikup', '🚙', 2),
  ('minivan-panelvan', 'Minivan & Panelvan', '🚐', 3),
  ('ticari', 'Ticari Araçlar', '🚚', 4),
  ('motosiklet-utv-atv', 'Motosiklet-UTV-ATV', '🏍️', 5)
ON CONFLICT (slug) DO NOTHING;
