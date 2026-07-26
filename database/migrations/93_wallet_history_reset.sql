-- ============================================================
-- Migration 93: Hesap hareketlerini sıfırla
-- ============================================================
-- TARİH: 2026-07-27
-- NEDEN: Geçmiş testlerden kalan buggy transactions birikti.
--   "Hesap Hareketleri" sıfırlansın, temiz başlangıç.
--
-- YAPILACAK:
--   1) auction_seat_transactions tablosu temizle (audit)
--   2) transactions tablosu temizle (tüm cüzdan hareketleri)
--   3) profile.wallet_balance = 2000 (idempotent kontrol)
--
-- ⚠️ DİKKAT: Bu DELETE geri alınamaz. Cüzdan 2000'e sabitlenir.
-- ============================================================

DO $$
DECLARE
  v_count_tx INT;
  v_count_ast INT;
  v_count_profile INT;
BEGIN
  -- 1) Auction seat transactions audit temizle
  DELETE FROM public.auction_seat_transactions;
  GET DIAGNOSTICS v_count_ast = ROW_COUNT;
  RAISE NOTICE '✅ auction_seat_transactions: % satır silindi', v_count_ast;

  -- 2) Tüm cüzdan hareketlerini temizle
  DELETE FROM public.transactions;
  GET DIAGNOSTICS v_count_tx = ROW_COUNT;
  RAISE NOTICE '✅ transactions: % satır silindi', v_count_tx;

  -- 3) Cüzdanları 2000'e sabitle (idempotent)
  UPDATE public.profiles
  SET wallet_balance = 2000, updated_at = now();
  GET DIAGNOSTICS v_count_profile = ROW_COUNT;
  RAISE NOTICE '✅ profiles: % kullanıcı 2000 TL yapıldı', v_count_profile;
END $$;

-- Kontrol: güncel durum
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

  RAISE NOTICE '--- transactions sayısı ---';
  RAISE NOTICE '  transactions: %', (SELECT COUNT(*) FROM public.transactions);
  RAISE NOTICE '  auction_seat_transactions: %', (SELECT COUNT(*) FROM public.auction_seat_transactions);
END $$;
