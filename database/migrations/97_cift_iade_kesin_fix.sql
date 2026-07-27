-- ============================================================
-- Migration 97: Çift iade kesin fix
-- ============================================================
-- TARİH: 2026-07-27
-- SORUN: Migration 95'te v_winning_bid NULL olursa veya bidder_id
--   yanlış olursa, kaybedenler LOOP'u kazananı ATLAYAMAZ, +500 iade alır.
--
-- ÇÖZÜM (kesin):
--   1) v_winning_bid NULL ise → fonksiyon hiçbir şey yapmadan döner
--   2) NEW.winner_id kullan (zaten v_winning_bid.bidder_id set ediliyor)
--   3) Kaybedenler LOOP'u: sadece NEW.winner_id OLMAYAN 'holding' olanlar
--   4) Kazanan seat_hold ÖNCE 'won' yapılır, sonra LOOP çalışır
--      (sıralama kritik)
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_auction_ended_seat_settle') THEN
    RAISE EXCEPTION 'fn_auction_ended_seat_settle bulunamadı';
  END IF;
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
  v_winner_user_id UUID;
BEGIN
  IF NEW.status IN ('ended', 'sold')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ended', 'sold')) THEN

    -- Modül ücreti / bloke (admin ayarlı)
    SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500)
    INTO v_seat_fee
    FROM public.site_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
    IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

    -- En yüksek teklif
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE auction_id = NEW.id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    -- ★ NULL kontrolü: teklif yoksa hiçbir şey yapma (güvenli)
    IF v_winning_bid IS NULL THEN
      RETURN NEW;
    END IF;

    -- Kazanan user_id
    v_winner_user_id := v_winning_bid.bidder_id;
    NEW.winner_id := v_winner_user_id;

    -- ★ Kazanan seat_hold: HER DURUMDA bul (status fark etmeksizin)
    SELECT * INTO v_winner_seat
    FROM public.auction_seat_holds
    WHERE auction_id = NEW.id
      AND user_id = v_winner_user_id
    LIMIT 1;

    -- ★ Kazanan kısmı ÖNCE (sıralama kritik)
    IF v_winner_seat IS NOT NULL THEN
      UPDATE public.auction_seat_holds
      SET status = 'won', released_at = now(), left_at = NULL, updated_at = now()
      WHERE id = v_winner_seat.id;

      SELECT COALESCE(wallet_balance, 0) INTO v_winner_balance
      FROM public.profiles WHERE id = v_winner_user_id;

      INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, related_vehicle_id, payment_method, reference_id, completed_at)
      VALUES (
        v_winner_user_id, 0, v_winner_balance, 'completed', 'auction_won',
        'Kazandı (modül bloke olarak alındı: ' || v_seat_fee || ' TL) - ' || COALESCE(NEW.title, 'Açık Arttırma'),
        NEW.id, NEW.vehicle_id, 'wallet', 'auction-' || NEW.id::text || '-won', now()
      );
    END IF;

    -- ★ Kaybedenler LOOP'u: sadece kazanan OLMAYAN 'holding' olanlar
    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND status = 'holding'
        AND user_id != v_winner_user_id  -- ★ KAZANANI ATLA (NULL-safe)
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
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();

DO $$ BEGIN RAISE NOTICE '✅ Migration 97 tamamlandı: çift iade kesin fix'; END $$;
