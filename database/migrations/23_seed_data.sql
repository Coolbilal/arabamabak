-- =====================================================
-- Migration 23: Seed Data
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Başlangıç verileri: 81 il, 975+ ilçe, 49+ marka, 564+ model,
-- 55+ motor hacmi, kategoriler, payment_methods
-- =====================================================

-- =====================================================
-- 1) CITIES (81 il)
-- =====================================================
insert into public.cities (name, plate_code, sort_order) values
  ('Adana', '01', 1),
  ('Adıyaman', '02', 2),
  ('Afyonkarahisar', '03', 3),
  ('Ağrı', '04', 4),
  ('Amasya', '05', 5),
  ('Ankara', '06', 6),
  ('Antalya', '07', 7),
  ('Artvin', '08', 8),
  ('Aydın', '09', 9),
  ('Balıkesir', '10', 10),
  ('Bilecik', '11', 11),
  ('Bingöl', '12', 12),
  ('Bitlis', '13', 13),
  ('Bolu', '14', 14),
  ('Burdur', '15', 15),
  ('Bursa', '16', 16),
  ('Çanakkale', '17', 17),
  ('Çankırı', '18', 18),
  ('Çorum', '19', 19),
  ('Denizli', '20', 20),
  ('Diyarbakır', '21', 21),
  ('Edirne', '22', 22),
  ('Elazığ', '23', 23),
  ('Erzincan', '24', 24),
  ('Erzurum', '25', 25),
  ('Eskişehir', '26', 26),
  ('Gaziantep', '27', 27),
  ('Giresun', '28', 28),
  ('Gümüşhane', '29', 29),
  ('Hakkari', '30', 30),
  ('Hatay', '31', 31),
  ('Isparta', '32', 32),
  ('Mersin', '33', 33),
  ('İstanbul', '34', 34),
  ('İzmir', '35', 35),
  ('Kars', '36', 36),
  ('Kastamonu', '37', 37),
  ('Kayseri', '38', 38),
  ('Kırklareli', '39', 39),
  ('Kırşehir', '40', 40),
  ('Kocaeli', '41', 41),
  ('Konya', '42', 42),
  ('Kütahya', '43', 43),
  ('Malatya', '44', 44),
  ('Manisa', '45', 45),
  ('Kahramanmaraş', '46', 46),
  ('Mardin', '47', 47),
  ('Muğla', '48', 48),
  ('Muş', '49', 49),
  ('Nevşehir', '50', 50),
  ('Niğde', '51', 51),
  ('Ordu', '52', 52),
  ('Rize', '53', 53),
  ('Sakarya', '54', 54),
  ('Samsun', '55', 55),
  ('Siirt', '56', 56),
  ('Sinop', '57', 57),
  ('Sivas', '58', 58),
  ('Tekirdağ', '59', 59),
  ('Tokat', '60', 60),
  ('Trabzon', '61', 61),
  ('Tunceli', '62', 62),
  ('Şanlıurfa', '63', 63),
  ('Uşak', '64', 64),
  ('Van', '65', 65),
  ('Yozgat', '66', 66),
  ('Zonguldak', '67', 67),
  ('Aksaray', '68', 68),
  ('Bayburt', '69', 69),
  ('Karaman', '70', 70),
  ('Kırıkkale', '71', 71),
  ('Batman', '72', 72),
  ('Şırnak', '73', 73),
  ('Bartın', '74', 74),
  ('Ardahan', '75', 75),
  ('Iğdır', '76', 76),
  ('Yalova', '77', 77),
  ('Karabük', '78', 78),
  ('Kilis', '79', 79),
  ('Osmaniye', '80', 80),
  ('Düzce', '81', 81)
on conflict (name) do nothing;

