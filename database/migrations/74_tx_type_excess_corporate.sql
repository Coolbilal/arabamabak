-- ============================================
-- Migration 74: tx_type enum'a ücretsiz ilan gelirleri ekle
-- arabamabak - ciro hesabına 2 yeni gelir tipi
-- ============================================
-- corporate_listing_fee: Kurumsal/Galeri ücretsiz ilan gelirleri
-- excess_listing_fee:   Bireysel yıllık kota aşımı gelirleri (örn. 3 ücretsiz hak sonrası)
-- ============================================

-- NOT: PostgreSQL ALTER TYPE ... ADD VALUE aynı transaction içinde kullanılamaz
-- Her ADD VALUE ayrı statement olarak çalışmalı
-- IF NOT EXISTS sayesinde tekrar çalıştırma güvenli

ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'corporate_listing_fee';
ALTER TYPE public.tx_type ADD VALUE IF NOT EXISTS 'excess_listing_fee';
