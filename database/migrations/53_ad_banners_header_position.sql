-- =====================================================
-- Migration 53: ad_banners header_top pozisyonu
-- =====================================================
-- display_position text kolonu zaten var (Migration 48)
-- Yeni değer: 'header_top' (Header üstünde, ortalı banner)
-- Mevcut değerler: 'hero_inline' (Slider arası)
-- Bu migration sadece yorum amaçlı — text kolonu herhangi bir değer kabul eder.
-- İleride CHECK constraint eklemek gerekirse buraya eklenebilir.

-- Örnek kullanım:
-- INSERT INTO public.ad_banners (title, image_url, link_url, display_position, is_active)
-- VALUES ('Yeni Kampanya', 'https://...', 'https://...', 'header_top', true);

-- Mevcut index zaten display_position içeriyor, yeni index gerekmez.
-- =====================================================

-- Yorum: Bu migration bilinçli olarak boş bırakıldı.
-- display_position text kolonu esnek, yeni değerler ek constraint olmadan kabul edilir.
-- Eğer ileride sadece belirli değerlere izin vermek isterseniz:
-- ALTER TABLE public.ad_banners
--   ADD CONSTRAINT ad_banners_position_check
--   CHECK (display_position IN ('hero_inline', 'header_top', 'between_slides'));
