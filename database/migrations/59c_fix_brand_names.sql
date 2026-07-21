-- Once durumu goregorelim
SELECT id, name FROM public.vehicle_brands WHERE name LIKE 'Audi%' OR name LIKE 'Citroen%' ORDER BY name;

-- Audi zaten varsa, Audi SUV'yi sil
DELETE FROM public.vehicle_brands WHERE name = 'Audi SUV';

-- Citroen zaten varsa, Citroen Van'i sil
DELETE FROM public.vehicle_brands WHERE name = 'Citroen Van';

-- Sonuc kontrol
SELECT id, name FROM public.vehicle_brands WHERE name LIKE 'Audi%' OR name LIKE 'Citroen%' ORDER BY name;
