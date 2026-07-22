-- ============================================
-- Migration 72: Seat Hold Trigger'ları (sadece EKLEME)
-- ============================================
-- Masaya oturma + cüzdandan bloke + süre bittiğinde kesim
-- Mevcut trigger'lara ve tablolara dokunmaz

-- 1) bids tablosuna yeni teklif gelince:
--    - Eğer teklif veren masada değilse otomatik masaya otur (bloke et)
--    - Eğer önceki en yüksek teklif veren bu kullanıcı değilse, yeni teklif verenin
--      eski en yüksek teklif vereni geçtiğini güncelle

CREATE OR REPLACE FUNCTION public.fn_bid_after_insert_seat()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seat_fee NUMERIC(12,2);
  v_existing_hold_id UUID;
  v_user_balance NUMERIC(12,2);
BEGIN
  -- 1) site_settings'ten seat_hold_fee al (her auction için auction_seat_hold_fee de olabilir)
  SELECT COALESCE(auction_seat_hold_fee, seat_hold_fee, 500)
  INTO v_seat_fee
  FROM public.site_settings
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1;

  IF v_seat_fee IS NULL THEN v_seat_fee := 500; END IF;

  -- 2) Kullanıcının cüzdan bakiyesi (transactions.balance_after'dan son)
  SELECT balance_after
  INTO v_user_balance
  FROM public.transactions
  WHERE user_id = NEW.bidder_id
    AND status = 'completed'
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1;

  -- Eğer hiç transaction yoksa veya bakiye 0 ise, bloke yapma
  IF v_user_balance IS NULL OR v_user_balance < v_seat_fee THEN
    -- Bloke yetersiz, sadece bid'i ekle (masaya oturmaz)
    -- İleride: burada hata fırlatılabilir veya uyarı gösterilebilir
    RETURN NEW;
  END IF;

  -- 3) Mevcut seat_hold var mı kontrol et
  SELECT id INTO v_existing_hold_id
  FROM public.auction_seat_holds
  WHERE auction_id = NEW.auction_id AND user_id = NEW.bidder_id;

  IF v_existing_hold_id IS NULL THEN
    -- Yeni seat_hold oluştur (masaya otur)
    INSERT INTO public.auction_seat_holds (
      auction_id, user_id, bid_id, amount, status, seat_number
    ) VALUES (
      NEW.auction_id, NEW.bidder_id, NEW.id, v_seat_fee, 'holding',
      (SELECT COALESCE(MAX(seat_number), 0) + 1 FROM public.auction_seat_holds
        WHERE auction_id = NEW.auction_id)
    );

    -- auction_seat_transactions audit (hold)
    INSERT INTO public.auction_seat_transactions (
      auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
    ) VALUES (
      NEW.auction_id, NEW.bidder_id,
      (SELECT id FROM public.auction_seat_holds
        WHERE auction_id = NEW.auction_id AND user_id = NEW.bidder_id),
      v_seat_fee, 'hold', v_user_balance - v_seat_fee,
      jsonb_build_object('bid_id', NEW.id, 'auto', true)
    );
  ELSE
    -- Mevcut seat_hold'u güncelle (yeni teklif bağla)
    UPDATE public.auction_seat_holds
    SET bid_id = NEW.id, updated_at = now()
    WHERE id = v_existing_hold_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bid_seat_hold ON public.bids;
CREATE TRIGGER trg_bid_seat_hold
  AFTER INSERT ON public.bids
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_bid_after_insert_seat();

