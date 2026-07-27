-- ============================================================
-- Migration 95: Kazanan bloke = modül (Senaryo 2)
-- ============================================================
-- TARİH: 2026-07-27
-- MANTIK (basit, sade):
--   1) Masaya oturma = -500 bloke (admin ayarlı: v_seat_fee)
--   2) Masadan ayrılma / yarışta kaybetme = +500 bloke iade
--   3) Kazanma (son teklif) = bloke kesilir, modül = bloke
--      EKSTRA KESİNTİ YOK (cüzdana dokunulmaz)
--
-- MODÜL ÜCRETİ: site_settings.auction_seat_hold_fee (admin ayarlı)
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
BEGIN
  IF NEW.status IN ('ended', 'sold')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ended', 'sold')) THEN

    -- ★ Modül ücreti / bloke miktarı (admin'den ayarlanabilir)
    SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500)
    INTO v_seat_fee
    FROM public.site_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
    IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

    -- En yüksek teklif (kazanan = son teklif veren)
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE auction_id = NEW.id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    IF v_winning_bid IS NOT NULL THEN
      NEW.winner_id := v_winning_bid.bidder_id;

      -- ★ Kazanan seat_hold: HER DURUMDA bul (status fark etmeksizin)
      SELECT * INTO v_winner_seat
      FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND user_id = v_winning_bid.bidder_id
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- ★ Kazanan: seat_hold = 'won', cüzdana DOKUNMA
        -- (bloke zaten masaya otururken kesilmişti, modül = bloke)
        UPDATE public.auction_seat_holds
        SET status = 'won', released_at = now(), left_at = NULL, updated_at = now()
        WHERE id = v_winner_seat.id;

        -- Audit: sadece bilgi, para hareketi YOK
        SELECT COALESCE(wallet_balance, 0) INTO v_winner_balance
        FROM public.profiles WHERE id = v_winner_seat.user_id;

        INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, related_vehicle_id, payment_method, reference_id, completed_at)
        VALUES (
          v_winner_seat.user_id,
          0,  -- ★ 0 çünkü para zaten bloke olarak kesilmişti
          v_winner_balance,
          'completed',
          'auction_won',
          'Kazandı (modül bloke olarak alındı: ' || v_seat_fee || ' TL) - ' || COALESCE(NEW.title, 'Açık Arttırma'),
          NEW.id, NEW.vehicle_id, 'wallet', 'auction-' || NEW.id::text || '-won', now()
        );
      END IF;
    END IF;

    -- ★ KAYBEDENLER: sadece kazanan OLMAYAN 'holding' olanlar
    -- (kazananı ATLA, kazanan 'won' yapıldı zaten)
    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND status = 'holding'
        AND user_id != COALESCE(v_winning_bid.bidder_id, '00000000-0000-0000-0000-000000000000')  -- KAZANANI ATLA
    LOOP
      -- Sadece seat_hold UPDATE (cüzdan YOK)
      -- fn_seat_hold_leave bu UPDATE'i yakalayıp +500 iade verir
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

DO $$ BEGIN RAISE NOTICE '✅ Migration 95 tamamlandı: kazanan bloke=modül, kaybedenler iade, modül ücreti admin ayarlı'; END $$;
