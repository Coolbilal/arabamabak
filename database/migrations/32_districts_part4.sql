-- Migration 32: İlçeler Part 4 (Son 28 il)

-- SAKARYA (54)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Adapazarı', 1), ('Akyazı', 2), ('Arifiye', 3), ('Erenler', 4), ('Ferizli', 5),
  ('Geyve', 6), ('Hendek', 7), ('Karapürçek', 8), ('Karasu', 9), ('Kaynarca', 10),
  ('Kocaali', 11), ('Pamukova', 12), ('Sapanca', 13), ('Serdivan', 14), ('Söğütlü', 15),
  ('Taraklı', 16)
) as d(name, sort_order) where c.name = 'Sakarya';

-- SAMSUN (55)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('19 Mayıs', 1), ('Alaçam', 2), ('Asarcık', 3), ('Atakum', 4), ('Ayvacık', 5),
  ('Bafra', 6), ('Canik', 7), ('Çarşamba', 8), ('Havza', 9), ('İlkadım', 10),
  ('Kavak', 11), ('Ladik', 12), ('Salıpazarı', 13), ('Tekkeköy', 14), ('Terme', 15),
  ('Vezirköprü', 16), ('Yakakent', 17)
) as d(name, sort_order) where c.name = 'Samsun';

-- SİİRT (56)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Baykan', 1), ('Eruh', 2), ('Kurtalan', 3), ('Merkez', 4), ('Pervari', 5), ('Şirvan', 6), ('Tillo', 7)
) as d(name, sort_order) where c.name = 'Siirt';

-- SİNOP (57)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ayancık', 1), ('Boyabat', 2), ('Dikmen', 3), ('Durağan', 4), ('Erfelek', 5),
  ('Gerze', 6), ('Merkez', 7), ('Saraydüzü', 8), ('Türkeli', 9)
) as d(name, sort_order) where c.name = 'Sinop';

-- SİVAS (58)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akıncılar', 1), ('Altınyayla', 2), ('Divriği', 3), ('Doğanşar', 4), ('Gemerek', 5),
  ('Gölova', 6), ('Gürün', 7), ('Hafik', 8), ('İmranlı', 9), ('Kangal', 10),
  ('Koyulhisar', 11), ('Merkez', 12), ('Suşehri', 13), ('Şarkışla', 14), ('Ulaş', 15),
  ('Yıldızeli', 16), ('Zara', 17)
) as d(name, sort_order) where c.name = 'Sivas';

-- TEKİRDAĞ (59)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Çerkezköy', 1), ('Çorlu', 2), ('Ergene', 3), ('Hayrabolu', 4), ('Kapaklı', 5),
  ('Malkara', 6), ('Marmaraereğlisi', 7), ('Muratlı', 8), ('Saray', 9), ('Süleymanpaşa', 10),
  ('Şarköy', 11)
) as d(name, sort_order) where c.name = 'Tekirdağ';

-- TOKAT (60)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Almus', 1), ('Artova', 2), ('Başçiftlik', 3), ('Erbaa', 4), ('Merkez', 5),
  ('Niksar', 6), ('Pazar', 7), ('Reşadiye', 8), ('Sulusaray', 9), ('Turhal', 10),
  ('Yeşilyurt', 11), ('Zile', 12)
) as d(name, sort_order) where c.name = 'Tokat';

-- TRABZON (61)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akçaabat', 1), ('Araklı', 2), ('Arsin', 3), ('Beşikdüzü', 4), ('Çarşıbaşı', 5),
  ('Çaykara', 6), ('Dernekpazarı', 7), ('Düzköy', 8), ('Hayrat', 9), ('Köprübaşı', 10),
  ('Maçka', 11), ('Of', 12), ('Ortahisar', 13), ('Sürmene', 14), ('Şalpazarı', 15),
  ('Tonya', 16), ('Vakfıkebir', 17), ('Yomra', 18)
) as d(name, sort_order) where c.name = 'Trabzon';

-- TUNCELİ (62)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Çemişgezek', 1), ('Hozat', 2), ('Mazgirt', 3), ('Merkez', 4), ('Nazımiye', 5),
  ('Ovacık', 6), ('Pertek', 7), ('Pülümür', 8)
) as d(name, sort_order) where c.name = 'Tunceli';

-- ŞANLIURFA (63)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akçakale', 1), ('Birecik', 2), ('Bozova', 3), ('Ceylanpınar', 4), ('Eyyübiye', 5),
  ('Halfeti', 6), ('Haliliye', 7), ('Harran', 8), ('Hilvan', 9), ('Karaköprü', 10),
  ('Siverek', 11), ('Suruç', 12), ('Viranşehir', 13)
) as d(name, sort_order) where c.name = 'Şanlıurfa';

-- UŞAK (64)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Banaz', 1), ('Eşme', 2), ('Karahallı', 3), ('Merkez', 4), ('Sivaslı', 5), ('Ulubey', 6)
) as d(name, sort_order) where c.name = 'Uşak';

