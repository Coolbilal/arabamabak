-- ============================================================
-- Migration 91: Tüm kullanıcı cüzdanlarını 2000'e resetle
-- ============================================================
-- TARİH: 2026-07-27
-- NEDEN: Test için temiz başlangıç. Hata görmek kolay olsun.
-- ============================================================

DO $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.profiles
  SET wallet_balance = 2000,
      updated_at = now()
  WHERE wallet_balance != 2000
     OR updated_at IS NULL;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ % kullanıcının cüzdanı 2000 TL olarak ayarlandı', v_count;
END $$;

-- Kontrol
DO $$
DECLARE
  v_user RECORD;
BEGIN
  RAISE NOTICE '--- Güncel cüzdan bakiyeleri ---';
  FOR v_user IN
    SELECT full_name, wallet_balance
    FROM public.profiles
    ORDER BY full_name
  LOOP
    RAISE NOTICE '  % : % TL', v_user.full_name, v_user.wallet_balance;
  END LOOP;
END $$;
