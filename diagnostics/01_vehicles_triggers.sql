-- vehicles tablosundaki trigger'lari goster
SELECT tgname, pg_get_triggerdef(oid) AS trigger_def
FROM pg_trigger
WHERE tgrelid = 'public.vehicles'::regclass
AND NOT tgisinternal
ORDER BY tgname;