-- 2) auctions.status = 'ended' olduğunda:
--    - Kazanan belirleme (en yüksek teklif)
--    - Kazanan seat_hold: holding -> won + cüzdandan kesim
--    - Kaybeden seat_hold: holding -> released (bloke çöz)
--    - auctions.winner_id güncelle

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
BEGIN
  -- Sadece status 'ended' olunca çalış
  IF NEW.status = 'ended' AND (OLD.status IS NULL OR OLD.status <> 'ended') THEN
    -- 1) Kazanan teklif (en yüksek miktar)
    SELECT * INTO v_winning_bid
    FROM public.bids
    WHERE auction_id = NEW.id
    ORDER BY amount DESC, created_at ASC
    LIMIT 1;

    IF v_winning_bid IS NOT NULL THEN
      -- auctions.winner_id güncelle
      NEW.winner_id := v_winning_bid.bidder_id;

      -- 2) Kazanan seat_hold bul
      SELECT * INTO v_winner_seat
      FROM public.auction_seat_holds
      WHERE auction_id = NEW.id
        AND user_id = v_winning_bid.bidder_id
        AND status = 'holding'
      LIMIT 1;

      IF v_winner_seat IS NOT NULL THEN
        -- Kazanan bakiyesi
        SELECT balance_after INTO v_winner_balance
        FROM public.transactions
        WHERE user_id = v_winning_seat.user_id
          AND status = 'completed' AND deleted_at IS NULL
        ORDER BY created_at DESC LIMIT 1;

        -- seat_hold: holding -> won
        UPDATE public.auction_seat_holds
        SET status = 'won', released_at = now(), updated_at = now()
        WHERE id = v_winner_seat.id;

        -- audit: forfeit (kesildi, iade yok)
        INSERT INTO public.auction_seat_transactions (
          auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
        ) VALUES (
          NEW.id, v_winner_seat.user_id, v_winner_seat.id,
          v_winner_seat.amount, 'forfeit', v_winner_balance,
          jsonb_build_object('reason', 'auction_won', 'auction_id', NEW.id)
        );
      END IF;
    END IF;

    -- 3) Kaybeden seat_hold'lar (holding kalanlar)
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
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auction_ended_seat ON public.auctions;
CREATE TRIGGER trg_auction_ended_seat
  BEFORE UPDATE ON public.auctions
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auction_ended_seat_settle();

-- 3) seat_holds güncelleme: left_at set edilince -> released
CREATE OR REPLACE FUNCTION public.fn_seat_hold_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Eğer left_at set edildiyse ve status hâlâ holding ise
  IF NEW.left_at IS NOT NULL AND NEW.status = 'holding' THEN
    -- Bu kullanıcının en son teklifi kazanan mı kontrol et
    IF NOT EXISTS (
      SELECT 1 FROM public.bids b
      WHERE b.auction_id = NEW.auction_id
        AND b.bidder_id = NEW.user_id
        AND b.amount = (
          SELECT MAX(amount) FROM public.bids
          WHERE auction_id = NEW.auction_id
        )
    ) THEN
      -- Kazanan değilse, blokeyi çöz
      NEW.status := 'released';
      NEW.released_at := now();

      INSERT INTO public.auction_seat_transactions (
        auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
      ) VALUES (
        NEW.auction_id, NEW.user_id, NEW.id, NEW.amount, 'left', NULL,
        jsonb_build_object('reason', 'user_left_seat')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seat_hold_leave ON public.auction_seat_holds;
CREATE TRIGGER trg_seat_hold_leave
  BEFORE UPDATE ON public.auction_seat_holds
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seat_hold_leave();

-- 4) RLS kontrol: seat_holds için mevcut RLS var mı?
-- Eğer RLS açık ama service role çalışmıyorsa, anon ve authenticated SELECT izni
ALTER TABLE public.auction_seat_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_seat_transactions ENABLE ROW LEVEL SECURITY;

-- Kullanıcı kendi seat_hold'unu görebilir
DROP POLICY IF EXISTS seat_holds_select_own ON public.auction_seat_holds;
CREATE POLICY seat_holds_select_own ON public.auction_seat_holds
  FOR SELECT USING (auth.uid() = user_id);

-- Kullanıcı kendi seat_hold'unu güncelleyebilir (ayrıl butonu)
DROP POLICY IF EXISTS seat_holds_update_own ON public.auction_seat_holds;
CREATE POLICY seat_holds_update_own ON public.auction_seat_holds
  FOR UPDATE USING (auth.uid() = user_id);

-- seat_transactions kullanıcı kendi görebilir
DROP POLICY IF EXISTS seat_tx_select_own ON public.auction_seat_transactions;
CREATE POLICY seat_tx_select_own ON public.auction_seat_transactions
  FOR SELECT USING (auth.uid() = user_id);
