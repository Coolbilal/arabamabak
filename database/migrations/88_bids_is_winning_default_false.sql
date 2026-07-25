-- ============================================
-- Migration 88: bids.is_winning default false + mevcut veri düzeltme
-- arabamabak - her auction için sadece 1 winning bid
-- ============================================
-- SORUN: bids.is_winning default true. place_bid RPC
-- çağrılmadığında (frontend direkt INSERT) tüm teklifler
-- is_winning=true kalıyordu.
--
-- ÇÖZÜM:
--   1) Default false yap
--   2) Mevcut kirli verileri düzelt (her auction için
--      sadece en yüksek teklif is_winning=true)
-- ============================================

-- 1) Default false yap
ALTER TABLE public.bids ALTER COLUMN is_winning SET DEFAULT false;

-- 2) Mevcut kirli verileri düzelt
-- Her auction için en yüksek teklif (en yeni ilk) is_winning=true
UPDATE public.bids
SET is_winning = true
WHERE id IN (
  SELECT DISTINCT ON (auction_id) id
  FROM public.bids
  ORDER BY auction_id, amount DESC, created_at ASC
);

-- Diğer tüm teklifler is_winning=false (güvende olmak için)
UPDATE public.bids
SET is_winning = false
WHERE id NOT IN (
  SELECT DISTINCT ON (auction_id) id
  FROM public.bids
  ORDER BY auction_id, amount DESC, created_at ASC
)
  AND is_winning = true;
