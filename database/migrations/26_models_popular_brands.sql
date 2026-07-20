-- Migration 26: Popüler Markaların Modelleri
-- En çok satan markalar için modeller (Türkiye piyasası)

-- BMW
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('1 Serisi', 1), ('2 Serisi', 2), ('3 Serisi', 3), ('4 Serisi', 4), ('5 Serisi', 5),
  ('6 Serisi', 6), ('7 Serisi', 7), ('8 Serisi', 8), ('i3', 9), ('i4', 10),
  ('i7', 11), ('M3', 12), ('M4', 13), ('M5', 14), ('Z4', 15)
) as m(name, sort_order)
where b.name = 'BMW' and b.vehicle_type = 'otomobil';

-- Mercedes-Benz
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('A Serisi', 1), ('B Serisi', 2), ('C Serisi', 3), ('CLA', 4), ('CLS', 5),
  ('E Serisi', 6), ('EQC', 7), ('EQE', 8), ('EQS', 9), ('G Serisi', 10),
  ('GLA', 11), ('GLB', 12), ('GLC', 13), ('GLE', 14), ('GLS', 15),
  ('S Serisi', 16), ('SL', 17), ('SLC', 18), ('Vito', 19), ('AMG GT', 20)
) as m(name, sort_order)
where b.name = 'Mercedes-Benz' and b.vehicle_type = 'otomobil';

-- Audi
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('A1', 1), ('A3', 2), ('A4', 3), ('A5', 4), ('A6', 5),
  ('A7', 6), ('A8', 7), ('e-tron', 8), ('Q2', 9), ('Q3', 10),
  ('Q4 e-tron', 11), ('Q5', 12), ('Q7', 13), ('Q8', 14), ('RS3', 15),
  ('RS6', 16), ('S3', 17), ('S5', 18), ('TT', 19)
) as m(name, sort_order)
where b.name = 'Audi' and b.vehicle_type = 'otomobil';

-- Volkswagen
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Arteon', 1), ('Bora', 2), ('Caddy', 3), ('Golf', 4), ('ID.3', 5),
  ('ID.4', 6), ('ID.5', 7), ('Jetta', 8), ('Passat', 9), ('Polo', 10),
  ('Scirocco', 11), ('T-Cross', 12), ('T-Roc', 13), ('Tiguan', 14), ('Touran', 15),
  ('Up', 16)
) as m(name, sort_order)
where b.name = 'Volkswagen' and b.vehicle_type = 'otomobil';

-- Toyota
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Auris', 1), ('Avensis', 2), ('Aygo', 3), ('C-HR', 4), ('Camry', 5),
  ('Corolla', 6), ('GT86', 7), ('Hilux', 8), ('Land Cruiser', 9), ('Prius', 10),
  ('Proace', 11), ('RAV4', 12), ('Supra', 13), ('Yaris', 14), ('bZ4X', 15)
) as m(name, sort_order)
where b.name = 'Toyota' and b.vehicle_type = 'otomobil';

-- Renault
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Captur', 1), ('Clio', 2), ('Espace', 3), ('Fluence', 4), ('Grand Scenic', 5),
  ('Kadjar', 6), ('Kangoo', 7), ('Koleos', 8), ('Laguna', 9), ('Latitude', 10),
  ('Megane', 11), ('Modus', 12), ('Safrane', 13), ('Scenic', 14), ('Symbol', 15),
  ('Talisman', 16), ('Twingo', 17), ('Twizy', 18), ('ZOE', 19)
) as m(name, sort_order)
where b.name = 'Renault' and b.vehicle_type = 'otomobil';

-- Ford
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('B-Max', 1), ('C-Max', 2), ('EcoSport', 3), ('Edge', 4), ('Escort', 5),
  ('Fiesta', 6), ('Focus', 7), ('Fusion', 8), ('Galaxy', 9), ('Ka', 10),
  ('Kuga', 11), ('Mondeo', 12), ('Mustang', 13), ('Puma', 14), ('Ranger', 15),
  ('S-Max', 16), ('Tourneo', 17), ('Transit', 18)
) as m(name, sort_order)
where b.name = 'Ford' and b.vehicle_type = 'otomobil';

-- Hyundai
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Accent', 1), ('Bayon', 2), ('Elantra', 3), ('Getz', 4), ('i10', 5),
  ('i20', 6), ('i30', 7), ('Ioniq', 8), ('Ioniq 5', 9), ('Kona', 10),
  ('Matrix', 11), ('Santa Fe', 12), ('Sonata', 13), ('Tucson', 14), ('Veloster', 15)
) as m(name, sort_order)
where b.name = 'Hyundai' and b.vehicle_type = 'otomobil';

-- Honda
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Accord', 1), ('Civic', 2), ('CR-V', 3), ('CR-Z', 4), ('e', 5),
  ('HR-V', 6), ('Insight', 7), ('Jazz', 8), ('Legend', 9), ('NSX', 10)
) as m(name, sort_order)
where b.name = 'Honda' and b.vehicle_type = 'otomobil';

