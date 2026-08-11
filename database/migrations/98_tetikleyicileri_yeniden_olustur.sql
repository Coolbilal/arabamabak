-- ============================================================
-- Migration 98: Tetikleyicileri yeniden oluştur
-- ============================================================
-- TARİH: 2026-08-11
-- SORUN: Migration 92/94/95/97'de DROP/CREATE TRIGGER yapıldı ama
--   bir noktada tetikleyiciler düşmüş. Kontrol sorgusu (pg_trigger)
--   0 satır döndürdü → tetikleyici YOK.
--
-- SONUÇ: fn_seat_hold_join, fn_seat_hold_leave, fn_auction_ended_seat_settle
--   fonksiyonları var ama tetiklenmiyordu. Cüzdan işlemleri frontend'den
--   geliyordu (RPC join_table/leave_table + manuel UPDATE), çift iade oluyordu.
--
-- ÇÖZÜM: 3 tetikleyiciyi yeniden oluştur:
--   1) trg_seat_hold_join (INSERT/UPDATE status) → fn_seat_hold_join
--   2) trg_seat_hold_leave (UPDATE) → fn_seat_hold_leave
--   3) trg_auction_ended_seat_settle (UPDATE OF status) → fn_auction_ended_seat_settle
--
-- CÜZDANLARA DOKUNULMAZ (kullanıcı manuel sıfırlayacak)
-- ============================================================

-- 1) Masaya oturma tetikleyicisi
DROP TRIGGER IF EXISTS trg_seat_hold_join ON public.auction_seat_holds;
CREATE TRIGGER trg_seat_hold_join
  AFTER INSERT OR UPDATE OF status ON public.auction_seat_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seat_hold_join();

-- 2) Masadan ayrılma tetikleyicisi
DROP TRIGGER IF EXISTS trg_seat_hold_leave ON public.auction_seat_holds;
CREATE TRIGGER trg_seat_hold_leave
  AFTER UPDATE ON public.auction_seat_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seat_hold_leave();

-- 3) Auction bitti tetikleyicisi
DROP TRIGGER IF EXISTS trg_auction_ended_seat_settle ON public.auctions;
CREATE TRIGGER trg_auction_ended_seat_settle
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();

-- Doğrulama
DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_trigger t
  JOIN pg_proc p ON t.tgfoid = p.oid
  WHERE tgrelid::regclass::text IN (
    'public.auction_seat_holds', 'public.auctions'
  )
  AND NOT tgisinternal
  AND proname IN (
    'fn_seat_hold_join', 'fn_seat_hold_leave', 'fn_auction_ended_seat_settle'
  );
  RAISE NOTICE '✅ % tetikleyici aktif', v_count;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Migration 98 tamamlandı: tetikleyiciler yeniden oluşturuldu'; END $$;