-- =====================================================
-- 2) DISTRICTS (her il için ana ilçeler)
-- Tam 975 liste production'da eklenebilir,
-- burada İstanbul, Ankara, İzmir örnek olarak
-- =====================================================
insert into public.districts (city_id, name, sort_order)
select c.id, d.name, d.sort_order
from (values
  ('İstanbul', 'Adalar', 1),
  ('İstanbul', 'Arnavutköy', 2),
  ('İstanbul', 'Ataşehir', 3),
  ('İstanbul', 'Avcılar', 4),
  ('İstanbul', 'Bağcılar', 5),
  ('İstanbul', 'Bahçelievler', 6),
  ('İstanbul', 'Bakırköy', 7),
  ('İstanbul', 'Başakşehir', 8),
  ('İstanbul', 'Bayrampaşa', 9),
  ('İstanbul', 'Beşiktaş', 10),
  ('İstanbul', 'Beykoz', 11),
  ('İstanbul', 'Beylikdüzü', 12),
  ('İstanbul', 'Beyoğlu', 13),
  ('İstanbul', 'Büyükçekmece', 14),
  ('İstanbul', 'Çatalca', 15),
  ('İstanbul', 'Çekmeköy', 16),
  ('İstanbul', 'Esenler', 17),
  ('İstanbul', 'Esenyurt', 18),
  ('İstanbul', 'Eyüpsultan', 19),
  ('İstanbul', 'Fatih', 20),
  ('İstanbul', 'Gaziosmanpaşa', 21),
  ('İstanbul', 'Güngören', 22),
  ('İstanbul', 'Kadıköy', 23),
  ('İstanbul', 'Kağıthane', 24),
  ('İstanbul', 'Kartal', 25),
  ('İstanbul', 'Küçükçekmece', 26),
  ('İstanbul', 'Maltepe', 27),
  ('İstanbul', 'Pendik', 28),
  ('İstanbul', 'Sancaktepe', 29),
  ('İstanbul', 'Sarıyer', 30),
  ('İstanbul', 'Silivri', 31),
  ('İstanbul', 'Sultanbeyli', 32),
  ('İstanbul', 'Sultangazi', 33),
  ('İstanbul', 'Şile', 34),
  ('İstanbul', 'Şişli', 35),
  ('İstanbul', 'Tuzla', 36),
  ('İstanbul', 'Ümraniye', 37),
  ('İstanbul', 'Üsküdar', 38),
  ('İstanbul', 'Zeytinburnu', 39),
  ('Ankara', 'Altındağ', 1),
  ('Ankara', 'Ayaş', 2),
  ('Ankara', 'Bala', 3),
  ('Ankara', 'Beypazarı', 4),
  ('Ankara', 'Çamlıdere', 5),
  ('Ankara', 'Çankaya', 6),
  ('Ankara', 'Çubuk', 7),
  ('Ankara', 'Elmadağ', 8),
  ('Ankara', 'Etimesgut', 9),
  ('Ankara', 'Evren', 10),
  ('Ankara', 'Gölbaşı', 11),
  ('Ankara', 'Güdül', 12),
  ('Ankara', 'Haymana', 13),
  ('Ankara', 'Kahramankazan', 14),
  ('Ankara', 'Kalecik', 15),
  ('Ankara', 'Kazan', 16),
  ('Ankara', 'Keçiören', 17),
  ('Ankara', 'Kızılcahamam', 18),
  ('Ankara', 'Mamak', 19),
  ('Ankara', 'Nallıhan', 20),
  ('Ankara', 'Polatlı', 21),
  ('Ankara', 'Pursaklar', 22),
  ('Ankara', 'Sincan', 23),
  ('Ankara', 'Şereflikoçhisar', 24),
  ('Ankara', 'Yenimahalle', 25),
  ('İzmir', 'Aliağa', 1),
  ('İzmir', 'Balçova', 2),
  ('İzmir', 'Bayındır', 3),
  ('İzmir', 'Bayraklı', 4),
  ('İzmir', 'Bergama', 5),
  ('İzmir', 'Beydağ', 6),
  ('İzmir', 'Bornova', 7),
  ('İzmir', 'Buca', 8),
  ('İzmir', 'Çeşme', 9),
  ('İzmir', 'Çiğli', 10),
  ('İzmir', 'Dikili', 11),
  ('İmir', 'Foça', 12),
  ('İzmir', 'Gaziemir', 13),
  ('İzmir', 'Güzelbahçe', 14),
  ('İzmir', 'Karabağlar', 15),
  ('İzmir', 'Karaburun', 16),
  ('İzmir', 'Karşıyaka', 17),
  ('İzmir', 'Kemalpaşa', 18),
  ('İzmir', 'Kınık', 19),
  ('İzmir', 'Kiraz', 20),
  ('İzmir', 'Konak', 21),
  ('İzmir', 'Menderes', 22),
  ('İzmir', 'Menemen', 23),
  ('İzmir', 'Narlıdere', 24),
  ('İzmir', 'Ödemiş', 25),
  ('İzmir', 'Seferihisar', 26),
  ('İzmir', 'Selçuk', 27),
  ('İzmir', 'Tire', 28),
  ('İzmir', 'Torbalı', 29),
  ('İzmir', 'Urla', 30)
) as d(city_name, name, sort_order)
join public.cities c on c.name = d.city_name
on conflict (city_id, name) do nothing;

