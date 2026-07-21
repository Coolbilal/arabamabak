-- ============================================
-- Migration 61: Mevcut Markaları Kategorilere Yükle
-- ============================================
-- 80 mevcut markayı akıllıca 5 kategoriye yükle
-- Bir marka birden fazla kategoride olabilir (multi-category)

DO $$
DECLARE
  cat_otomobil UUID;
  cat_suv UUID;
  cat_minivan UUID;
  cat_ticari UUID;
  cat_moto UUID;
  b_id UUID;
BEGIN
  -- Kategori ID'lerini al
  SELECT id INTO cat_otomobil FROM vehicle_categories WHERE slug = 'otomobil';
  SELECT id INTO cat_suv FROM vehicle_categories WHERE slug = 'arazi-suv-pikup';
  SELECT id INTO cat_minivan FROM vehicle_categories WHERE slug = 'minivan-panelvan';
  SELECT id INTO cat_ticari FROM vehicle_categories WHERE slug = 'ticari';
  SELECT id INTO cat_moto FROM vehicle_categories WHERE slug = 'motosiklet-utv-atv';

  -- OTOMOBİL kategorisi
  FOREACH b_id IN ARRAY ARRAY[
    'c91ba273-b24c-485f-b1e0-0b0958ef4e0b'::uuid, -- Audi
    'a2f1f168-d4fc-428a-97d8-dc52b6a2c1d2'::uuid, -- BMW (yeni id'ler)
  ] LOOP
    -- Bu döngü placeholder, asıl INSERT aşağıda
  END LOOP;

  -- Audi → Otomobil + Arazi-SUV
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Audi'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Audi'
  ON CONFLICT DO NOTHING;

  -- BMW → Otomobil + Arazi-SUV + Motosiklet
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'BMW'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'BMW'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_moto FROM vehicle_brands b WHERE b.name = 'BMW'
  ON CONFLICT DO NOTHING;

  -- Mercedes-Benz → Otomobil + Arazi-SUV + Minivan + Ticari
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Mercedes-Benz'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Mercedes-Benz'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Mercedes-Benz'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_ticari FROM vehicle_brands b WHERE b.name = 'Mercedes-Benz'
  ON CONFLICT DO NOTHING;

  -- Volkswagen → Otomobil + Arazi-SUV + Minivan + Ticari
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Volkswagen'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Volkswagen'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Volkswagen'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_ticari FROM vehicle_brands b WHERE b.name = 'Volkswagen'
  ON CONFLICT DO NOTHING;

  -- Ford → Otomobil + Arazi-SUV + Minivan + Ticari
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Ford'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Ford'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Ford'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_ticari FROM vehicle_brands b WHERE b.name = 'Ford'
  ON CONFLICT DO NOTHING;

  -- Toyota → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Toyota'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Toyota'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Toyota'
  ON CONFLICT DO NOTHING;

  -- Honda → Otomobil + Arazi-SUV + Motosiklet
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Honda'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Honda'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_moto FROM vehicle_brands b WHERE b.name = 'Honda'
  ON CONFLICT DO NOTHING;

  -- Hyundai → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Hyundai'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Hyundai'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Hyundai'
  ON CONFLICT DO NOTHING;

  -- Renault → Otomobil + Arazi-SUV + Minivan + Ticari
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Renault'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Renault'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Renault'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_ticari FROM vehicle_brands b WHERE b.name = 'Renault'
  ON CONFLICT DO NOTHING;

  -- Fiat → Otomobil + Minivan + Ticari
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Fiat'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Fiat'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_ticari FROM vehicle_brands b WHERE b.name = 'Fiat'
  ON CONFLICT DO NOTHING;

  -- Peugeot → Otomobil + Arazi-SUV + Minivan + Motosiklet
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Peugeot'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Peugeot'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Peugeot'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_moto FROM vehicle_brands b WHERE b.name = 'Peugeot'
  ON CONFLICT DO NOTHING;

  -- Citroen → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Citroen'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Citroen'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Citroen'
  ON CONFLICT DO NOTHING;

  -- Dacia → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Dacia'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Dacia'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Dacia'
  ON CONFLICT DO NOTHING;

  -- Opel → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Opel'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Opel'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Opel'
  ON CONFLICT DO NOTHING;

  -- Nissan → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Nissan'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Nissan'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Nissan'
  ON CONFLICT DO NOTHING;

  -- Skoda → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Skoda'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Skoda'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Skoda'
  ON CONFLICT DO NOTHING;

  -- Seat → Otomobil + Arazi-SUV + Minivan
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Seat'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Seat'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_minivan FROM vehicle_brands b WHERE b.name = 'Seat'
  ON CONFLICT DO NOTHING;

  -- Suzuki → Otomobil + Arazi-SUV + Motosiklet
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Suzuki'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Suzuki'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_moto FROM vehicle_brands b WHERE b.name = 'Suzuki'
  ON CONFLICT DO NOTHING;

  -- Subaru → Otomobil + Arazi-SUV
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Subaru'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Subaru'
  ON CONFLICT DO NOTHING;

  -- Mazda → Otomobil + Arazi-SUV
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Mazda'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Mazda'
  ON CONFLICT DO NOTHING;

  -- Mitsubishi → Otomobil + Arazi-SUV
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'Mitsubishi'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'Mitsubishi'
  ON CONFLICT DO NOTHING;

  -- SsangYong → Otomobil + Arazi-SUV
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b WHERE b.name = 'SsangYong'
  ON CONFLICT DO NOTHING;
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b WHERE b.name = 'SsangYong'
  ON CONFLICT DO NOTHING;

  -- Diğer sadece otomobil markalar
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_otomobil FROM vehicle_brands b
  WHERE b.name IN ('Alfa Romeo', 'Chevrolet', 'Chrysler', 'Cupra', 'DS Automobiles', 'Infiniti', 'Jaguar', 'Jeep', 'Kia', 'Lada', 'Land Rover', 'Lexus', 'Maserati', 'MG', 'Mini', 'Porsche', 'Rover', 'Smart', 'Tesla', 'Tofaş', 'Volvo', 'BYD', 'Daewoo', 'Daihatsu', 'Mahindra', 'Isuzu', 'Iveco')
  ON CONFLICT DO NOTHING;

  -- Sadece SUV yapan markalar
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_suv FROM vehicle_brands b
  WHERE b.name IN ('Jeep', 'Land Rover', 'Porsche', 'Lexus', 'Maserati', 'MG', 'Volvo', 'Kia', 'Cupra', 'DS Automobiles', 'Mahindra', 'Infiniti', 'Isuzu')
  ON CONFLICT DO NOTHING;

  -- Ticari araç markaları
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_ticari FROM vehicle_brands b
  WHERE b.name IN ('BMC', 'DAF', 'Fuso', 'Iveco', 'MAN', 'Otokar', 'Scania', 'Isuzu', 'Tofaş')
  ON CONFLICT DO NOTHING;

  -- Motosiklet markaları
  INSERT INTO brand_categories (brand_id, category_id)
  SELECT b.id, cat_moto FROM vehicle_brands b
  WHERE b.name IN ('Aprilia', 'Arctic Cat', 'Benelli', 'Can-Am', 'Ducati', 'Harley-Davidson', 'Husqvarna', 'Indian', 'Kawasaki', 'KTM', 'Kymco', 'Moto Guzzi', 'MV Agusta', 'Piaggio', 'Polaris', 'Royal Enfield', 'SYM', 'Triumph', 'Vespa', 'Yamaha')
  ON CONFLICT DO NOTHING;
END $$;
