-- Migration 29: İlçeler (TÜİK 2024 - Tam Liste)
-- 81 ilin tüm ilçeleri (büyükşehirlerdeki mahalleler dahil değil, sadece resmi ilçeler)

-- ADANA (01)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Aladağ', 1), ('Ceyhan', 2), ('Çukurova', 3), ('Feke', 4), ('İmamoğlu', 5),
  ('Karaisalı', 6), ('Karataş', 7), ('Kozan', 8), ('Pozantı', 9), ('Saimbeyli', 10),
  ('Sarıçam', 11), ('Seyhan', 12), ('Tufanbeyli', 13), ('Yumurtalık', 14), ('Yüreğir', 15)
) as d(name, sort_order) where c.name = 'Adana';

-- ADIYAMAN (02)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Besni', 1), ('Çelikhan', 2), ('Gerger', 3), ('Gölbaşı', 4), ('Kahta', 5),
  ('Merkez', 6), ('Samsat', 7), ('Sincik', 8), ('Tut', 9)
) as d(name, sort_order) where c.name = 'Adıyaman';

-- AFYONKARAHİSAR (03)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Başmakçı', 1), ('Bayat', 2), ('Bolvadin', 3), ('Çay', 4), ('Çobanlar', 5),
  ('Dazkırı', 6), ('Dinar', 7), ('Emirdağ', 8), ('Evciler', 9), ('Hocalar', 10),
  ('İhsaniye', 11), ('İscehisar', 12), ('Kızılören', 13), ('Merkez', 14), ('Sandıklı', 15),
  ('Sinanpaşa', 16), ('Sultandağı', 17), ('Şuhut', 18)
) as d(name, sort_order) where c.name = 'Afyonkarahisar';

-- AĞRI (04)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Diyadin', 1), ('Doğubayazıt', 2), ('Eleşkirt', 3), ('Hamur', 4), ('Merkez', 5),
  ('Patnos', 6), ('Taşlıçay', 7), ('Tutak', 8)
) as d(name, sort_order) where c.name = 'Ağrı';

-- AMASYA (05)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Göynücek', 1), ('Gümüşhacıköy', 2), ('Hamamözü', 3), ('Merkez', 4), ('Merzifon', 5),
  ('Suluova', 6), ('Taşova', 7)
) as d(name, sort_order) where c.name = 'Amasya';

-- ANKARA (06)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akyurt', 1), ('Altındağ', 2), ('Ayaş', 3), ('Bala', 4), ('Beypazarı', 5),
  ('Çamlıdere', 6), ('Çankaya', 7), ('Çubuk', 8), ('Elmadağ', 9), ('Etimesgut', 10),
  ('Evren', 11), ('Gölbaşı', 12), ('Güdül', 13), ('Haymana', 14), ('Kahramankazan', 15),
  ('Kalecik', 16), ('Kazan', 17), ('Keçiören', 18), ('Kızılcahamam', 19), ('Mamak', 20),
  ('Nallıhan', 21), ('Polatlı', 22), ('Pursaklar', 23), ('Sincan', 24), ('Şereflikoçhisar', 25),
  ('Yenimahalle', 26)
) as d(name, sort_order) where c.name = 'Ankara';

-- ANTALYA (07)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akseki', 1), ('Aksu', 2), ('Alanya', 3), ('Demre', 4), ('Döşemealtı', 5),
  ('Elmalı', 6), ('Finike', 7), ('Gazipaşa', 8), ('Gündoğmuş', 9), ('İbradı', 10),
  ('Kaş', 11), ('Kemer', 12), ('Kepez', 13), ('Konyaaltı', 14), ('Korkuteli', 15),
  ('Kumluca', 16), ('Manavgat', 17), ('Muratpaşa', 18), ('Serik', 19)
) as d(name, sort_order) where c.name = 'Antalya';

-- ARTVİN (08)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ardanuç', 1), ('Arhavi', 2), ('Borçka', 3), ('Hopa', 4), ('Kemalpaşa', 5),
  ('Merkez', 6), ('Murgul', 7), ('Şavşat', 8), ('Yusufeli', 9)
) as d(name, sort_order) where c.name = 'Artvin';

-- AYDIN (09)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bozdoğan', 1), ('Buharkent', 2), ('Çine', 3), ('Didim', 4), ('Efeler', 5),
  ('Germencik', 6), ('İncirliova', 7), ('Karacasu', 8), ('Karpuzlu', 9), ('Koçarlı', 10),
  ('Köşk', 11), ('Kuşadası', 12), ('Kuyucak', 13), ('Nazilli', 14), ('Söke', 15),
  ('Sultanhisar', 16), ('Yenipazar', 17)
) as d(name, sort_order) where c.name = 'Aydın';

-- BALIKESİR (10)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Altıeylül', 1), ('Ayvalık', 2), ('Balya', 3), ('Bandırma', 4), ('Bigadiç', 5),
  ('Burhaniye', 6), ('Dursunbey', 7), ('Edremit', 8), ('Erdek', 9), ('Gömeç', 10),
  ('Gönen', 11), ('Havran', 12), ('İvrindi', 13), ('Karesi', 14), ('Kepsut', 15),
  ('Manyas', 16), ('Marmara', 17), ('Savaştepe', 18), ('Sındırgı', 19), ('Susurluk', 20)
) as d(name, sort_order) where c.name = 'Balıkesir';

