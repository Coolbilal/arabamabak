-- fn_assign_listing_no fonksiyonunu SECURITY DEFINER yap
-- CREATE SEQUENCE authenticated session'da calismaz, SECURITY DEFINER ile postgres yetkisiyle calisir
ALTER FUNCTION public.fn_assign_listing_no() SECURITY DEFINER;

-- Tum trigger fonksiyonlarini da guvenli yap (gelecekte olasi sorunlar icin)
ALTER FUNCTION public.fn_auto_premium_auction() SECURITY DEFINER;
ALTER FUNCTION public.trg_vehicles_set_listing_no() SECURITY DEFINER;
ALTER FUNCTION public.update_search_vector() SECURITY DEFINER;
ALTER FUNCTION public.vehicles_edit_reset_trigger() SECURITY DEFINER;
