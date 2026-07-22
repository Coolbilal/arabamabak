-- ============================================
-- Migration 73: Auction ended - gerçek cüzdan kesimi
-- ============================================
-- Mevcut fn_auction_ended_seat_settle fonksiyonunu günceller:
-- Kazanan cüzdanına transactions tablosuna 'auction_won' tipi
-- Kesim ile gerçek bakiye düşer
-- Mevcut audit (forfeit/release) korunur

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
  v_winner_balance NUMERIC(12,2);
  v_winner_new_balance NUMERIC(12,2);
  v_seat_fee NUMERIC(12,2);
BEGIN
  IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status <> 'ended') THEN
    -- 1) Kazanan teklif (en yüksek miktar)
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE auction_id = NEW.id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    -- 2) seat_hold_fee al
    SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500)
    INTO v_seat_fee
    FROM public.site_settings
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1;
    IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

    IF v_winning_bid IS NOT NULL THEN
      NEW.winner_id := v_winning_bid.bidder_id;

      -- 3) Kazanan seat_hold bul
      SELECT * INTO v_winner_seat
      FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND user_id = v_winning_bid.bidder_id
        AND status = 'holding'
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- Kazanan mevcut cüzdan bakiyesi
        SELECT balance_after INTO v_winner_balance
        FROM public.transactions
        WHERE user_id = v_winner_seat.user_id
          AND status = 'completed' AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1;

        v_winner_balance := COALESCE(v_winner_balance, 0);
        v_winner_new_balance := v_winner_balance - v_seat_fee;

        -- seat_hold: holding -> won
        UPDATE public.auction_seat_holds
        SET status = 'won', released_at = now(), updated_at = now()
        WHERE id = v_winner_seat.id;

        -- audit: forfeit (bloke düştü)
        INSERT INTO public.auction_seat_transactions (
          auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
        ) VALUES (
          NEW.id, v_winner_seat.user_id, v_winner_seat.id,
          v_winner_seat.amount, 'forfeit', v_winner_balance,
          jsonb_build_object('reason', 'auction_won', 'auction_id', NEW.id)
        );

        -- *** GERÇEK CÜZDAN KESİMİ ***
        -- transactions tablosuna 'auction_won' tipi, balance_after düşer
        INSERT INTO public.transactions (
          user_id, amount, balance_after, status, type,
          description, related_auction_id, related_vehicle_id,
          payment_method, reference_id, completed_at
        ) VALUES (
          v_winner_seat.user_id, v_seat_fee, v_winner_new_balance, 'completed', 'auction_won',
          'Açık arttırma modül ücreti - ' || NEW.title,
          NEW.id, NEW.vehicle_id,
          'wallet',
          'auction-' || NEW.id::text || '-module-fee',
          now()
        );
      END IF;
    END IF;

    -- 4) Kaybeden seat_hold'lar (holding kalanlar)
    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id AND status = 'holding'
    LOOP
      UPDATE public.auction_seat_holds
      SET status = 'released', released_at = now(), updated_at = now()
      WHERE id = v_loser_seat.id;

      INSERT INTO public.auction_seat_transactions (
        auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
      ) VALUES (
        NEW.id, v_loser_seat.user_id, v_loser_seat.id,
        v_loser_seat.amount, 'release', NULL,
        jsonb_build_object('reason', 'auction_ended_not_winner')
      );

      -- *** KAYBEDEN CÜZDAN İADESİ ***
      -- Bloke çözüldü, geri ödeme (transactions'a 'auction_refund' tipi)
      DECLARE
        v_loser_balance NUMERIC(12,2);
        v_loser_new_balance NUMERIC(12,2);
      BEGIN
        SELECT balance_after INTO v_loser_balance
        FROM public.transactions
        WHERE user_id = v_loser_seat.user_id
          AND status = 'completed' AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1;

        v_loser_balance := COALESCE(v_loser_balance, 0);
        v_loser_new_balance := v_loser_balance + v_loser_seat.amount;

        INSERT INTO public.transactions (
          user_id, amount, balance_after, status, type,
          description, related_auction_id, related_vehicle_id,
          payment_method, reference_id, completed_at
        ) VALUES (
          v_loser_seat.user_id, v_loser_seat.amount, v_loser_new_balance, 'completed', 'auction_refund',
          'Açık arttırma bloke iadesi - ' || NEW.title,
          NEW.id, NEW.vehicle_id,
          'wallet',
          'auction-' || NEW.id::text || '-refund-' || v_loser_seat.id::text,
          now()
        );
      END;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