-- VAN (65)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bahçesaray', 1), ('Başkale', 2), ('Çaldıran', 3), ('Çatak', 4), ('Edremit', 5),
  ('Erciş', 6), ('Gevaş', 7), ('Gürpınar', 8), ('İpekyolu', 9), ('Muradiye', 10),
  ('Özalp', 11), ('Saray', 12), ('Tuşba', 13)
) as d(name, sort_order) where c.name = 'Van';

-- YOZGAT (66)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akdağmadeni', 1), ('Aydıncık', 2), ('Boğazlıyan', 3), ('Çandır', 4), ('Çayıralan', 5),
  ('Çekerek', 6), ('Kadışehri', 7), ('Merkez', 8), ('Saraykent', 9), ('Sarıkaya', 10),
  ('Sorgun', 11), ('Şefaatli', 12), ('Yenifakılı', 13), ('Yerköy', 14)
) as d(name, sort_order) where c.name = 'Yozgat';

-- ZONGULDAK (67)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Alaplı', 1), ('Çaycuma', 2), ('Devrek', 3), ('Ereğli', 4), ('Gökçebey', 5),
  ('Kilimli', 6), 'Kozlu', 7), ('Merkez', 8)
) as d(name, sort_order) where c.name = 'Zonguldak';

-- AKSARAY (68)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ağaçören', 1), ('Eskil', 2), ('Gülağaç', 3), ('Güzelyurt', 4), ('Merkez', 5),
  ('Ortaköy', 6), ('Sarıyahşi', 7), ('Sultanhanı', 8)
) as d(name, sort_order) where c.name = 'Aksaray';

-- BAYBURT (69)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Aydıntepe', 1), ('Demirözü', 2), ('Merkez', 3)
) as d(name, sort_order) where c.name = 'Bayburt';

-- KARAMAN (70)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Ayrancı', 1), ('Başyayla', 2), ('Ermenek', 3), ('Kazımkarabekir', 4), ('Merkez', 5), ('Sarıveliler', 6)
) as d(name, sort_order) where c.name = 'Karaman';

-- KIRIKKALE (71)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bahşili', 1), ('Balışeyh', 2), ('Çelebi', 3), ('Delice', 4), ('Karakeçili', 5),
  ('Keskin', 6), ('Merkez', 7), ('Sulakyurt', 8), ('Yahşihan', 9)
) as d(name, sort_order) where c.name = 'Kırıkkale';

-- BATMAN (72)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Beşiri', 1), ('Gercüş', 2), ('Hasankeyf', 3), ('Kozluk', 4), ('Merkez', 5), ('Sason', 6)
) as d(name, sort_order) where c.name = 'Batman';

-- ŞIRNAK (73)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Beytüşşebap', 1), ('Cizre', 2), ('Güçlükonak', 3), ('İdil', 4), ('Merkez', 5),
  ('Silopi', 6), ('Uludere', 7)
) as d(name, sort_order) where c.name = 'Şırnak';

-- BARTIN (74)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Amasra', 1), ('Kurucaşile', 2), ('Merkez', 3), ('Ulus', 4)
) as d(name, sort_order) where c.name = 'Bartın';

-- ARDAHAN (75)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Çıldır', 1), ('Damal', 2), ('Göle', 3), ('Hanak', 4), ('Merkez', 5), ('Posof', 6)
) as d(name, sort_order) where c.name = 'Ardahan';

-- IĞDIR (76)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Aralık', 1), ('Karakoyunlu', 2), ('Merkez', 3), ('Tuzluca', 4)
) as d(name, sort_order) where c.name = 'Iğdır';

-- YALOVA (77)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Altınova', 1), ('Armutlu', 2), ('Çınarcık', 3), ('Çiftlikköy', 4), ('Merkez', 5), ('Termal', 6)
) as d(name, sort_order) where c.name = 'Yalova';

-- KARABÜK (78)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Eflani', 1), ('Eskipazar', 2), ('Merkez', 3), ('Ovacık', 4), ('Safranbolu', 5), ('Yenice', 6)
) as d(name, sort_order) where c.name = 'Karabük';

-- KİLİS (79)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Elbeyli', 1), ('Merkez', 2), ('Musabeyli', 3), ('Polateli', 4)
) as d(name, sort_order) where c.name = 'Kilis';

-- OSMANİYE (80)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Bahçe', 1), ('Düziçi', 2), ('Hasanbeyli', 3), ('Kadirli', 4), ('Merkez', 5), ('Sumbas', 6), ('Toprakkale', 7)
) as d(name, sort_order) where c.name = 'Osmaniye';

-- DÜZCE (81)
insert into public.districts (city_id, name, sort_order)
select id, d.name, d.sort_order from public.cities c, (values
  ('Akçakoca', 1), ('Çilimli', 2), ('Cumayeri', 3), ('Gölyaka', 4), ('Gümüşova', 5),
  ('Kaynaşlı', 6), ('Merkez', 7), ('Yığılca', 8)
) as d(name, sort_order) where c.name = 'Düzce';
