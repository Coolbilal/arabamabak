-- ============================================
-- Migration 87: bids tablosu RLS policy düzeltme
-- arabamabak - tüm teklifler görünür olsun
-- ============================================
-- SORUN: bids_self_read policy auction status filtreliyordu.
-- Sona ermiş auction'larda sadece kendi tekliflerini
-- görebiliyordu, diğer teklifler görünmüyordu.
--
-- ÇÖZÜM: Policy'i basitleştir. Tüm authenticated
-- user'lar tüm teklifleri görebilir.
-- ============================================

-- Eski policy'yi sil
DROP POLICY IF EXISTS bids_self_read ON public.bids;

-- Yeni policy: tüm authenticated user'lar tüm teklifleri görebilir
CREATE POLICY bids_all_read ON public.bids
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
