-- ============================================================
-- Migration 96: Cüzdanları 2000'e resetle
-- ============================================================
-- TARİH: 2026-07-27
-- NEDEN: Test öncesi temiz başlangıç
-- ============================================================

DO $$
DECLARE v_count INT;
BEGIN
  UPDATE public.profiles SET wallet_balance = 2000, updated_at = now();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ % kullanıcı 2000 TL yapıldı', v_count;
END $$;

DO $$
DECLARE v_user RECORD;
BEGIN
  RAISE NOTICE '--- Cüzdanlar ---';
  FOR v_user IN SELECT full_name, wallet_balance FROM public.profiles ORDER BY full_name LOOP
    RAISE NOTICE '  % : % TL', v_user.full_name, v_user.wallet_balance;
  END LOOP;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Migration 96 tamamlandı'; END $$;
