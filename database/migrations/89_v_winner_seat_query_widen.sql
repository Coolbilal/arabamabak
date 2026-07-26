-- ============================================================
-- Migration 89: v_winner_seat sorgusunu genişlet
-- ============================================================
-- TARİH: 2026-07-27
-- NEDEN: Aylin'in seat_hold.status='holding' DEĞİLDİ, bu yüzden
--   v_winner_seat NULL dönüyordu, kazanan kısmı atlanıyordu,
--   modül kesimi yapılmıyordu. Sorguyu 'won' status'ünü de
--   kapsayacak şekilde genişletiyoruz.
--
-- DEĞİŞİKLİK: status='holding' → status IN ('holding', 'won')
--   (Yalnızca 1 satır, fonksiyonun geri kalanı birebir aynı)
--
-- ADIM 2: Aylin'in seat_hold neden 'released' yapıldı? (kök neden)
--   Bu migration kök nedeni çözmüyor, sadece modül kesimini
--   düzeltiyor. Kök neden ayrıca araştırılacak.
-- ============================================================

-- Mevcut fonksiyonu gör (güvende olmak için)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'fn_auction_ended_seat_settle') THEN
    RAISE EXCEPTION 'fn_auction_ended_seat_settle fonksiyonu bulunamadı - migration 86 çalıştırılmamış olabilir';
  END IF;
  RAISE NOTICE 'fn_auction_ended_seat_settle bulundu, güncelleniyor...';
END $$;

-- ============================================================
-- Fonksiyonu yeniden oluştur (sadece 1 satır değişti)
-- ============================================================
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

      -- ★ DEĞİŞİKLİK: status='holding' → status IN ('holding', 'won')
      -- (Aylin'in seat_hold.status='won' olsa bile bulunabilsin)
      SELECT * INTO v_winner_seat
      FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND user_id = v_winning_bid.bidder_id
        AND status IN ('holding', 'won')
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- KAZANAN: -500 modül ücreti (KALICI), tip: auction_won (KALIR)
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

    -- KAYBEDENLER: sadece 'holding' olanları 'released' yap
    -- (Aylin'in seat_hold zaten 'won' olmuşsa LOOP'a girmez)
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
      VALUES (v_loser_seat.user_id, v_seat_fee, v_loser_new_balance, 'completed', 'auction_seat_release', 'Açık arttırma sona erdi - bloke iade', NEW.id, 'wallet', 'seat-auction-end-' || v_loser_seat.id::text, now(), now());

      INSERT INTO public.auction_seat_transactions (auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata)
      VALUES (NEW.id, v_loser_seat.user_id, v_loser_seat.id, v_seat_fee, 'release', v_loser_new_balance, jsonb_build_object('reason', 'auction_ended_not_winner'));
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Tetikleyici güvende olmak için
DROP TRIGGER IF EXISTS trg_auction_ended_seat_settle ON public.auctions;
CREATE TRIGGER trg_auction_ended_seat_settle
  AFTER UPDATE OF status ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 89 tamamlandı: v_winner_seat sorgusu genişletildi (status IN holding/won)';
  RAISE NOTICE '⚠️  Adım 2 (kök neden) henüz yapılmadı - ayrıca araştırılacak';
END $$;
