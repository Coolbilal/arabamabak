-- ============================================
-- Migration 58: Auction → Vehicle Status Sync
-- ============================================
-- auctions.status='sold' olduğunda vehicles.status='sold' olsun
-- Mevcut 5 sold aracı da güncelle

-- 1. Mevcut sold auction'ların vehicle'larını güncelle
UPDATE vehicles v
SET status = 'sold',
    sold_at = COALESCE(v.sold_at, a.ended_at, now())
FROM auctions a
WHERE a.vehicle_id = v.id
  AND a.status = 'sold'
  AND v.status != 'sold';

-- 2. Trigger: auction status değişince vehicle'ı senkronize et
CREATE OR REPLACE FUNCTION sync_vehicle_status_from_auction()
RETURNS TRIGGER AS $$
BEGIN
  -- auction 'sold' oldu → vehicle 'sold'
  IF NEW.status = 'sold' AND (OLD.status IS NULL OR OLD.status != 'sold') THEN
    UPDATE vehicles
    SET status = 'sold',
        sold_at = COALESCE(sold_at, NEW.ended_at, now())
    WHERE id = NEW.vehicle_id;
  END IF;

  -- auction 'cancelled' oldu → vehicle 'expired' (geri çekildi)
  IF NEW.status = 'cancelled' AND (OLD.status IS NULL OR OLD.status != 'cancelled') THEN
    UPDATE vehicles
    SET status = 'expired'
    WHERE id = NEW.vehicle_id
      AND status NOT IN ('sold', 'rejected'); -- satılmış veya reddedilmişse dokunma
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Eski trigger varsa kaldır
DROP TRIGGER IF EXISTS trg_sync_vehicle_status ON auctions;

-- Yeni trigger
CREATE TRIGGER trg_sync_vehicle_status
AFTER UPDATE OF status ON auctions
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION sync_vehicle_status_from_auction();

-- INSERT için de (nadiren auction direkt sold olarak insert edilebilir)
DROP TRIGGER IF EXISTS trg_sync_vehicle_status_insert ON auctions;
CREATE TRIGGER trg_sync_vehicle_status_insert
AFTER INSERT ON auctions
FOR EACH ROW
WHEN (NEW.status = 'sold')
EXECUTE FUNCTION sync_vehicle_status_from_auction();
