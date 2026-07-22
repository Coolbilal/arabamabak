-- ============================================
-- Migration 68: admin_permissions sub_area kolonunu kaldır
-- ============================================
-- Sub_area'lı detaylı yetkilendirme sistemi kaldırılıyor.
-- Sadece area bazlı (sayfa bazlı) yetkilendirme.

-- 1) Mevcut sub_area'lı kayıtları ana alana (sub_area=null) çevir
-- Öncelik: sub_area'lı kayıt varsa onu ana kayıt yap, ana kayıt varsa birleştir (OR mantığı)
DO $$
DECLARE
  r RECORD;
  v_has_main BOOLEAN;
  v_main_view BOOLEAN;
  v_main_edit BOOLEAN;
  v_main_approve BOOLEAN;
  v_main_del BOOLEAN;
BEGIN
  -- Her admin için: sub_area'lı kayıtların OR'unu al, ana kayıt oluştur
  FOR r IN (
    SELECT DISTINCT admin_user_id, area
    FROM admin_permissions
    WHERE sub_area IS NOT NULL
  ) LOOP
    -- Ana kayıt var mı?
    SELECT can_view, can_edit, can_approve, can_delete
      INTO v_main_view, v_main_edit, v_main_approve, v_main_del
    FROM admin_permissions
    WHERE admin_user_id = r.admin_user_id AND area = r.area AND sub_area IS NULL;

    -- Sub_area'lı kayıtlardan OR hesapla
    SELECT
      bool_or(can_view), bool_or(can_edit), bool_or(can_approve), bool_or(can_delete)
      INTO v_main_view, v_main_edit, v_main_approve, v_main_del
    FROM admin_permissions
    WHERE admin_user_id = r.admin_user_id AND area = r.area AND sub_area IS NOT NULL;

    -- Ana kaydı upsert et
    INSERT INTO admin_permissions (admin_user_id, area, sub_area, can_view, can_edit, can_approve, can_delete)
    VALUES (r.admin_user_id, r.area, NULL, v_main_view, v_main_edit, v_main_approve, v_main_del)
    ON CONFLICT (admin_user_id, area) DO UPDATE
      SET can_view = EXCLUDED.can_view OR admin_permissions.can_view,
          can_edit = EXCLUDED.can_edit OR admin_permissions.can_edit,
          can_approve = EXCLUDED.can_approve OR admin_permissions.can_approve,
          can_delete = EXCLUDED.can_delete OR admin_permissions.can_delete;

    -- Sub_area'lı kayıtları sil
    DELETE FROM admin_permissions
    WHERE admin_user_id = r.admin_user_id AND area = r.area AND sub_area IS NOT NULL;
  END LOOP;
END $$;

-- 2) Unique constraint'i sadece (admin_user_id, area) yap
ALTER TABLE admin_permissions
  DROP CONSTRAINT IF EXISTS admin_permissions_user_id_area_key;

DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  -- sub_area içeren tüm unique constraint'leri sil
  FOR v_constraint_name IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.admin_permissions'::regclass
      AND contype = 'u'
  LOOP
    EXECUTE format('ALTER TABLE public.admin_permissions DROP CONSTRAINT %I', v_constraint_name);
  END LOOP;
END $$;

-- Yeni unique constraint
ALTER TABLE admin_permissions
  ADD CONSTRAINT admin_permissions_user_id_area_key UNIQUE (admin_user_id, area);

-- 3) Eski index'i sil
DROP INDEX IF EXISTS idx_admin_permissions_unique;

-- 4) sub_area kolonunu sil
ALTER TABLE admin_permissions DROP COLUMN IF EXISTS sub_area;

-- 5) Doğrulama
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.admin_permissions'::regclass AND contype = 'u';

SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'admin_permissions'
ORDER BY ordinal_position;
