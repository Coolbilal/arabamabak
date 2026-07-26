-- ============================================================
-- Migration 92: Çift iade bug fix + cüzdan reset
-- ============================================================
-- TARİH: 2026-07-27
-- SORUN: Migration 90 ile fn_seat_hold_leave her UPDATE'te
--   tetiklenir hale geldi. fn_auction_ended_seat_settle
--   kaybedenler LOOP'unda hem seat_hold güncelliyor HEM DE
--   cüzdana iade veriyor. Sonra fn_seat_hold_leave tetiklenip
--   AYNI KAYBEDENLERE 2. KEZ iade veriyor. → ÇİFT İADE!
--
-- ÇÖZÜM: fn_auction_ended_seat_settle kaybedenler LOOP'undan
--   cüzdan işlemlerini (UPDATE profiles, INSERT transactions)
--   kaldır. Sadece auction_seat_holds UPDATE bırak.
--   fn_seat_hold_leave zaten bu UPDATE'i yakalayıp iade
--   veriyor. → TEK İADE.
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_auction_ended_seat_settle') THEN
    RAISE EXCEPTION 'fn_auction_ended_seat_settle bulunamadı';
  END IF;
  RAISE NOTICE 'fn_auction_ended_seat_settle düzeltiliyor: cüzdan işlemleri kaldırılıyor (çift iade fix)';
END $$;

CREATE OR REPLACE FUNCTION public.fn_auction_ended_seat_settle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
SET row_security = off
AS $$
DECLARE
  v_winning_bid RECORD;
  v_winner_seat RECORD;
  v_loser_seat RECORD;
  v_seat_fee NUMERIC(12,2);
  v_winner_balance NUMERIC(12,2);
  v_winner_new_balance NUMERIC(12,2);
BEGIN
  IF NEW.status IN ('ended', 'sold')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ended', 'sold')) THEN

    SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500)
    INTO v_seat_fee
    FROM public.site_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
    IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE auction_id = NEW.id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    IF v_winning_bid IS NOT NULL THEN
      NEW.winner_id := v_winning_bid.bidder_id;

      SELECT * INTO v_winner_seat
      FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND user_id = v_winning_bid.bidder_id
        AND status IN ('holding', 'won')
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- KAZANAN: -500 modül ücreti (KALICI)
        SELECT COALESCE(wallet_balance, 0) INTO v_winner_balance
        FROM public.profiles
        WHERE id = v_winner_seat.user_id;
        v_winner_new_balance := v_winner_balance - v_seat_fee;
        IF v_winner_new_balance < 0 THEN v_winner_new_balance := 0; END IF;

        UPDATE public.auction_seat_holds
        SET status = 'won', released_at = now(), left_at = NULL, updated_at = now()
        WHERE id = v_winner_seat.id;

        UPDATE public.profiles
        SET wallet_balance = v_winner_new_balance
        WHERE id = v_winner_seat.user_id;

        INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, related_vehicle_id, payment_method, reference_id, completed_at)
        VALUES (v_winner_seat.user_id, v_seat_fee, v_winner_new_balance, 'completed', 'auction_won', 'Açık arttırma modül ücreti - ' || COALESCE(NEW.title, 'Açık Arttırma'), NEW.id, NEW.vehicle_id, 'wallet', 'auction-' || NEW.id::text || '-module-fee', now());
      END IF;
    END IF;

    -- KAYBEDENLER: SADECE seat_hold güncelle (cüzdan işlemi YOK)
    -- fn_seat_hold_leave tetiklenecek ve cüzdan iadesini yapacak
    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id AND status = 'holding'
    LOOP
      UPDATE public.auction_seat_holds
      SET status = 'released', released_at = now(), left_at = NULL, updated_at = now()
      WHERE id = v_loser_seat.id;
      -- ↑ Bu UPDATE trg_seat_hold_leave tetikler
      --   fn_seat_hold_leave çalışır, profile +500, transactions INSERT
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_ended_seat_settle ON public.auctions;
CREATE TRIGGER trg_auction_ended_seat_settle
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();

-- Cüzdanları 2000'e resetle
DO $$
DECLARE v_count INT;
BEGIN
  UPDATE public.profiles SET wallet_balance = 2000, updated_at = now()
  WHERE wallet_balance != 2000 OR updated_at IS NULL;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '✅ % kullanıcı 2000 TL yapıldı', v_count;
END $$;

-- Eski buggy transactions'ları audit için bırak, silme
-- (ileride referans olarak gerekebilir)

DO $$ BEGIN RAISE NOTICE '✅ Migration 92 tamamlandı: çift iade fix + cüzdan reset'; END $$;
