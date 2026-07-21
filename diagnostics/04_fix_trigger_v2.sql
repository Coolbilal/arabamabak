-- fn_assign_listing_no'yu yeniden olustur, SECURITY DEFINER ile
-- Mevcut kod korunuyor, sadece SECURITY ekleniyor
CREATE OR REPLACE FUNCTION public.fn_assign_listing_no()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
declare
  v_year text := to_char(now(), 'YYYY');
  v_seq_name text := 'public.vehicles_listing_no_' || v_year || '_seq';
  v_next bigint;
begin
  execute format('create sequence if not exists %I start 1', v_seq_name);
  if NEW.status = 'active' and (NEW.listing_no is null or NEW.listing_no = '') then
    v_next := nextval(v_seq_name);
    NEW.listing_no := 'ARB-' || v_year || '-' || lpad(v_next::text, 6, '0');
  end if;
  return NEW;
end;
$function$;

-- Diger trigger fonksiyonlarini da SECURITY DEFINER yap
ALTER FUNCTION public.fn_auto_premium_auction() SECURITY DEFINER;
ALTER FUNCTION public.trg_vehicles_set_listing_no() SECURITY DEFINER;
ALTER FUNCTION public.update_search_vector() SECURITY DEFINER;
ALTER FUNCTION public.vehicles_edit_reset_trigger() SECURITY DEFINER;