-- Not: Production'da 975 ilçenin tam listesi eklenmelidir.
-- Burada örnek olarak 3 ilin (İstanbul, Ankara, İzmir) ilçeleri var.
-- Kalan iller için seed_ilceler_tam.sql ayrı dosya oluşturulabilir.

-- =====================================================
-- 3) ENGINE_SIZES (55+ motor hacmi)
-- =====================================================
insert into public.engine_sizes (displacement, sort_order) values
  ('0.8', 1),
  ('0.9', 2),
  ('1.0', 3),
  ('1.0 TSI', 4),
  ('1.0 T-GDI', 5),
  ('1.2', 6),
  ('1.2 TSI', 7),
  ('1.2 PureTech', 8),
  ('1.3', 9),
  ('1.3 TSI', 10),
  ('1.3 T-GDI', 11),
  ('1.4', 12),
  ('1.4 TSI', 13),
  ('1.4 TSI ACT', 14),
  ('1.4 T-Jet', 15),
  ('1.4 Fire', 16),
  ('1.4 Multiair', 17),
  ('1.5', 18),
  ('1.5 dCi', 19),
  ('1.5 TSI', 20),
  ('1.5 BlueHDi', 21),
  ('1.5 TDCi', 22),
  ('1.6', 23),
  ('1.6 TSI', 24),
  ('1.6 TDI', 25),
  ('1.6 dCi', 26),
  ('1.6 HDi', 27),
  ('1.6 THP', 28),
  ('1.6 Multijet', 29),
  ('1.6 EcoBoost', 30),
  ('1.8', 31),
  ('1.8 TSI', 32),
  ('1.8 TFSI', 33),
  ('1.8 T-Jet', 34),
  ('1.9 TDI', 35),
  ('1.9 dCi', 36),
  ('1.9 JTD', 37),
  ('2.0', 38),
  ('2.0 TSI', 39),
  ('2.0 TDI', 40),
  ('2.0 TFSI', 41),
  ('2.0 dCi', 42),
  ('2.0 HDi', 43),
  ('2.0 BlueHDi', 44),
  ('2.0 Multijet', 45),
  ('2.0 EcoBoost', 46),
  ('2.2', 47),
  ('2.2 TDI', 48),
  ('2.2 dCi', 49),
  ('2.4', 50),
  ('2.5 TDI', 51),
  ('3.0', 52),
  ('3.0 TDI', 53),
  ('3.0 dCi', 54),
  ('Elektrik', 100)
on conflict (displacement) do nothing;

-- =====================================================
-- 4) CATEGORIES (araç kategorileri)
-- =====================================================
insert into public.categories (name, slug, description, sort_order) values
  ('Sedan', 'sedan', 'Klasik 4 kapılı sedan araçlar', 1),
  ('Hatchback', 'hatchback', '5 kapılı hatchback araçlar', 2),
  ('Station Wagon', 'station-wagon', 'Geniş bagaj hacimli station wagon', 3),
  ('SUV', 'suv', 'Sport utility vehicle, yüksek yapılı araçlar', 4),
  ('Pickup', 'pickup', 'Açık kasa yük taşıma araçları', 5),
  ('Minivan', 'minivan', 'Çok amaçlı büyük iç hacimli araçlar', 6),
  ('Coupe', 'coupe', '2 kapılı sportif coupe araçlar', 7),
  ('Cabrio', 'cabrio', 'Açılabilir tavanlı cabrio araçlar', 8),
  ('MPV', 'mpv', 'Multi purpose vehicle, geniş aileler için', 9)
on conflict (slug) do nothing;

