-- ============================================
-- Migration 85: RLS bypass for seat_hold functions
-- arabamabak - SECURITY DEFINER + row_security=off
-- ============================================
-- SORUN: fn_seat_hold_join içindeki UPDATE public.profiles
--        RLS tarafından engelleniyor, cüzdana bloke yansımıyor.
--
-- ÇÖZÜM: 3 fonksiyona SET LOCAL row_security = off ekle.
-- Bu, fonksiyon içindeki UPDATE/INSERT'lerde RLS'i bypass eder.
-- ============================================

-- 1) fn_seat_hold_join
CREATE OR REPLACE FUNCTION public.fn_seat_hold_join()
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
  IF NEW.status = 'holding' AND (OLD IS NULL OR OLD.status <> 'holding') THEN
    SELECT COALESCE(wallet_balance, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = NEW.user_id;
    v_new_balance := v_current_balance - NEW.amount;

    UPDATE public.profiles
    SET wallet_balance = v_new_balance
    WHERE id = NEW.user_id;

    INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, payment_method, reference_id, completed_at, created_at)
    VALUES (NEW.user_id, NEW.amount, v_new_balance, 'completed', 'auction_won', 'Masa bloke', NEW.auction_id, 'wallet', 'seat-hold-' || NEW.id::text, now(), now());

    INSERT INTO public.auction_seat_transactions (auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata)
    VALUES (NEW.auction_id, NEW.user_id, NEW.id, NEW.amount, 'hold', v_new_balance, jsonb_build_object('reason', 'seat_join'));
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) fn_seat_hold_leave
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
  IF OLD.status = 'holding' AND NEW.status = 'released' AND NEW.left_at IS NOT NULL THEN
    SELECT COALESCE(wallet_balance, 0) INTO v_current_balance
    FROM public.profiles
    WHERE id = NEW.user_id;
    v_new_balance := v_current_balance + NEW.amount;

    UPDATE public.profiles
    SET wallet_balance = v_new_balance
    WHERE id = NEW.user_id;

    INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, payment_method, reference_id, completed_at, created_at)
    VALUES (NEW.user_id, NEW.amount, v_new_balance, 'completed', 'auction_refund', 'Masadan ayrılma iadesi', NEW.auction_id, 'wallet', 'seat-leave-' || NEW.id::text, now(), now());

    INSERT INTO public.auction_seat_transactions (auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata)
    VALUES (NEW.auction_id, NEW.user_id, NEW.id, NEW.amount, 'release', v_new_balance, jsonb_build_object('reason', 'seat_leave'));
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) fn_auction_ended_seat_settle
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
  v_loser_balance NUMERIC(12,2);
  v_loser_new_balance NUMERIC(12,2);
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
        AND status = 'holding'
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
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

        INSERT INTO public.auction_seat_transactions (auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata)
        VALUES (NEW.id, v_winner_seat.user_id, v_winner_seat.id, v_seat_fee, 'forfeit', v_winner_new_balance, jsonb_build_object('reason', 'auction_won', 'auction_id', NEW.id));

        INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, related_vehicle_id, payment_method, reference_id, completed_at)
        VALUES (v_winner_seat.user_id, v_seat_fee, v_winner_new_balance, 'completed', 'auction_won', 'Açık arttırma modül ücreti - ' || COALESCE(NEW.title, 'Açık Arttırma'), NEW.id, NEW.vehicle_id, 'wallet', 'auction-' || NEW.id::text || '-module-fee', now());
      END IF;
    END IF;

    FOR v_loser_seat IN
      SELECT * FROM public.auction_seat_holds
      WHERE auction_id = NEW.id AND status = 'holding'
    LOOP
      SELECT COALESCE(wallet_balance, 0) INTO v_loser_balance
      FROM public.profiles
      WHERE id = v_loser_seat.user_id;
      v_loser_new_balance := v_loser_balance + v_seat_fee;

      UPDATE public.profiles
      SET wallet_balance = v_loser_new_balance
      WHERE id = v_loser_seat.user_id;

      UPDATE public.auction_seat_holds
      SET status = 'released', released_at = now(), left_at = NULL, updated_at = now()
      WHERE id = v_loser_seat.id;

      INSERT INTO public.transactions (user_id, amount, balance_after, status, type, description, related_auction_id, payment_method, reference_id, completed_at, created_at)
      VALUES (v_loser_seat.user_id, v_seat_fee, v_loser_new_balance, 'completed', 'auction_refund', 'Açık arttırma sona erdi - bloke iade', NEW.id, 'wallet', 'seat-auction-end-' || v_loser_seat.id::text, now(), now());

      INSERT INTO public.auction_seat_transactions (auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata)
      VALUES (NEW.id, v_loser_seat.user_id, v_loser_seat.id, v_seat_fee, 'release', v_loser_new_balance, jsonb_build_object('reason', 'auction_ended_not_winner'));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;
