-- ============================================
-- Migration 64: Admin Yetkilendirme + Audit Log
-- ============================================
-- Mevcut admin_users, admin_permissions korunur
-- Yeni: sub_area (alt alan yetkisi), custom_role, must_change_password
-- Yeni: admin_activity_logs (işlem kayıtları)
-- Yeni: trigger'lar (vehicles, auctions, info_pages)

-- 1) admin_permissions'a sub_area + updated_at
ALTER TABLE public.admin_permissions
  ADD COLUMN IF NOT EXISTS sub_area TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Unique constraint güncelle (area, sub_area birlikte unique)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_permissions_user_id_area_key'
  ) THEN
    ALTER TABLE admin_permissions DROP CONSTRAINT admin_permissions_user_id_area_key;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_permissions_unique
  ON admin_permissions (user_id, area, COALESCE(sub_area, ''));

-- 2) admin_users'a custom_role, last_sign_in_at, must_change_password
ALTER TABLE public.admin_users
  ADD COLUMN IF NOT EXISTS custom_role TEXT,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 3) admin_activity_logs (yeni tablo)
CREATE TABLE IF NOT EXISTS public.admin_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_admin ON public.admin_activity_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_resource ON public.admin_activity_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON public.admin_activity_logs(action, created_at DESC);

ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin kendi loglarını, super admin tüm logları görebilir
DROP POLICY IF EXISTS activity_select ON public.admin_activity_logs;
CREATE POLICY activity_select ON public.admin_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE id = admin_activity_logs.admin_user_id
        AND user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid() AND is_super_admin = true
    )
  );

-- INSERT: trigger'lar yapacak
DROP POLICY IF EXISTS activity_insert ON public.admin_activity_logs;
CREATE POLICY activity_insert ON public.admin_activity_logs
  FOR INSERT WITH CHECK (true);

-- 4) Genel log trigger fonksiyonu
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_action TEXT;
BEGIN
  -- Mevcut admin'i bul
  SELECT id INTO v_admin_id FROM public.admin_users
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_action := lower(TG_OP);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.admin_activity_logs (admin_user_id, action, resource_type, resource_id, details)
    VALUES (v_admin_id, v_action, TG_TABLE_NAME, NEW.id,
      jsonb_build_object('new', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.admin_activity_logs (admin_user_id, action, resource_type, resource_id, details)
    VALUES (v_admin_id, v_action, TG_TABLE_NAME, NEW.id,
      jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.admin_activity_logs (admin_user_id, action, resource_type, resource_id, details)
    VALUES (v_admin_id, v_action, TG_TABLE_NAME, OLD.id,
      jsonb_build_object('old', to_jsonb(OLD)));
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5) Trigger'lar (sadece admin aksiyonları için, RLS'ye uygun)
DROP TRIGGER IF EXISTS trg_log_vehicles ON public.vehicles;
CREATE TRIGGER trg_log_vehicles
AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS trg_log_auctions ON public.auctions;
CREATE TRIGGER trg_log_auctions
AFTER INSERT OR UPDATE OR DELETE ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS trg_log_info_pages ON public.info_pages;
CREATE TRIGGER trg_log_info_pages
AFTER INSERT OR UPDATE OR DELETE ON public.info_pages
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS trg_log_admin_brands ON public.vehicle_brands;
CREATE TRIGGER trg_log_admin_brands
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_brands
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS trg_log_admin_models ON public.vehicle_models;
CREATE TRIGGER trg_log_admin_models
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_models
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS trg_log_admin_trims ON public.vehicle_trims;
CREATE TRIGGER trg_log_admin_trims
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_trims
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS trg_log_admin_sub_trims ON public.vehicle_sub_trims;
CREATE TRIGGER trg_log_admin_sub_trims
AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_sub_trims
FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();