-- Fiat
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('124 Spider', 1), ('500', 2), ('500L', 3), ('500X', 4), ('Albea', 5),
  ('Bravo', 6), ('Doblo', 7), ('Ducato', 8), ('Egea', 9), ('Fiorino', 10),
  ('Freemont', 11), ('Linea', 12), ('Marea', 13), ('Palio', 14), ('Panda', 15),
  ('Punto', 16), ('Qubo', 17), ('Scudo', 18), ('Sedici', 19), ('Stilo', 20),
  ('Tipo', 21), ('Uno', 22)
) as m(name, sort_order)
where b.name = 'Fiat' and b.vehicle_type = 'otomobil';

-- Opel
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Adam', 1), ('Astra', 2), ('Corsa', 3), ('Crossland', 4), ('Grandland', 5),
  ('Insignia', 6), ('Karl', 7), ('Meriva', 8), ('Mokka', 9), ('Vectra', 10),
  ('Zafira', 11), ('Combo', 12), ('Vivaro', 13)
) as m(name, sort_order)
where b.name = 'Opel' and b.vehicle_type = 'otomobil';

-- Peugeot
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('106', 1), ('107', 2), ('108', 3), ('2008', 4), ('206', 5),
  ('207', 6), ('208', 7), ('3008', 8), ('301', 9), ('307', 10),
  ('308', 11), ('4007', 12), ('4008', 13), ('407', 14), ('408', 15),
  ('5008', 16), ('508', 17), ('Partner', 18), ('Rifter', 19), ('RCZ', 20)
) as m(name, sort_order)
where b.name = 'Peugeot' and b.vehicle_type = 'otomobil';

-- Citroen
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Berlingo', 1), ('C1', 2), ('C3', 3), ('C3 Aircross', 4), ('C4', 5),
  ('C4 Cactus', 6), ('C4 Picasso', 7), ('C5', 8), ('C5 Aircross', 9), ('C-Elysee', 10),
  ('DS3', 11), ('DS4', 12), ('DS5', 13), ('SpaceTourer', 14)
) as m(name, sort_order)
where b.name = 'Citroen' and b.vehicle_type = 'otomobil';

-- Kia
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Ceed', 1), ('Cerato', 2), ('EV6', 3), ('Niro', 4), ('Optima', 5),
  ('Picanto', 6), ('ProCeed', 7), ('Rio', 8), ('Sorento', 9), ('Soul', 10),
  ('Sportage', 11), ('Stinger', 12), ('Stonic', 13), ('Venga', 14), ('XCeed', 15)
) as m(name, sort_order)
where b.name = 'Kia' and b.vehicle_type = 'otomobil';

-- Skoda
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Citigo', 1), ('Enyaq', 2), ('Fabia', 3), ('Kamiq', 4), ('Karoq', 5),
  ('Kodiaq', 6), ('Octavia', 7), ('Rapid', 8), ('Scala', 9), ('Superb', 10), ('Yeti', 11)
) as m(name, sort_order)
where b.name = 'Skoda' and b.vehicle_type = 'otomobil';

-- Seat
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Alhambra', 1), ('Arona', 2), ('Ateca', 3), ('Cordoba', 4), ('Ibiza', 5),
  ('Leon', 6), ('Mii', 7), ('Tarraco', 8), ('Toledo', 9)
) as m(name, sort_order)
where b.name = 'Seat' and b.vehicle_type = 'otomobil';

-- Dacia
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Dokker', 1), ('Duster', 2), ('Jogger', 3), ('Lodgy', 4), ('Logan', 5), ('Sandero', 6), ('Spring', 7)
) as m(name, sort_order)
where b.name = 'Dacia' and b.vehicle_type = 'otomobil';

-- Nissan
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('370Z', 1), ('Ariya', 2), ('GT-R', 3), ('Juke', 4), ('Leaf', 5),
  ('Micra', 6), ('Note', 7), ('NV200', 8), ('Pulsar', 9), ('Qashqai', 10),
  ('X-Trail', 11)
) as m(name, sort_order)
where b.name = 'Nissan' and b.vehicle_type = 'otomobil';

-- Suzuki
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('Across', 1), ('Alto', 2), ('Baleno', 3), ('Celerio', 4), ('Grand Vitara', 5),
  ('Ignis', 6), ('Jimny', 7), ('S-Cross', 8), ('Swift', 9), ('SX4', 10), ('Vitara', 11)
) as m(name, sort_order)
where b.name = 'Suzuki' and b.vehicle_type = 'otomobil';

-- Mazda
insert into public.vehicle_models (brand_id, name, sort_order)
select b.id, m.name, m.sort_order
from public.vehicle_brands b
cross join (values
  ('2', 1), ('3', 2), ('5', 3), ('6', 4), ('CX-3', 5),
  ('CX-30', 6), ('CX-5', 7), ('CX-60', 8), ('CX-9', 9), ('MX-30', 10), ('MX-5', 11)
) as m(name, sort_order)
where b.name = 'Mazda' and b.vehicle_type = 'otomobil';
