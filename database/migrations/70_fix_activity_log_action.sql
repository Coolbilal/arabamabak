-- ============================================
-- Migration 70: admin_activity_logs.action nullable yap
-- ============================================
-- Mevcut log_admin_action trigger fonksiyonu 'action' kolonunu set etmiyor,
-- metadata içine yazıyor. Constraint hatası veriyor.
-- Çözüm: action kolonunu nullable yap (bilgi metadata'da zaten var)

ALTER TABLE public.admin_activity_logs
  ALTER COLUMN action DROP NOT NULL;
