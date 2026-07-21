-- Trigger fonksiyonlarinin icerigi
SELECT p.proname AS function_name,
       pg_get_functiondef(p.oid) AS function_def
FROM pg_proc p
WHERE p.proname IN (
  'fn_assign_listing_no',
  'fn_auto_premium_auction',
  'trg_vehicles_set_listing_no',
  'vehicles_edit_reset_trigger',
  'update_search_vector'
)
ORDER BY p.proname;
