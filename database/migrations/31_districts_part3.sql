-- Migration 31: İlçeler Part 3 (Kalan 46 il)

-- KARS (36)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akyaka', 1), ('Arpaçay', 2), ('Digor', 3), ('Kağızman', 4), ('Merkez', 5),
  ('Sarıkamış', 6), ('Selim', 7), ('Susuz', 8)
) as d(name, sort_order) where c.name = 'Kars';

-- KASTAMONU (37)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Abana', 1), ('Ağlı', 2), ('Araç', 3), ('Azdavay', 4), ('Bozkurt', 5),
  ('Cide', 6), ('Çatalzeytin', 7), ('Daday', 8), ('Devrekani', 9), ('Doğanyurt', 10),
  ('Hanönü', 11), ('İhsangazi', 12), ('İnebolu', 13), ('Küre', 14), ('Merkez', 15),
  ('Pınarbaşı', 16), ('Seydiler', 17), ('Şenpazar', 18), ('Taşköprü', 19), ('Tosya', 20)
) as d(name, sort_order) where c.name = 'Kastamonu';

-- KAYSERİ (38)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akkışla', 1), ('Bünyan', 2), ('Develi', 3), ('Felahiye', 4), ('Hacılar', 5),
  ('İncesu', 6), ('Kocasinan', 7), ('Melikgazi', 8), ('Özvatan', 9), ('Pınarbaşı', 10),
  ('Sarıoğlan', 11), ('Sarız', 12), ('Talas', 13), ('Tomarza', 14), ('Yahyalı', 15),
  ('Yeşilhisar', 16)
) as d(name, sort_order) where c.name = 'Kayseri';

-- KIRKLARELİ (39)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Babaeski', 1), ('Demirköy', 2), ('Kofçaz', 3), ('Lüleburgaz', 4), ('Merkez', 5),
  ('Pehlivanköy', 6), ('Pınarhisar', 7), ('Vize', 8)
) as d(name, sort_order) where c.name = 'Kırklareli';

-- KIRŞEHİR (40)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akçakent', 1), ('Akpınar', 2), ('Boztepe', 3), ('Çiçekdağı', 4), ('Kaman', 5),
  ('Merkez', 6), ('Mucur', 7)
) as d(name, sort_order) where c.name = 'Kırşehir';

-- KOCAELİ (41)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Başiskele', 1), ('Çayırova', 2), ('Darıca', 3), ('Derince', 4), ('Dilovası', 5),
  ('Gebze', 6), ('Gölcük', 7), ('İzmit', 8), ('Kandıra', 9), ('Karamürsel', 10),
  ('Kartepe', 11), ('Körfez', 12)
) as d(name, sort_order) where c.name = 'Kocaeli';

-- KONYA (42)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ahırlı', 1), ('Akören', 2), ('Akşehir', 3), ('Altınekin', 4), ('Beyşehir', 5),
  ('Bozkır', 6), ('Cihanbeyli', 7), ('Çeltik', 8), ('Çumra', 9), ('Derbent', 10),
  ('Derebucak', 11), ('Doğanhisar', 12), ('Emirgazi', 13), ('Ereğli', 14), ('Güneysınır', 15),
  ('Hadim', 16), ('Halkapınar', 17), ('Hüyük', 18), ('Ilgın', 19), ('Kadınhanı', 20),
  ('Karapınar', 21), ('Karatay', 22), ('Kulu', 23), ('Meram', 24), ('Sarayönü', 25),
  ('Selçuklu', 26), ('Seydişehir', 27), ('Taşkent', 28), ('Tuzlukçu', 29), ('Yalıhüyük', 30),
  ('Yunak', 31)
) as d(name, sort_order) where c.name = 'Konya';

-- KÜTAHYA (43)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Altıntaş', 1), ('Aslanapa', 2), ('Çavdarhisar', 3), ('Domaniç', 4), ('Dumlupınar', 5),
  ('Emet', 6), ('Gediz', 7), ('Hisarcık', 8), ('Merkez', 9), ('Pazarlar', 10),
  ('Simav', 11), ('Şaphane', 12), ('Tavşanlı', 13)
) as d(name, sort_order) where c.name = 'Kütahya';

