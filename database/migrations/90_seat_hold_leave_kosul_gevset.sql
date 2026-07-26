-- ============================================================
-- Migration 90: fn_seat_hold_leave koşulunu gevşet
-- ============================================================
-- TARİH: 2026-07-27
-- SORUN: Frontend auction_seat_holds UPDATE ederken left_at NULL
--   bırakıyor. fn_seat_hold_leave koşulu "left_at IS NOT NULL"
--   olduğu için fonksiyon no-op kalıyor, profile.wallet_balance
--   güncellenmiyor, iade gelmiyor.
--
-- SONUÇ: Asya ayrıldı, iade gelmedi, cüzdan 1500 kaldı.
--   Emir kazandı, modül kesilmesi gerekiyordu ama
--   v_winner_seat NULL döndü (Emir'in seat_hold 'released'
--   görünüyordu çünkü Asya ve Suat da 'released' oldu).
--
-- ÇÖZÜM: left_at kontrolünü kaldır. Sadece status değişimi
--   (holding -> released) yeterli. Asya ayrıldığında artık
--   iade +500 alacak.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_seat_hold_leave') THEN
    RAISE EXCEPTION 'fn_seat_hold_leave fonksiyonu bulunamadı';
  END IF;
  RAISE NOTICE 'fn_seat_hold_leave güncelleniyor: left_at koşulu kaldırılıyor...';
END $$;

CREATE OR REPLACE FUNCTION public.fn_seat_hold_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $function$
DECLARE
  v_current_balance NUMERIC(12,2);
  v_new_balance NUMERIC(12,2);
BEGIN
  -- ★ DEĞİŞİKLİK: NEW.left_at IS NOT NULL koşulu kaldırıldı
  -- Artık sadece status değişimi (holding -> released) yeterli
  IF OLD.status = 'holding' AND NEW.status = 'released' THEN
    SELECT COALESCE(wallet_balance, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = NEW.user_id;
    v_new_balance := v_current_balance + NEW.amount;

    UPDATE public.profiles
    SET wallet_balance = v_new_balance
    WHERE id = NEW.user_id;

    INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, payment_method, reference_id, completed_at, created_at)
    VALUES (NEW.user_id, NEW.amount, v_new_balance, 'completed', 'auction_seat_release', 'Masadan ayrılma iadesi', NEW.auction_id, 'wallet', 'seat-leave-' || NEW.id::text, now(), now());

    INSERT INTO public.auction_seat_transactions (auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata)
    VALUES (NEW.auction_id, NEW.user_id, NEW.id, NEW.amount, 'release', v_new_balance, jsonb_build_object('reason', 'seat_leave'));
  END IF;
  RETURN NEW;
END;
$function$;

-- Tetikleyici güvende olmak için
DROP TRIGGER IF EXISTS trg_seat_hold_leave ON public.auction_seat_holds;
CREATE TRIGGER trg_seat_hold_leave
  AFTER UPDATE ON public.auction_seat_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seat_hold_leave();

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 90 tamamlandı: left_at koşulu kaldırıldı';
  RAISE NOTICE '   Asya, Suat, vb. ayrıldığında artık iade alacak';
END $$;
