-- Sadece ALT marka isimlerini sil
-- (ana marka isimleri listede yok, sadece "Ana Marka + SUV/Van/Truck/Electric/Motorrad/i" gibi varyasyonlar silinir)

WITH silinecek AS (
  SELECT name FROM public.vehicle_brands
  WHERE name LIKE '% SUV'
     OR name LIKE '% Van'
     OR name LIKE '% Truck'
     OR name LIKE '% Electric'
     OR name LIKE '% Motorrad'
     OR name = 'BMW i'
     OR name = 'Volkswagen ID'
     OR name = 'Mercedes EQ'
     OR name = 'Dacia Spring'
     OR name = 'Nissan Leaf'
     OR name = 'Fiat 500e'
     OR name = 'Mini Electric'
)
DELETE FROM public.vehicle_brands WHERE name IN (SELECT name FROM silinecek);

-- Kalan markalari goster
SELECT name, is_active FROM public.vehicle_brands ORDER BY name;
