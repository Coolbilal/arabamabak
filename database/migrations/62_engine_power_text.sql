-- ============================================
-- Migration 62: vehicle_engine_powers.hp TEXT
-- ============================================
-- Eski INTEGER (örn. 184) yeterli degil
-- Text olsun ki "184 HP", "2.0 TDI", "320d" gibi motor kodlari da girilebilsin

-- Kolonu TEXT'e cevir (INTEGER -> TEXT)
ALTER TABLE public.vehicle_engine_powers
  ALTER COLUMN hp TYPE TEXT USING hp::TEXT;

-- Mevcut veriler "184 HP" formatinda gosterilsin (sadece sayiysa)
-- (Otomatik guncelleme YAPMA, sadece tip degistir)