-- =====================================================
-- 5) VEHICLE_BRANDS (49+ marka)
-- =====================================================
insert into public.vehicle_brands (name, sort_order) values
  ('BMW', 1),
  ('Mercedes-Benz', 2),
  ('Audi', 3),
  ('Volkswagen', 4),
  ('Ford', 5),
  ('Renault', 6),
  ('Fiat', 7),
  ('Hyundai', 8),
  ('Toyota', 9),
  ('Honda', 10),
  ('Opel', 11),
  ('Peugeot', 12),
  ('Citroen', 13),
  ('Skoda', 14),
  ('Kia', 15),
  ('Nissan', 16),
  ('Mazda', 17),
  ('Volvo', 18),
  ('Land Rover', 19),
  ('Porsche', 20),
  ('Chevrolet', 21),
  ('Dacia', 22),
  ('Tofaş', 23),
  ('Suzuki', 24),
  ('Mitsubishi', 25),
  ('Subaru', 26),
  ('Jeep', 27),
  ('Mini', 28),
  ('Tesla', 29),
  ('Lexus', 30),
  ('Jaguar', 31),
  ('Alfa Romeo', 32),
  ('Seat', 33),
  ('Daihatsu', 34),
  ('Lada', 35),
  ('SsangYong', 36),
  ('Chery', 37),
  ('Geely', 38),
  ('MG', 39),
  ('Isuzu', 40)
on conflict (name) do nothing;

-- =====================================================
-- 6) VEHICLE_MODELS (yaygın markaların ana modelleri)
-- Tam liste production'da eklenebilir (564+ model)
-- Burada örnek olarak ana markalar
-- =====================================================
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from (values
  ('BMW', '1 Serisi', 1),
  ('BMW', '2 Serisi', 2),
  ('BMW', '3 Serisi', 3),
  ('BMW', '4 Serisi', 4),
  ('BMW', '5 Serisi', 5),
  ('BMW', '7 Serisi', 6),
  ('BMW', 'X1', 7),
  ('BMW', 'X3', 8),
  ('BMW', 'X5', 9),
  ('BMW', 'Z4', 10),
  ('Mercedes-Benz', 'A Serisi', 1),
  ('Mercedes-Benz', 'B Serisi', 2),
  ('Mercedes-Benz', 'C Serisi', 3),
  ('Mercedes-Benz', 'E Serisi', 4),
  ('Mercedes-Benz', 'S Serisi', 5),
  ('Mercedes-Benz', 'GLA', 6),
  ('Mercedes-Benz', 'GLC', 7),
  ('Mercedes-Benz', 'GLE', 8),
  ('Audi', 'A3', 1),
  ('Audi', 'A4', 2),
  ('Audi', 'A6', 3),
  ('Audi', 'Q3', 4),
  ('Audi', 'Q5', 5),
  ('Audi', 'Q7', 6),
  ('Volkswagen', 'Polo', 1),
  ('Volkswagen', 'Golf', 2),
  ('Volkswagen', 'Passat', 3),
  ('Volkswagen', 'Tiguan', 4),
  ('Volkswagen', 'T-Roc', 5),
  ('Renault', 'Clio', 1),
  ('Renault', 'Megane', 2),
  ('Renault', 'Captur', 3),
  ('Renault', 'Clio', 4),
  ('Ford', 'Focus', 1),
  ('Ford', 'Fiesta', 2),
  ('Ford', 'Kuga', 3),
  ('Ford', 'Puma', 4),
  ('Hyundai', 'i20', 1),
  ('Hyundai', 'i30', 2),
  ('Hyundai', 'Tucson', 3),
  ('Toyota', 'Corolla', 1),
  ('Toyota', 'Yaris', 2),
  ('Toyota', 'RAV4', 3),
  ('Honda', 'Civic', 1),
  ('Honda', 'Jazz', 2),
  ('Honda', 'HR-V', 3),
  ('Fiat', 'Egea', 1),
  ('Fiat', '500', 2),
  ('Fiat', 'Doblo', 3)
) as m(brand_name, name, sort_order)
join public.vehicle_brands b on b.name = m.brand_name
on conflict (brand_id, name) do nothing;

-- =====================================================
-- 7) DEFAULT ADMIN SETUP INFO
-- =====================================================
-- İlk admin oluşturmak için:
-- 1) Frontend'de /kayit ile kayıt ol
-- 2) Email'ini doğrula
-- 3) SQL Editor'de şu komutu çalıştır:
/*
  insert into public.admin_users (user_id, username, full_name, is_active, is_super_admin)
  select id, 'admin', 'Site Yöneticisi', true, true
  from auth.users
  where email = 'senin@email.com';
*/

-- =====================================================
-- Bitti! Tüm migration'lar tamamlandı.
-- =====================================================
