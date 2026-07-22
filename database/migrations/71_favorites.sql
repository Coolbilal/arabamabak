-- ============================================
-- Migration 71: favorites tablosu zaten var, view ve RLS kontrol
-- ============================================
-- Mevcut favorites tablosu korunur
-- Yeni: vehicle_favorite_counts view (favori sayısı için)
-- Yeni: notify_auction_start, notify_price_drop kolonları (opsiyonel bildirim tercihleri)

-- 1) Mevcut favorites tablosuna bildirim tercih kolonları ekle
ALTER TABLE public.favorites
  ADD COLUMN IF NOT EXISTS notify_auction_start BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notify_price_drop BOOLEAN DEFAULT true;

-- 2) View: Her vehicle için favori sayısı
CREATE OR REPLACE VIEW public.vehicle_favorite_counts AS
SELECT vehicle_id, COUNT(*)::int AS favorite_count
FROM public.favorites
WHERE vehicle_id IS NOT NULL
GROUP BY vehicle_id;

-- 3) View: Her auction için favori sayısı (auction_id kolonu varsa)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'favorites' AND column_name = 'auction_id'
  ) THEN
    EXECUTE 'CREATE OR REPLACE VIEW public.auction_favorite_counts AS
      SELECT auction_id, COUNT(*)::int AS favorite_count
      FROM public.favorites
      WHERE auction_id IS NOT NULL
      GROUP BY auction_id';
  END IF;
END $$;

-- 4) RLS kontrol: Kullanıcı sadece kendi favorilerini görebilir/CRUD yapabilir
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS favorites_select_own ON public.favorites;
CREATE POLICY favorites_select_own ON public.favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS favorites_insert_own ON public.favorites;
CREATE POLICY favorites_insert_own ON public.favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS favorites_update_own ON public.favorites;
CREATE POLICY favorites_update_own ON public.favorites
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS favorites_delete_own ON public.favorites;
CREATE POLICY favorites_delete_own ON public.favorites
  FOR DELETE USING (auth.uid() = user_id);

-- 5) Grants
GRANT SELECT ON public.vehicle_favorite_counts TO anon, authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'auction_favorite_counts') THEN
    EXECUTE 'GRANT SELECT ON public.auction_favorite_counts TO anon, authenticated';
  END IF;
END $$;
