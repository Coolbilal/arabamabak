-- ============================================
-- Migration 80: fn_auction_ended_seat_settle (sold status + audit only)
-- arabamabak - 'sold' durumu + kaybeden sadece audit
-- ============================================
-- YENİ MANTIK:
--   Trigger: 'ended' VEYA 'sold' durumunda çalış
--   Kazanma: cüzdandan -500 (modül ücreti KALICI)
--   Kaybetme: SADECE audit, cüzdana dokunma
--             (bloke iptal zaten masada iken gerçekleşti)
--
-- NOT: Mevcut cüzdan bakiyelerine DOKUNULMAZ.
-- ============================================

CREATE OR REPLACE FUNCTION public.fn_auction_ended_seat_settle()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winning_bid RECORD;
  v_winner_seat RECORD;
  v_loser_seat RECORD;
  v_seat_fee NUMERIC(12,2);
  v_winner_balance NUMERIC(12,2);
  v_winner_new_balance NUMERIC(12,2);
BEGIN
  -- 'ended' VEYA 'sold' durumunda tetiklensin
  IF NEW.status IN ('ended', 'sold')
     AND (OLD.status IS NULL OR OLD.status NOT IN ('ended', 'sold')) THEN

    -- seat_hold_fee al (default 500)
    SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500)
    INTO v_seat_fee
    FROM public.site_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
    IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

    -- Kazanan teklif (en yüksek miktar, en eski)
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE auction_id = NEW.id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    IF v_winning_bid IS NOT NULL THEN
      NEW.winner_id := v_winning_bid.bidder_id;

      -- Kazanan seat_hold bul (status='holding')
      SELECT * INTO v_winner_seat
      FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND user_id = v_winning_bid.bidder_id
        AND status = 'holding'
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- Kazanan mevcut cüzdani
        SELECT wallet_balance INTO v_winner_balance
        FROM public.profiles
        WHERE id = v_winner_seat.user_id;
        v_winner_balance := COALESCE(v_winner_balance, 0);
        v_winner_new_balance := v_winner_balance - v_seat_fee;

        IF v_winner_new_balance < 0 THEN
          v_winner_new_balance := 0;
        END IF;

        -- seat_hold: holding -> won
        UPDATE public.auction_seat_holds
        SET status = 'won', released_at = now(), updated_at = now()
        WHERE id = v_winner_seat.id;

        -- profiles: KALICI modül ücreti kesimi
        UPDATE public.profiles
        SET wallet_balance = v_winner_new_balance
        WHERE id = v_winner_seat.user_id;

        -- Audit: forfeit
        INSERT INTO public.auction_seat_transactions (
          auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
        ) VALUES (
          NEW.id, v_winner_seat.user_id, v_winner_seat.id,
          v_seat_fee, 'forfeit', v_winner_new_balance,
          jsonb_build_object('reason', 'auction_won', 'auction_id', NEW.id)
        );

        -- Transaction: auction_won (modül ücreti, KALICI kesim)
        INSERT INTO public.transactions (
          user_id, amount, status, type,
          description, related_auction_id, related_vehicle_id,
          payment_method, reference_id, completed_at
        ) VALUES (
          v_winner_seat.user_id, v_seat_fee, 'completed', 'auction_won',
          'Açık arttırma modül ücreti - ' || COALESCE(NEW.title, 'Açık Arttırma'),
          NEW.id, NEW.vehicle_id,
          'wallet',
          'auction-' || NEW.id::text || '-module-fee',
          now()
        );
      END IF;
    END IF;

    -- Kaybeden seat_hold'lar: SADECE audit, cüzdana DOKUNMA
    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id AND status = 'holding'
    LOOP
      -- seat_hold: holding -> released
      UPDATE public.auction_seat_holds
      SET status = 'released', released_at = now(), updated_at = now()
      WHERE id = v_loser_seat.id;

      -- Audit: release (balance_after NULL — cüzdana dokunulmadı)
      INSERT INTO public.auction_seat_transactions (
        auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
      ) VALUES (
        NEW.id, v_loser_seat.user_id, v_loser_seat.id,
        v_loser_seat.amount, 'release', NULL,
        jsonb_build_object('reason', 'auction_ended_not_winner')
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger zaten mevcut (auctions tablosunda), tekrar oluştur
DROP TRIGGER IF EXISTS trg_auction_ended_seat_settle ON public.auctions;
CREATE TRIGGER trg_auction_ended_seat_settle
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();
