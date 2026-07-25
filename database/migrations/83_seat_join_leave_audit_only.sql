-- ============================================
-- Migration 83: fn_seat_hold_join / fn_seat_hold_leave (audit only)
-- arabamabak - cüzdana DOKUNMAZ, sadece audit
-- ============================================
-- YENİ MANTIK:
--   Masaya oturma (status='holding'): SADECE audit INSERT
--   Masadan ayrılma (status='released'): SADECE audit INSERT
--   profile.wallet_balance'a DOKUNMAZ
--   transactions.balance_after = NULL (cüzdana etki etmedi)
--
-- TETİKLEYİCİLER dokunulmaz:
--   trg_seat_hold_join   -> auction_seat_holds (INSERT/UPDATE)
--   trg_seat_hold_leave  -> auction_seat_holds (UPDATE)
--   trg_auction_ended_seat_settle -> auctions (AFTER UPDATE OF status)
-- ============================================

-- 1) fn_seat_hold_join: sadece audit
CREATE OR REPLACE FUNCTION public.fn_seat_hold_join()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF NEW.status = 'holding' AND (OLD IS NULL OR OLD.status <> 'holding') THEN
    INSERT INTO public.auction_seat_transactions (
      auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
    ) VALUES (
      NEW.auction_id, NEW.user_id, NEW.id, NEW.amount, 'hold', NULL,
      jsonb_build_object('reason', 'seat_join', 'note', 'cuzdana_dokunulmaz')
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) fn_seat_hold_leave: sadece audit
CREATE OR REPLACE FUNCTION public.fn_seat_hold_leave()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  IF OLD.status = 'holding' AND NEW.status = 'released' THEN
    INSERT INTO public.auction_seat_transactions (
      auction_id, user_id, seat_hold_id, amount, transaction_type, balance_after, metadata
    ) VALUES (
      NEW.auction_id, NEW.user_id, NEW.id, NEW.amount, 'release', NULL,
      jsonb_build_object('reason', 'seat_leave', 'note', 'cuzdana_dokunulmaz')
    );
  END IF;
  RETURN NEW;
END;
$function$;
