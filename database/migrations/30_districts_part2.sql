-- Migration 30: İlçeler Part 2 (İstanbul + İzmir dahil büyük şehirler)

-- EDİRNE (22)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Enez', 1), ('Havsa', 2), ('İpsala', 3), ('Keşan', 4), ('Lalapaşa', 5),
  ('Meriç', 6), ('Merkez', 7), ('Süloğlu', 8), ('Uzunköprü', 9)
) as d(name, sort_order) where c.name = 'Edirne';

-- ELAZIĞ (23)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ağın', 1), ('Alacakaya', 2), ('Arıcak', 3), ('Baskil', 4), ('Karakoçan', 5),
  ('Keban', 6), ('Kovancılar', 7), ('Maden', 8), ('Merkez', 9), ('Palu', 10),
  ('Sivrice', 11)
) as d(name, sort_order) where c.name = 'Elazığ';

-- ERZİNCAN (24)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Çayırlı', 1), ('İliç', 2), ('Kemah', 3), ('Kemaliye', 4), ('Merkez', 5),
  ('Otlukbeli', 6), ('Refahiye', 7), ('Tercan', 8), ('Üzümlü', 9)
) as d(name, sort_order) where c.name = 'Erzincan';

-- ERZURUM (25)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Aşkale', 1), ('Aziziye', 2), ('Çat', 3), ('Hınıs', 4), ('Horasan', 5),
  ('İspir', 6), ('Karaçoban', 7), ('Karayazı', 8), ('Köprüköy', 9), ('Narman', 10),
  ('Oltu', 11), ('Olur', 12), ('Palandöken', 13), ('Pasinler', 14), ('Pazaryolu', 15),
  ('Şenkaya', 16), ('Tekman', 17), ('Tortum', 18), ('Uzundere', 19), ('Yakutiye', 20)
) as d(name, sort_order) where c.name = 'Erzurum';

-- ESKİŞEHİR (26)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Alpu', 1), ('Beylikova', 2), ('Çifteler', 3), ('Günyüzü', 4), ('Han', 5),
  ('İnönü', 6), ('Mahmudiye', 7), ('Mihalgazi', 8), ('Mihalıççık', 9), ('Odunpazarı', 10),
  ('Sarıcakaya', 11), ('Seyitgazi', 12), ('Sivrihisar', 13), ('Tepebaşı', 14)
) as d(name, sort_order) where c.name = 'Eskişehir';

-- GAZİANTEP (27)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Araban', 1), ('İslahiye', 2), ('Karkamış', 3), ('Nizip', 4), ('Nurdağı', 5),
  ('Oğuzeli', 6), ('Şahinbey', 7), ('Şehitkamil', 8), ('Yavuzeli', 9)
) as d(name, sort_order) where c.name = 'Gaziantep';

-- GİRESUN (28)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Alucra', 1), ('Bulancak', 2), ('Çamoluk', 3), ('Çanakçı', 4), ('Dereli', 5),
  ('Doğankent', 6), ('Espiye', 7), ('Eynesil', 8), ('Görele', 9), ('Güce', 10),
  ('Keşap', 11), ('Merkez', 12), ('Piraziz', 13), ('Şebinkarahisar', 14), ('Tirebolu', 15),
  ('Yağlıdere', 16)
) as d(name, sort_order) where c.name = 'Giresun';

-- GÜMÜŞHANE (29)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Kelkit', 1), ('Köse', 2), ('Kürtün', 3), ('Merkez', 4), ('Şiran', 5), ('Torul', 6)
) as d(name, sort_order) where c.name = 'Gümüşhane';

-- HAKKARİ (30)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Çukurca', 1), ('Derecik', 2), ('Merkez', 3), ('Şemdinli', 4), ('Yüksekova', 5)
) as d(name, sort_order) where c.name = 'Hakkari';

-- HATAY (31)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Altınözü', 1), ('Antakya', 2), ('Arsuz', 3), ('Belen', 4), ('Defne', 5),
  ('Dörtyol', 6), ('Erzin', 7), ('Hassa', 8), ('İskenderun', 9), ('Kırıkhan', 10),
  ('Kumlu', 11), ('Payas', 12), ('Reyhanlı', 13), ('Samandağ', 14), ('Yayladağı', 15)
) as d(name, sort_order) where c.name = 'Hatay';

-- ISPARTA (32)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Aksu', 1), ('Atabey', 2), ('Eğirdir', 3), ('Gelendost', 4), ('Gönen', 5),
  ('Keçiborlu', 6), ('Merkez', 7), ('Senirkent', 8), ('Sütçüler', 9), ('Şarkikaraağaç', 10),
  ('Uluborlu', 11), ('Yalvaç', 12), ('Yenişarbademli', 13)
) as d(name, sort_order) where c.name = 'Isparta';

-- MERSİN (33)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akdeniz', 1), ('Anamur', 2), ('Aydıncık', 3), ('Bozyazı', 4), ('Çamlıyayla', 5),
  ('Erdemli', 6), ('Gülnar', 7), ('Mezitli', 8), ('Mut', 9), ('Silifke', 10),
  ('Tarsus', 11), ('Toroslar', 12), ('Yenişehir', 13)
) as d(name, sort_order) where c.name = 'Mersin';

-- İSTANBUL (34)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Adalar', 1), ('Arnavutköy', 2), ('Ataşehir', 3), ('Avcılar', 4), ('Bağcılar', 5),
  ('Bahçelievler', 6), ('Bakırköy', 7), ('Başakşehir', 8), ('Bayrampaşa', 9), ('Beşiktaş', 10),
  ('Beykoz', 11), ('Beylikdüzü', 12), ('Beyoğlu', 13), ('Büyükçekmece', 14), ('Çatalca', 15),
  ('Çekmeköy', 16), ('Esenler', 17), ('Esenyurt', 18), ('Eyüpsultan', 19), ('Fatih', 20),
  ('Gaziosmanpaşa', 21), ('Güngören', 22), ('Kadıköy', 23), ('Kağıthane', 24), ('Kartal', 25),
  ('Küçükçekmece', 26), ('Maltepe', 27), ('Pendik', 28), ('Sancaktepe', 29), ('Sarıyer', 30),
  ('Silivri', 31), ('Sultanbeyli', 32), ('Sultangazi', 33), ('Şile', 34), ('Şişli', 35),
  ('Tuzla', 36), ('Ümraniye', 37), ('Üsküdar', 38), ('Zeytinburnu', 39)
) as d(name, sort_order) where c.name = 'İstanbul';

-- İZMİR (35)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Aliağa', 1), ('Balçova', 2), ('Bayındır', 3), ('Bayraklı', 4), ('Bergama', 5),
  ('Beydağ', 6), ('Bornova', 7), ('Buca', 8), ('Çeşme', 9), ('Çiğli', 10),
  ('Dikili', 11), ('Foça', 12), ('Gaziemir', 13), ('Güzelbahçe', 14), ('Karabağlar', 15),
  ('Karaburun', 16), ('Karşıyaka', 17), ('Kemalpaşa', 18), ('Kınık', 19), ('Kiraz', 20),
  ('Konak', 21), ('Menderes', 22), ('Menemen', 23), ('Narlıdere', 24), ('Ödemiş', 25),
  ('Seferihisar', 26), ('Selçuk', 27), ('Tire', 28), ('Torbalı', 29), ('Urla', 30)
) as d(name, sort_order) where c.name = 'İzmir';
