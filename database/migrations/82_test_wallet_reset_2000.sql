-- ============================================
-- Migration 82: Tüm kullanıcılara 2000 TL test bakiyesi
-- arabamabak - sadece profiles.wallet_balance güncellenir
-- ============================================
-- NOT: Bu sadece TEST amaçlıdır. Mevcut transactions tablosu
-- dokunulmaz, sadece profiles.wallet_balance 2000 yapılır.
-- Yeni açık arttırmalarda yeni davranış test edilebilir.
-- ============================================

UPDATE public.profiles SET wallet_balance = 2000;
