-- =====================================================
-- Migration 50: Otomatik İlan No Ataması (Yıllık Resetleme)
-- arabamabak - listing_no trigger + per-year sequences
-- =====================================================
-- Bu migration:
--   1) Yıllık sequence'lar (vehicles_listing_no_2026_seq, vb.)
--   2) Trigger: status='active' olduğunda otomatik ata
--   3) Mevcut boş ilanlara numara ata (geriye dönük uyumluluk)
--   4) Index (arama performansı)
-- =====================================================

-- =====================================================
-- 1) MEVCUT YIL İÇİN SEQUENCE OLUŞTUR
-- =====================================================
create sequence if not exists public.vehicles_listing_no_2026_seq;

-- =====================================================
-- 2) TRIGGER FUNCTION
-- Her yıl kendi sequence'ından numara alır
-- Format: ARB-YYYY-NNNNNN (örn: ARB-2026-000001)
-- =====================================================
create or replace function public.fn_assign_listing_no()
returns trigger
language plpgsql
as $$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq_name text := 'public.vehicles_listing_no_' || v_year || '_seq';
  v_next bigint;
begin
  -- İlgili yılın sequence'ı yoksa oluştur (ileride 2027, 2028 için)
  execute format('create sequence if not exists %I start 1', v_seq_name);

  -- Sadece status='active' ve listing_no boşken ata
  if NEW.status = 'active' and (NEW.listing_no is null or NEW.listing_no = '') then
    v_next := nextval(v_seq_name);
    NEW.listing_no := 'ARB-' || v_year || '-' || lpad(v_next::text, 6, '0');
  end if;

  return NEW;
end;
$$;

-- =====================================================
-- 3) TRIGGER (insert + update)
-- =====================================================
drop trigger if exists trg_assign_listing_no on public.vehicles;
create trigger trg_assign_listing_no
  before insert or update on public.vehicles
  for each row execute function public.fn_assign_listing_no();

-- =====================================================
-- 4) MEVCUT BOŞ İLANLARA NUMARA ATA
-- Sadece listing_no null veya boş olan ilanlar
-- Yıl: ilanın created_at yılı
-- =====================================================
do $$
declare
  v_record record;
  v_year text;
  v_seq_name text;
begin
  for v_record in
    select id, created_at
    from public.vehicles
    where listing_no is null or listing_no = ''
  loop
    v_year := to_char(v_record.created_at, 'YYYY');
    v_seq_name := 'public.vehicles_listing_no_' || v_year || '_seq';
    execute format('create sequence if not exists %I start 1', v_seq_name);
    
    update public.vehicles
    set listing_no = 'ARB-' || v_year || '-' || 
                     lpad(nextval(v_seq_name)::text, 6, '0')
    where id = v_record.id;
  end loop;
end $$;

-- =====================================================
-- 5) INDEX (arama performansı)
-- =====================================================
create index if not exists idx_vehicles_listing_no on public.vehicles(listing_no);

-- =====================================================
-- 6) YORUM
-- =====================================================
comment on column public.vehicles.listing_no is 
  'Otomatik atanan ilan numarası. Format: ARB-YYYY-NNNNNN. Yıllık resetleme.';
comment on function public.fn_assign_listing_no() is 
  'Trigger: status=active ve listing_no boşken otomatik ilan no atar (yıllık sequence).';