-- BİLECİK (11)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bozüyük', 1), ('Gölpazarı', 2), ('İnhisar', 3), ('Merkez', 4), ('Osmaneli', 5),
  ('Pazaryeri', 6), ('Söğüt', 7), ('Yenipazar', 8)
) as d(name, sort_order) where c.name = 'Bilecik';

-- BİNGÖL (12)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Adaklı', 1), ('Genç', 2), ('Karlıova', 3), ('Kiğı', 4), ('Merkez', 5),
  ('Solhan', 6), ('Yayladere', 7), ('Yedisu', 8)
) as d(name, sort_order) where c.name = 'Bingöl';

-- BİTLİS (13)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Adilcevaz', 1), ('Ahlat', 2), ('Güroymak', 3), ('Hizan', 4), ('Merkez', 5),
  ('Mutki', 6), ('Tatvan', 7)
) as d(name, sort_order) where c.name = 'Bitlis';

-- BOLU (14)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Dörtdivan', 1), ('Gerede', 2), ('Göynük', 3), ('Kıbrıscık', 4), ('Mengen', 5),
  ('Merkez', 6), ('Mudurnu', 7), ('Seben', 8), ('Yeniçağa', 9)
) as d(name, sort_order) where c.name = 'Bolu';

-- BURDUR (15)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ağlasun', 1), ('Altınyayla', 2), ('Bucak', 3), ('Çavdır', 4), ('Çeltikçi', 5),
  ('Gölhisar', 6), ('Karamanlı', 7), ('Kemer', 8), ('Merkez', 9), ('Tefenni', 10),
  ('Yeşilova', 11)
) as d(name, sort_order) where c.name = 'Burdur';

-- BURSA (16)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Büyükorhan', 1), ('Gemlik', 2), ('Gürsu', 3), ('Harmancık', 4), ('İnegöl', 5),
  ('İznik', 6), ('Karacabey', 7), ('Keles', 8), ('Kestel', 9), ('Mudanya', 10),
  ('Mustafakemalpaşa', 11), ('Nilüfer', 12), ('Orhaneli', 13), ('Orhangazi', 14), ('Osmangazi', 15),
  ('Yenişehir', 16), ('Yıldırım', 17)
) as d(name, sort_order) where c.name = 'Bursa';

-- ÇANAKKALE (17)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ayvacık', 1), ('Bayramiç', 2), ('Biga', 3), ('Bozcaada', 4), ('Çan', 5),
  ('Eceabat', 6), ('Ezine', 7), ('Gelibolu', 8), ('Gökçeada', 9), ('Lapseki', 10),
  ('Merkez', 11), ('Yenice', 12)
) as d(name, sort_order) where c.name = 'Çanakkale';

-- ÇANKIRI (18)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Atkaracalar', 1), ('Bayramören', 2), ('Çerkeş', 3), ('Eldivan', 4), ('Ilgaz', 5),
  ('Kızılırmak', 6), ('Korgun', 7), ('Kurşunlu', 8), ('Merkez', 9), ('Orta', 10),
  ('Şabanözü', 11), ('Yapraklı', 12)
) as d(name, sort_order) where c.name = 'Çankırı';

-- ÇORUM (19)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Alaca', 1), ('Bayat', 2), ('Boğazkale', 3), ('Dodurga', 4), ('İskilip', 5),
  ('Kargı', 6), ('Laçin', 7), ('Mecitözü', 8), ('Merkez', 9), ('Oğuzlar', 10),
  ('Ortaköy', 11), ('Osmancık', 12), ('Sungurlu', 13), ('Uğurludağ', 14)
) as d(name, sort_order) where c.name = 'Çorum';

-- DENİZLİ (20)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Acıpayam', 1), ('Babadağ', 2), ('Baklan', 3), ('Bekilli', 4), ('Beyağaç', 5),
  ('Bozkurt', 6), ('Buldan', 7), ('Çal', 8), ('Çameli', 9), ('Çardak', 10),
  ('Çivril', 11), ('Güney', 12), ('Honaz', 13), ('Kale', 14), ('Merkezefendi', 15),
  ('Pamukkale', 16), ('Sarayköy', 17), ('Serinhisar', 18), ('Tavas', 19)
) as d(name, sort_order) where c.name = 'Denizli';

-- DİYARBAKIR (21)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bağlar', 1), ('Bismil', 2), ('Çermik', 3), ('Çınar', 4), ('Çüngüş', 5),
  ('Dicle', 6), ('Eğil', 7), ('Ergani', 8), ('Hani', 9), ('Hazro', 10),
  ('Kayapınar', 11), ('Kocaköy', 12), ('Kulp', 13), ('Lice', 14), ('Silvan', 15),
  ('Sur', 16), ('Yenişehir', 17)
) as d(name, sort_order) where c.name = 'Diyarbakır';
