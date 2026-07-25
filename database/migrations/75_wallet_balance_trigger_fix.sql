-- ============================================
-- Migration 75: wallet_balance_update trigger düzeltme
-- arabamabak - cüzdan bakiyesi ters mantık + syntax hatası
-- ============================================
-- SORUNLAR:
--   1. auction_payment, premium_payment, expertise_payment -> +amount (YANLIŞ, - olmalı)
--   2. auction_won, auction_seat_hold -> trigger'da hiç case YOK
--   3. auction_refund, auction_seat_release -> trigger'da hiç case YOK
--   4. balance_after := new.balance_after (SQL syntax hatası, = olmalı)
--
-- DÜZELTME:
--   Para GİRİŞİ (+): deposit, refund, auction_refund, auction_seat_release
--   Para ÇIKIŞI (-): withdraw, payment, auction_payment, premium_payment,
--                   expertise_payment, auction_won, auction_seat_hold,
--                   corporate_listing_fee, excess_listing_fee
-- ============================================

CREATE OR REPLACE FUNCTION public.wallet_balance_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_balance NUMERIC(12,2);
BEGIN
  -- Sadece status 'pending' -> 'completed' geçişinde cüzdana yansıt
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN

    -- PARA GİRİŞİ: kullanıcıya para geliyor
    IF NEW.type IN ('deposit', 'refund', 'auction_refund', 'auction_seat_release') THEN
      UPDATE public.profiles
        SET wallet_balance = wallet_balance + NEW.amount
        WHERE id = NEW.user_id;

    -- PARA ÇIKIŞI: kullanıcıdan para gidiyor (platform gelirleri)
    ELSIF NEW.type IN (
      'withdraw', 'payment',
      'auction_payment', 'premium_payment', 'expertise_payment',  -- platform gelirleri (kullanıcıdan kesim)
      'auction_won', 'auction_seat_hold',                          -- modül ücreti kesimi / bloke düşme
      'corporate_listing_fee', 'excess_listing_fee'                -- ücretsiz ilan gelirleri (ileride bağlanacak)
    ) THEN
      UPDATE public.profiles
        SET wallet_balance = wallet_balance - NEW.amount
        WHERE id = NEW.user_id;
    END IF;

    -- balance_after'ı güncel cüzdandan çek (syntax hatası düzeltildi)
    SELECT wallet_balance INTO v_new_balance
    FROM public.profiles
    WHERE id = NEW.user_id;

    NEW.balance_after := v_new_balance;
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger zaten mevcut (migration 19), tekrar oluşturmaya gerek yok
-- ama güvende olmak için:
DROP TRIGGER IF EXISTS trg_wallet_balance_update ON public.transactions;
CREATE TRIGGER trg_wallet_balance_update
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.wallet_balance_update();