-- MALATYA (44)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akçadağ', 1), ('Arapgir', 2), ('Arguvan', 3), ('Battalgazi', 4), ('Darende', 5),
  ('Doğanşehir', 6), ('Doğanyol', 7), ('Hekimhan', 8), ('Kale', 9), ('Kuluncak', 10),
  ('Pütürge', 11), ('Yazıhan', 12), ('Yeşilyurt', 13)
) as d(name, sort_order) where c.name = 'Malatya';

-- MANİSA (45)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ahmetli', 1), ('Akhisar', 2), ('Alaşehir', 3), ('Demirci', 4), ('Gölmarmara', 5),
  ('Gördes', 6), ('Kırkağaç', 7), ('Köprübaşı', 8), ('Kula', 9), ('Salihli', 10),
  ('Sarıgöl', 11), ('Saruhanlı', 12), ('Selendi', 13), ('Soma', 14), ('Şehzadeler', 15),
  ('Turgutlu', 16), ('Yunusemre', 17)
) as d(name, sort_order) where c.name = 'Manisa';

-- KAHRAMANMARAŞ (46)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Afşin', 1), ('Andırın', 2), ('Çağlayancerit', 3), ('Dulkadiroğlu', 4), ('Ekinözü', 5),
  ('Elbistan', 6), ('Göksun', 7), ('Nurhak', 8), ('Onikişubat', 9), ('Pazarcık', 10),
  ('Türkoğlu', 11)
) as d(name, sort_order) where c.name = 'Kahramanmaraş';

-- MARDİN (47)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Artuklu', 1), ('Dargeçit', 2), ('Derik', 3), ('Kızıltepe', 4), ('Mazıdağı', 5),
  ('Midyat', 6), ('Nusaybin', 7), ('Ömerli', 8), ('Savur', 9), ('Yeşilli', 10)
) as d(name, sort_order) where c.name = 'Mardin';

-- MUĞLA (48)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bodrum', 1), ('Dalaman', 2), ('Datça', 3), ('Fethiye', 4), ('Kavaklıdere', 5),
  ('Köyceğiz', 6), ('Marmaris', 7), ('Menteşe', 8), ('Milas', 9), ('Ortaca', 10),
  ('Seydikemer', 11), ('Ula', 12), ('Yatağan', 13)
) as d(name, sort_order) where c.name = 'Muğla';

-- MUŞ (49)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bulanık', 1), ('Hasköy', 2), ('Korkut', 3), ('Malazgirt', 4), ('Merkez', 5), ('Varto', 6)
) as d(name, sort_order) where c.name = 'Muş';

-- NEVŞEHİR (50)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Acıgöl', 1), ('Avanos', 2), ('Derinkuyu', 3), ('Gülşehir', 4), ('Hacıbektaş', 5),
  ('Kozaklı', 6), ('Merkez', 7), ('Ürgüp', 8)
) as d(name, sort_order) where c.name = 'Nevşehir';

-- NİĞDE (51)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Altunhisar', 1), ('Bor', 2), ('Çamardı', 3), ('Çiftlik', 4), 'Merkez', 5), ('Ulukışla', 6)
) as d(name, sort_order) where c.name = 'Niğde';

-- ORDU (52)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akkuş', 1), ('Altınordu', 2), ('Aybastı', 3), ('Çamaş', 4), ('Çatalpınar', 5),
  ('Çaybaşı', 6), ('Fatsa', 7), ('Gölköy', 8), ('Gülyalı', 9), ('Gürgentepe', 10),
  ('İkizce', 11), ('Kabadüz', 12), ('Kabataş', 13), ('Korgan', 14), ('Kumru', 15),
  ('Mesudiye', 16), ('Perşembe', 17), ('Ulubey', 18), ('Ünye', 19)
) as d(name, sort_order) where c.name = 'Ordu';

-- RİZE (53)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ardeşen', 1), ('Çamlıhemşin', 2), ('Çayeli', 3), ('Derepazarı', 4), ('Fındıklı', 5),
  ('Güneysu', 6), ('Hemşin', 7), ('İkizdere', 8), ('İyidere', 9), ('Kalkandere', 10),
  ('Merkez', 11), ('Pazar', 12)
) as d(name, sort_order) where c.name = 'Rize';
