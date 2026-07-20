-- Migration 24: Araç tipleri temizleme + yeni tip ekleme
-- Eski tipler: otomobil, suv_pickup, elektrikli, motorsiklet, minivan_panelvan, ticari, kiralik, deniz, hasarli, karavan, klasik, hava, atv, utv, engelli
-- Yeni tipler: otomobil, suv_pickup, elektrikli, minivan_panelvan, ticari, motorsiklet_utv_atv

-- Önce mevcut araçları sil (test temizliği)
delete from public.vehicles;

-- Eski tipleri kaldır, yenilerini güncelle
update public.vehicle_brands set vehicle_type = 'motorsiklet_utv_atv' 
  where vehicle_type in ('motorsiklet', 'atv', 'utv');

-- Kaldırılan tiplere ait markaları sil
delete from public.vehicle_brands 
  where vehicle_type in ('deniz', 'hava', 'kiralik', 'hasarli', 'karavan', 'klasik', 'engelli');

-- Kalan markaları kontrol et
do $$
declare
  v_invalid_count int;
begin
  select count(*) into v_invalid_count from public.vehicle_brands 
    where vehicle_type not in ('otomobil', 'suv_pickup', 'elektrikli', 'minivan_panelvan', 'ticari', 'motorsiklet_utv_atv');
  
  if v_invalid_count > 0 then
    raise warning '% adet geçersiz araç tipi olan marka var, siliniyor', v_invalid_count;
    delete from public.vehicle_brands 
      where vehicle_type not in ('otomobil', 'suv_pickup', 'elektrikli', 'minivan_panelvan', 'ticari', 'motorsiklet_utv_atv');
  end if;
end $$;
