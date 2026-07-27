-- ============================================================
-- Migration 94: Çift iade bug fix v2 + sıfırlama
-- ============================================================
-- TARİH: 2026-07-27
-- NEDEN: Migration 92 Supabase'de aktif değildi, çift iade devam
--   ediyordu. Bu migration hem sıfırlama hem kesin fix yapar.
--
-- YAPILACAK:
--   1) auction_seat_transactions temizle
--   2) transactions temizle
--   3) profile.wallet_balance = 2000
--   4) fn_auction_ended_seat_settle: kaybedenler için cüzdan YOK
--      Sadece auction_seat_holds UPDATE (status='released')
--      fn_seat_hold_leave tek başına iade verir
-- ============================================================

DO $$
DECLARE v_count_tx INT; v_count_ast INT; v_count_profile INT;
BEGIN
  -- 1) Auction seat transactions temizle
  DELETE FROM public.auction_seat_transactions;
  GET DIAGNOSTICS v_count_ast = ROW_COUNT;
  RAISE NOTICE '✅ auction_seat_transactions: % satır silindi', v_count_ast;

  -- 2) Tüm cüzdan hareketlerini temizle
  DELETE FROM public.transactions;
  GET DIAGNOSTICS v_count_tx = ROW_COUNT;
  RAISE NOTICE '✅ transactions: % satır silindi', v_count_tx;

  -- 3) Cüzdanları 2000'e sabitle
  UPDATE public.profiles SET wallet_balance = 2000, updated_at = now();
  GET DIAGNOSTICS v_count_profile = ROW_COUNT;
  RAISE NOTICE '✅ profiles: % kullanıcı 2000 TL', v_count_profile;
END $$;

-- 4) fn_auction_ended_seat_settle: KAYBEDENLER İÇİN CÜZDAN DOKUNMA
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_auction_ended_seat_settle') THEN
    RAISE EXCEPTION 'fn_auction_ended_seat_settle bulunamadı';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.fn_auction_ended_seat_settle()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER
SET search_path = 'public' SET row_security = off
AS $$
DECLARE
  v_winning_bid RECORD; v_winner_seat RECORD; v_loser_seat RECORD;
  v_seat_fee NUMERIC(12,2);
  v_winner_balance NUMERIC(12,2); v_winner_new_balance NUMERIC(12,2);
BEGIN
  IF NEW.status IN ('ended', 'sold')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ended', 'sold')) THEN

    SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500) INTO v_seat_fee
    FROM public.site_settings ORDER BY updated_at DESC NULLS LAST LIMIT 1;
    IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

    SELECT * INTO v_winning_bid FROM public.bids
    WHERE auction_id = NEW.id ORDER BY amount DESC, created_at ASC LIMIT 1;

    IF v_winning_bid IS NOT NULL THEN
      NEW.winner_id := v_winning_bid.bidder_id;

      SELECT * INTO v_winner_seat FROM public.auction_seat_holds
      WHERE auction_id = NEW.id AND user_id = v_winning_bid.bidder_id
        AND status IN ('holding', 'won') LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- KAZANAN: -500 modül (tek seferlik, kalıcı)
        SELECT COALESCE(wallet_balance, 0) INTO v_winner_balance
        FROM public.profiles WHERE id = v_winner_seat.user_id;
        v_winner_new_balance := v_winner_balance - v_seat_fee;
        IF v_winner_new_balance < 0 THEN v_winner_new_balance := 0; END IF;

        UPDATE public.auction_seat_holds
        SET status = 'won', released_at = now(), left_at = NULL, updated_at = now()
        WHERE id = v_winner_seat.id;

        UPDATE public.profiles SET wallet_balance = v_winner_new_balance
        WHERE id = v_winner_seat.user_id;

        INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, related_vehicle_id, payment_method, reference_id, completed_at)
        VALUES (v_winner_seat.user_id, v_seat_fee, v_winner_new_balance, 'completed', 'auction_won', 'Modül ücreti - ' || COALESCE(NEW.title, 'Açık Arttırma'), NEW.id, NEW.vehicle_id, 'wallet', 'auction-' || NEW.id::text || '-module-fee', now());
      END IF;
    END IF;

    -- KAYBEDENLER: SADECE seat_hold UPDATE (cüzdan YOK)
    -- fn_seat_hold_leave bu UPDATE'i yakalayıp tek iade yapar
    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id AND status = 'holding'
    LOOP
      UPDATE public.auction_seat_holds
      SET status = 'released', released_at = now(), left_at = NULL, updated_at = now()
      WHERE id = v_loser_seat.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_ended_seat_settle ON public.auctions;
CREATE TRIGGER trg_auction_ended_seat_settle
  AFTER UPDATE OF status ON public.auctions FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();

-- Kontrol
DO $$
DECLARE v_user RECORD;
BEGIN
  RAISE NOTICE '--- Cüzdanlar ---';
  FOR v_user IN SELECT full_name, wallet_balance FROM public.profiles ORDER BY full_name LOOP
    RAISE NOTICE '  % : % TL', v_user.full_name, v_user.wallet_balance;
  END LOOP;
  RAISE NOTICE 'transactions: %', (SELECT COUNT(*) FROM public.transactions);
  RAISE NOTICE 'auction_seat_transactions: %', (SELECT COUNT(*) FROM public.auction_seat_transactions);
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Migration 94 tamamlandı: sıfırla + çift iade fix kesin aktif'; END $$;
