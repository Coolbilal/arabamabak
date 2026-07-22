-- ============================================
-- Migration 67: admin_permissions unique constraint düzeltme
-- ============================================
-- Eski constraint: admin_permissions_user_id_area_key (admin_user_id, area)
-- Yeni index: idx_admin_permissions_unique (admin_user_id, area, COALESCE(sub_area, ''))
-- Çakışma: eski constraint yeni sub_area destekli index ile çakışıyor
-- Çözüm: Eski constraint'i kaldır, sub_area dahil yeni unique index

-- 1) Eski unique constraint'i sil
DO $$
DECLARE
  v_constraint_name TEXT;
BEGIN
  SELECT conname INTO v_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.admin_permissions'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) LIKE '%(admin_user_id, area)%';
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.admin_permissions DROP CONSTRAINT %I', v_constraint_name);
    RAISE NOTICE 'Eski unique constraint silindi: %', v_constraint_name;
  END IF;
END $$;

-- 2) Yeni unique index (sub_area dahil) - zaten Migration 64'te oluşturulmuş
-- Olmadığı durumda oluştur
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_permissions_unique
  ON public.admin_permissions (admin_user_id, area, COALESCE(sub_area, ''));

-- 3) Mevcut constraint'i de sub_area dahil yap (eğer kalmadıysa)
DO $$
BEGIN
  -- Eğer hâlâ bir unique constraint varsa (sub_area'sız), onu da sil
  PERFORM 1 FROM pg_constraint
  WHERE conrelid = 'public.admin_permissions'::regclass
    AND contype = 'u'
    AND pg_get_constraintdef(oid) NOT LIKE '%COALESCE%'
    AND conname != 'idx_admin_permissions_unique';
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4) Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'public.admin_permissions'::regclass AND contype = 'u';
