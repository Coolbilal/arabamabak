-- =====================================================
-- Migration 27: Model-Motor İlişkisi
-- Her model için hangi motor hacimleri mevcut
-- =====================================================

-- 1) vehicle_models'a displacements array kolonu ekle
alter table public.vehicle_models
  add column if not exists displacements text[] default null;

create index if not exists idx_vehicle_models_displacements
  on public.vehicle_models using gin(displacements)
  where displacements is not null;

-- 2) Popüler modeller için motor hacimleri ata
-- BMW 3 Serisi
update public.vehicle_models m
set displacements = array['1.5', '2.0', '3.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'BMW' and m.name = '3 Serisi'
  and m.displacements is null;

-- BMW 5 Serisi
update public.vehicle_models m
set displacements = array['2.0', '3.0', '4.4']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'BMW' and m.name = '5 Serisi'
  and m.displacements is null;

-- BMW X3
update public.vehicle_models m
set displacements = array['2.0', '3.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'BMW' and m.name = 'X3'
  and m.displacements is null;

-- BMW X5
update public.vehicle_models m
set displacements = array['3.0', '4.4']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'BMW' and m.name = 'X5'
  and m.displacements is null;

-- Mercedes A Serisi
update public.vehicle_models m
set displacements = array['1.3', '1.6', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Mercedes-Benz' and m.name = 'A Serisi'
  and m.displacements is null;

-- Mercedes C Serisi
update public.vehicle_models m
set displacements = array['1.5', '1.6', '2.0', '3.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Mercedes-Benz' and m.name = 'C Serisi'
  and m.displacements is null;

-- Mercedes GLC
update public.vehicle_models m
set displacements = array['2.0', '3.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Mercedes-Benz' and m.name = 'GLC'
  and m.displacements is null;

-- Audi A3
update public.vehicle_models m
set displacements = array['1.0', '1.4', '1.5', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Audi' and m.name = 'A3'
  and m.displacements is null;

-- Audi A4
update public.vehicle_models m
set displacements = array['1.4', '2.0', '3.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Audi' and m.name = 'A4'
  and m.displacements is null;

-- Audi Q5
update public.vehicle_models m
set displacements = array['2.0', '3.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Audi' and m.name = 'Q5'
  and m.displacements is null;

-- Volkswagen Golf
update public.vehicle_models m
set displacements = array['1.0', '1.4', '1.5', '1.6', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Volkswagen' and m.name = 'Golf'
  and m.displacements is null;

-- Volkswagen Passat
update public.vehicle_models m
set displacements = array['1.4', '1.6', '1.8', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Volkswagen' and m.name = 'Passat'
  and m.displacements is null;

-- Volkswagen Tiguan
update public.vehicle_models m
set displacements = array['1.4', '1.5', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Volkswagen' and m.name = 'Tiguan'
  and m.displacements is null;

-- Ford Focus
update public.vehicle_models m
set displacements = array['1.0', '1.5', '1.6', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Ford' and m.name = 'Focus'
  and m.displacements is null;

-- Ford Kuga
update public.vehicle_models m
set displacements = array['1.5', '2.0', '2.5']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Ford' and m.name = 'Kuga'
  and m.displacements is null;

-- Renault Clio
update public.vehicle_models m
set displacements = array['0.9', '1.0', '1.3', '1.5']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Renault' and m.name = 'Clio'
  and m.displacements is null;

-- Renault Megane
update public.vehicle_models m
set displacements = array['1.3', '1.5', '1.6', '1.8']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Renault' and m.name = 'Megane'
  and m.displacements is null;

-- Renault Captur
update public.vehicle_models m
set displacements = array['1.0', '1.3', '1.5']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Renault' and m.name = 'Captur'
  and m.displacements is null;

-- Hyundai i20
update public.vehicle_models m
set displacements = array['1.0', '1.2', '1.4']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Hyundai' and m.name = 'i20'
  and m.displacements is null;

-- Hyundai Tucson
update public.vehicle_models m
set displacements = array['1.6', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Hyundai' and m.name = 'Tucson'
  and m.displacements is null;

-- Hyundai Ioniq 5
update public.vehicle_models m
set displacements = array['Elektrik']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Hyundai' and m.name = 'Ioniq 5'
  and m.displacements is null;

-- Toyota Corolla
update public.vehicle_models m
set displacements = array['1.6', '1.8', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Toyota' and m.name = 'Corolla'
  and m.displacements is null;

-- Toyota Yaris
update public.vehicle_models m
set displacements = array['1.0', '1.5', '1.6']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Toyota' and m.name = 'Yaris'
  and m.displacements is null;

-- Toyota C-HR
update public.vehicle_models m
set displacements = array['1.2', '1.8', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Toyota' and m.name = 'C-HR'
  and m.displacements is null;

-- Honda Civic
update public.vehicle_models m
set displacements = array['1.0', '1.5', '1.6', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Honda' and m.name = 'Civic'
  and m.displacements is null;

-- Honda HR-V
update public.vehicle_models m
set displacements = array['1.5', '1.8', '2.0']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Honda' and m.name = 'HR-V'
  and m.displacements is null;

-- Togg T10X
update public.vehicle_models m
set displacements = array['Elektrik']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Togg' and m.name = 'T10X'
  and m.displacements is null;

-- Tesla Model 3
update public.vehicle_models m
set displacements = array['Elektrik']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Tesla' and m.name = 'Model 3'
  and m.displacements is null;

-- Tesla Model Y
update public.vehicle_models m
set displacements = array['Elektrik']
from public.vehicle_brands b
where m.brand_id = b.id and b.name = 'Tesla' and m.name = 'Model Y'
  and m.displacements is null;

-- =====================================================
-- Migration tamamlandı
-- =====================================================
