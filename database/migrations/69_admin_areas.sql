-- ============================================
-- Migration 69: admin_areas tablosu + seed
-- ============================================
-- Yetkilendirme sayfaları DB'de tutulur
-- Super admin yeni sayfa ekleyebilir (admin panelden)
-- Mevcut hardcoded ALL_AREAS bu tablodan çekilecek

-- 1) Tablo oluştur
CREATE TABLE IF NOT EXISTS public.admin_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,                  -- 'dashboard', 'catalog', 'catalog:otomobil'
  label TEXT NOT NULL,                 -- 'Dashboard', 'Filtreleme Yönetimi', 'Otomobil'
  icon TEXT,                           -- 'LayoutDashboard', 'Filter', 'Car'
  parent_slug TEXT,                    -- 'catalog' (sub_area için) veya null (ana sayfa)
  sort_order INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (slug, COALESCE(parent_slug, ''))
);

-- 2) Index
CREATE INDEX IF NOT EXISTS idx_admin_areas_parent ON public.admin_areas(parent_slug, sort_order);
CREATE INDEX IF NOT EXISTS idx_admin_areas_slug ON public.admin_areas(slug);

-- 3) RLS
ALTER TABLE public.admin_areas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_areas_select ON public.admin_areas;
CREATE POLICY admin_areas_select ON public.admin_areas FOR SELECT USING (true);

DROP POLICY IF EXISTS admin_areas_admin_insert ON public.admin_areas;
CREATE POLICY admin_areas_admin_insert ON public.admin_areas FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_super_admin = true AND is_active = true)
);

DROP POLICY IF EXISTS admin_areas_admin_update ON public.admin_areas;
CREATE POLICY admin_areas_admin_update ON public.admin_areas FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_super_admin = true AND is_active = true)
);

DROP POLICY IF EXISTS admin_areas_admin_delete ON public.admin_areas;
CREATE POLICY admin_areas_admin_delete ON public.admin_areas FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = auth.uid() AND is_super_admin = true AND is_active = true)
);

-- 4) Seed: 16 ana sayfa + 36 alt kategori
-- Ana sayfalar
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order, description) VALUES
  ('dashboard', 'Dashboard', 'LayoutDashboard', NULL, 10, 'Ana panel'),
  ('users', 'Kullanıcılar', 'Users', NULL, 20, 'Tüm kullanıcılar'),
  ('auctions', 'Açık Arttırmalar', 'Gavel', NULL, 30, 'Açık arttırma yönetimi'),
  ('free_listings', 'Ücretsiz İlanlar', 'ListChecks', NULL, 40, 'Ücretsiz ilan yönetimi'),
  ('expertise', 'Ekspertiz', 'ClipboardCheck', NULL, 50, 'Ekspertiz talepleri'),
  ('catalog', 'Filtreleme Yönetimi', 'Filter', NULL, 60, 'Marka/Model/Paket yönetimi'),
  ('info_pages', 'Bilgi Bankası', 'FileText', NULL, 70, 'Bilgi sayfaları'),
  ('site_settings', 'Site Ayarları', 'Settings', NULL, 80, 'Genel site ayarları'),
  ('authorization', 'Yetkilendirme', 'Shield', NULL, 90, 'Admin ve yetki yönetimi'),
  ('dealerships', 'Bayilikler', 'Store', NULL, 100, 'Bayilik yönetimi'),
  ('corporate_applications', 'Kurumsal Başvurular', 'Building2', NULL, 110, 'Kurumsal başvurular'),
  ('valet_applications', 'Vale Başvuruları', 'CarFront', NULL, 120, 'Vale başvuruları'),
  ('franchise_applications', 'Bayi Başvuruları', 'Briefcase', NULL, 130, 'Bayi başvuruları'),
  ('transactions', 'İşlem Geçmişi', 'Wallet', NULL, 140, 'Tüm işlemler'),
  ('payments', 'Hakediş ve Ödemeler', 'Banknote', NULL, 150, 'Ödeme yönetimi'),
  ('audit_logs', 'İşlem Logları', 'History', NULL, 160, 'Admin işlem logları')
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;

-- Catalog alt kategorileri
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order) VALUES
  ('otomobil', 'Otomobil', 'Car', 'catalog', 10),
  ('arazi_suv_pikup', 'Arazi-SUV-Pikup', 'Truck', 'catalog', 20),
  ('minivan_panelvan', 'Minivan & Panelvan', 'Bus', 'catalog', 30),
  ('ticari', 'Ticari Araçlar', 'Truck', 'catalog', 40),
  ('motosiklet_utv_atv', 'Motosiklet-UTV-ATV', 'Bike', 'catalog', 50)
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;

-- Auctions alt kategorileri
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order) VALUES
  ('live', 'Devam Eden', 'Play', 'auctions', 10),
  ('upcoming', 'Yaklaşan', 'Clock', 'auctions', 20),
  ('ended', 'Tamamlanan', 'Check', 'auctions', 30),
  ('sold', 'Satılan', 'CheckCircle2', 'auctions', 40)
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;

-- Free listings alt kategorileri
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order) VALUES
  ('pending', 'Onay Bekleyenler', 'Clock', 'free_listings', 10),
  ('approved', 'Onaylılar', 'Check', 'free_listings', 20),
  ('rejected', 'Reddedilenler', 'X', 'free_listings', 30)
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;

-- Users alt kategorileri
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order) VALUES
  ('individual', 'Bireysel', 'User', 'users', 10),
  ('corporate', 'Kurumsal', 'Building2', 'users', 20)
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;

-- Transactions alt kategorileri
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order) VALUES
  ('listings', 'İlan Ödemeleri', 'FileText', 'transactions', 10),
  ('premium', 'Premium', 'Star', 'transactions', 20),
  ('commissions', 'Komisyonlar', 'Percent', 'transactions', 30)
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;

-- Site settings alt kategorileri
INSERT INTO public.admin_areas (slug, label, icon, parent_slug, sort_order) VALUES
  ('theme', 'Tema', 'Palette', 'site_settings', 10),
  ('advertisements', 'Reklamlar', 'Megaphone', 'site_settings', 20),
  ('logos', 'Logolar', 'Image', 'site_settings', 30),
  ('eids_settings', 'EİDS Yapılandırma', 'FileCheck', 'site_settings', 40),
  ('eids_logs', 'EİDS Sorgu Logları', 'Activity', 'site_settings', 50),
  ('payment_methods', 'Ödeme Yöntemleri', 'CreditCard', 'site_settings', 60)
ON CONFLICT (slug, COALESCE(parent_slug, '')) DO NOTHING;
