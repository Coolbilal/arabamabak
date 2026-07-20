-- ============================================================
-- Migration 55: İlan Formu Genişletme
-- Tarih: 2026-07-18
-- Amaç: sahibinden.com benzeri detaylı ilan formu için
--       yeni tablolar + vehicles tablosuna opsiyonel kolonlar
-- Geriye uyumlu: Mevcut kolonlar/tablolar DOKUNULMAZ
-- ============================================================

-- ============================================================
-- 1) vehicle_sub_models (Alt Versiyon / Donanım)
-- Örn: Eco Elegance, RS, Sport, Executive Plus
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_sub_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_models_model_id ON vehicle_sub_models(model_id);
CREATE INDEX IF NOT EXISTS idx_sub_models_active ON vehicle_sub_models(model_id, is_active) WHERE is_active = true;

-- ============================================================
-- 2) vehicle_model_engines (Motor Seçenekleri)
-- Örn: 1.5 i-VTEC, 1.6i VTEC, 2.0
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_model_engines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES vehicle_models(id) ON DELETE CASCADE,
  name text NOT NULL,
  displacement_cc integer,
  fuel_type text,
  power_hp integer,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_model_engines_model_id ON vehicle_model_engines(model_id);

-- ============================================================
-- 3) vehicle_years (Yıl Lookup)
-- 1990'dan bugüne + gelecek yıl
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_years (
  year integer PRIMARY KEY,
  is_active boolean DEFAULT true
);
INSERT INTO vehicle_years (year) VALUES 
  (2027), (2026), (2025), (2024), (2023), (2022), (2021), (2020),
  (2019), (2018), (2017), (2016), (2015), (2014), (2013), (2012),
  (2011), (2010), (2009), (2008), (2007), (2006), (2005), (2004),
  (2003), (2002), (2001), (2000), (1999), (1998), (1997), (1996),
  (1995), (1994), (1993), (1992), (1991), (1990)
ON CONFLICT (year) DO NOTHING;

-- ============================================================
-- 4) vehicle_fuel_types (Yakıt Tipleri Lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_fuel_types (
  code text PRIMARY KEY,
  name text NOT NULL,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);
INSERT INTO vehicle_fuel_types (code, name, sort_order) VALUES
  ('dizel', 'Dizel', 1),
  ('benzin', 'Benzin', 2),
  ('lpg_benzin', 'LPG & Benzin', 3),
  ('hibrit', 'Hibrit', 4),
  ('elektrik', 'Elektrik', 5)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 5) vehicle_colors (Renk Lookup)
-- ============================================================
CREATE TABLE IF NOT EXISTS vehicle_colors (
  code text PRIMARY KEY,
  name text NOT NULL,
  hex text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true
);
INSERT INTO vehicle_colors (code, name, hex, sort_order) VALUES
  ('bej', 'Bej', '#F5F5DC', 1),
  ('beyaz', 'Beyaz', '#FFFFFF', 2),
  ('bordo', 'Bordo', '#722F37', 3),
  ('gri', 'Gri', '#808080', 4),
  ('gri_acik', 'Gri (Açık)', '#C0C0C0', 5),
  ('gri_koyu', 'Gri (Koyu)', '#404040', 6),
  ('kahverengi', 'Kahverengi', '#8B4513', 7),
  ('kirmizi', 'Kırmızı', '#DC143C', 8),
  ('lacivert', 'Lacivert', '#1A2B4A', 9),
  ('mavi', 'Mavi', '#0000FF', 10),
  ('mor', 'Mor', '#800080', 11),
  ('sari', 'Sarı', '#FFD700', 12),
  ('siyah', 'Siyah', '#000000', 13),
  ('turuncu', 'Turuncu', '#FFA500', 14),
  ('yesil', 'Yeşil', '#008000', 15),
  ('yesil_acik', 'Yeşil (Açık)', '#90EE90', 16)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- 6) vehicles tablosuna yeni opsiyonel kolonlar
-- Tüm default NULL — geriye uyumlu, mevcut veriye dokunmaz
-- ============================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS sub_model text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS engine_size_label text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS fuel_type_label text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS vehicle_condition text; -- 'sifir', 'ikinci_el'

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate_number text;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS plate_country text DEFAULT 'TR';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS garanti_durumu text; -- 'var', 'yok', 'bitmis'
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS garanti_bitis_tarihi date;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ilk_sahibi boolean;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS takasa_uygun boolean;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tramer_durumu text; -- 'bilinmiyor', 'yok', 'var', 'agir_hasarli'
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tramer_tutari numeric;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS tramer_detay text;

ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS contact_preference text; -- 'phone_message', 'phone_only', 'message_only'
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS contact_phone text;

-- ============================================================
-- 7) Indexes (performans, opsiyonel)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_vehicles_sub_model ON vehicles(sub_model) WHERE sub_model IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_fuel_type ON vehicles(fuel_type_label) WHERE fuel_type_label IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_condition ON vehicles(vehicle_condition) WHERE vehicle_condition IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_plate_number ON vehicles(plate_number) WHERE plate_number IS NOT NULL;

-- ============================================================
-- 8) RLS — Yeni tablolar için
-- ============================================================
ALTER TABLE vehicle_sub_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_model_engines ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_fuel_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_colors ENABLE ROW LEVEL SECURITY;

-- Herkes okuyabilsin (SELECT)
DROP POLICY IF EXISTS "sub_models_select_all" ON vehicle_sub_models;
CREATE POLICY "sub_models_select_all" ON vehicle_sub_models FOR SELECT USING (true);

DROP POLICY IF EXISTS "model_engines_select_all" ON vehicle_model_engines;
CREATE POLICY "model_engines_select_all" ON vehicle_model_engines FOR SELECT USING (true);

DROP POLICY IF EXISTS "years_select_all" ON vehicle_years;
CREATE POLICY "years_select_all" ON vehicle_years FOR SELECT USING (true);

DROP POLICY IF EXISTS "fuel_types_select_all" ON vehicle_fuel_types;
CREATE POLICY "fuel_types_select_all" ON vehicle_fuel_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "colors_select_all" ON vehicle_colors;
CREATE POLICY "colors_select_all" ON vehicle_colors FOR SELECT USING (true);

-- Admin/dealer INSERT/UPDATE/DELETE
DROP POLICY IF EXISTS "sub_models_admin_write" ON vehicle_sub_models;
CREATE POLICY "sub_models_admin_write" ON vehicle_sub_models FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "model_engines_admin_write" ON vehicle_model_engines;
CREATE POLICY "model_engines_admin_write" ON vehicle_model_engines FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "years_admin_write" ON vehicle_years;
CREATE POLICY "years_admin_write" ON vehicle_years FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "fuel_types_admin_write" ON vehicle_fuel_types;
CREATE POLICY "fuel_types_admin_write" ON vehicle_fuel_types FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "colors_admin_write" ON vehicle_colors;
CREATE POLICY "colors_admin_write" ON vehicle_colors FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- ============================================================
-- Tamamlandı: 5 yeni lookup tablosu + 14 yeni kolon
-- Mevcut yapıya DOKUNULMADI
-- ============================================================
