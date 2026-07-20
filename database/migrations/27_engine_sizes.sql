-- Migration 27: Motor Hacimleri (Otomobil + Motorsiklet)
-- Otomobil için 1.0 - 6.0 litre, Motorsiklet için 50cc - 1800cc

delete from public.engine_sizes;

-- OTOMOBİL motor hacimleri
insert into public.engine_sizes (displacement, sort_order) values
  ('1.0', 1),
  ('1.2', 2),
  ('1.3', 3),
  ('1.4', 4),
  ('1.5', 5),
  ('1.6', 6),
  ('1.8', 7),
  ('1.9', 8),
  ('2.0', 9),
  ('2.2', 10),
  ('2.3', 11),
  ('2.4', 12),
  ('2.5', 13),
  ('2.7', 14),
  ('2.8', 15),
  ('3.0', 16),
  ('3.2', 17),
  ('3.5', 18),
  ('3.6', 19),
  ('3.8', 20),
  ('4.0', 21),
  ('4.4', 22),
  ('4.6', 23),
  ('5.0', 24),
  ('5.5', 25),
  ('6.0', 26);

-- MOTORSİKLET motor hacimleri (cc)
insert into public.engine_sizes (displacement, sort_order) values
  ('50 cc', 50),
  ('125 cc', 51),
  ('150 cc', 52),
  ('200 cc', 53),
  ('250 cc', 54),
  ('300 cc', 55),
  ('400 cc', 56),
  ('500 cc', 57),
  ('600 cc', 58),
  ('650 cc', 59),
  ('700 cc', 60),
  ('750 cc', 61),
  ('800 cc', 62),
  ('900 cc', 63),
  ('1000 cc', 64),
  ('1100 cc', 65),
  ('1200 cc', 66),
  ('1300 cc', 67),
  ('1400 cc', 68),
  ('1500 cc', 69),
  ('1600 cc', 70),
  ('1800 cc', 71);
