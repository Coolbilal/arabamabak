-- ============================================
-- Migration 79: wallet_balance_update trigger (seçici)
-- arabamabak - sadece gerçek para hareketlerinde cüzdana yansıt
-- ============================================
-- YENİ MANTIK:
--   Para GİRİŞİ (+): deposit, refund (cüzdana para geliyor)
--   Para ÇIKIŞİ (-): withdraw, payment, auction_payment, premium_payment,
--                   expertise_payment, auction_won (modül ücreti KALICI)
--   DOKUNMA: auction_seat_hold, auction_seat_release, auction_refund
--             (Bunlar sadece AUDIT, cüzdana etki etmemeli.
--              Bloke iptal zaten masada iken gerçekleşti.)
--
-- NOT: Mevcut cüzdan bakiyelerine DOKUNULMAZ. Sadece gelecekteki
-- davranış düzeltilir.
-- ============================================

CREATE OR REPLACE FUNCTION public.wallet_balance_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance NUMERIC(12,2);
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    -- Para GİRİŞİ: cüzdana para geliyor (kalıcı)
    IF NEW.type IN ('deposit', 'refund') THEN
      UPDATE public.profiles
        SET wallet_balance = wallet_balance + NEW.amount
        WHERE id = NEW.user_id;

    -- Para ÇIKIŞI: cüzdandan para gidiyor (kalıcı)
    ELSIF NEW.type IN (
      'withdraw', 'payment',
      'auction_payment', 'premium_payment', 'expertise_payment',
      'auction_won'
    ) THEN
      UPDATE public.profiles
        SET wallet_balance = wallet_balance - NEW.amount
        WHERE id = NEW.user_id;

    -- Diğer tipler: dokunma
    --   auction_seat_hold   -> masaya oturma (sadece audit)
    --   auction_seat_release -> masadan ayrılma (sadece audit)
    --   auction_refund      -> bloke iptal (sadece audit)
    --   corporate_listing_fee -> henüz bağlı değil
    --   excess_listing_fee    -> henüz bağlı değil
    END IF;

    -- balance_after'ı güncel cüzdandan çek
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles
    WHERE id = NEW.user_id;

    NEW.balance_after := COALESCE(v_new_balance, 0);
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger zaten mevcut (migration 19 veya 75), tekrar oluşturmaya gerek yok
-- ama güvende olmak için:
DROP TRIGGER IF EXISTS trg_wallet_balance_update ON public.transactions;
CREATE TRIGGER trg_wallet_balance_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.wallet_balance_update();
