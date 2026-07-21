-- Audi SUV ve Citroen Van'i sil (ana marka zaten var)
DELETE FROM public.vehicle_brands WHERE name IN ('Audi SUV', 'Citroen Van');

-- Citroen SUV ve Citroen Electric'i de Citroen'e cevir
-- Ama unique constraint yuzunden once var olan Citroen SUV/Electric'i silelim
DELETE FROM public.vehicle_brands WHERE name IN ('Citroen SUV', 'Citroen Electric');

-- Son durum
SELECT id, name FROM public.vehicle_brands WHERE name LIKE 'Audi%' OR name LIKE 'Citroen%' ORDER BY name;
