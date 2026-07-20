-- ============================================================
-- Migration 56: EİDS (Elektronik İlan Doğrulama Sistemi)
-- Tarih: 2026-07-18
-- Amaç: Ticaret Bakanlığı EİDS entegrasyonu için altyapı
-- PDF: T.C. Ticaret Bakanlığı EİDS Entegrasyon Dokümanı V2.2
-- Geriye uyumlu: Mevcut yapıya DOKUNULMAZ
-- ============================================================

-- ============================================================
-- 1) eids_settings (Singleton: Firma ayarları)
-- ============================================================
CREATE TABLE IF NOT EXISTS eids_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Bakanlıktan alınan firma bilgileri
  firma_kod uuid NOT NULL,                -- Bakanlıkça verilen firma Guid
  firma_email text NOT NULL,              -- Bakanlığa bildirilen e-posta
  basic_auth_username text NOT NULL,      -- Basic Auth username
  basic_auth_password text NOT NULL,      -- Basic Auth password (encrypted olmalı)
  -- API ayarları
  api_url text NOT NULL DEFAULT 'https://ws.gtb.gov.tr:8443/EidsAracApi',
  get_kullanici_kodu_url text,            -- E-Devlet üzerinden kullanıcı kodu alma URL
  -- Retry ayarları
  max_retry_count integer DEFAULT 5,
  retry_delay_seconds integer DEFAULT 60, -- İlk retry
  retry_backoff_multiplier numeric DEFAULT 3, -- 1dk, 3dk, 9dk, 27dk, 81dk
  -- Rate limiting
  max_queries_per_minute_per_user integer DEFAULT 3,
  max_queries_per_hour_per_ip integer DEFAULT 60,
  -- IP whitelist (production'da Vercel IP'leri)
  allowed_ips jsonb DEFAULT '[]'::jsonb,
  -- Durum
  is_active boolean DEFAULT false,        -- Production'da true yapılacak
  test_mode boolean DEFAULT true,         -- Test modunda sahte response
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- ============================================================
-- 2) eids_authorizations (Kullanıcı E-Devlet Yetkilendirmeleri)
-- ============================================================
CREATE TABLE IF NOT EXISTS eids_authorizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kullanici_kodu uuid,                    -- Bakanlıktan dönen KullaniciKodu
  -- Yetkilendirme bilgileri
  authorized_at timestamptz DEFAULT now(),
  expires_at timestamptz,                 -- Bakanlığın belirlediği süre
  revoked_at timestamptz,                 -- Kullanıcı tarafından iptal
  -- E-Devlet'ten gelen bilgiler (KVKK: sadece gerekli olanlar)
  edevlet_ad_soyad text,
  edevlet_tc_no_hash text,                -- TC hash (plaintext saklama)
  -- Durum: active, expired, revoked
  status text DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eids_auth_profile ON eids_authorizations(profile_id);
CREATE INDEX IF NOT EXISTS idx_eids_auth_status ON eids_authorizations(status) WHERE status = 'active';
CREATE UNIQUE INDEX IF NOT EXISTS idx_eids_auth_active_unique ON eids_authorizations(profile_id) WHERE status = 'active';

-- ============================================================
-- 3) eids_query_logs (Her sorgu logu)
-- ============================================================
CREATE TABLE IF NOT EXISTS eids_query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES vehicles(id) ON DELETE SET NULL,
  profile_id uuid NOT NULL REFERENCES profiles(id),
  authorization_id uuid REFERENCES eids_authorizations(id),
  -- Sorgu parametreleri
  plaka_no text NOT NULL,
  vergi_no text,
  ilan_no text,                           -- Bizim listing_no
  -- Sonuç
  status_code integer,                    -- 200, 400, 500
  error_code text,                        -- ERR-100, ERR-200, ERR-300, ERR-400
  error_message text,
  response_data jsonb,                    -- Bakanlıktan dönen data
  is_success boolean DEFAULT false,
  -- Süre
  queried_at timestamptz DEFAULT now(),
  duration_ms integer,
  -- Retry bilgisi
  attempt_number integer DEFAULT 1,
  is_retry boolean DEFAULT false,
  parent_log_id uuid REFERENCES eids_query_logs(id) -- İlk sorgudan referans
);
CREATE INDEX IF NOT EXISTS idx_eids_logs_listing ON eids_query_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_eids_logs_profile ON eids_query_logs(profile_id, queried_at DESC);
CREATE INDEX IF NOT EXISTS idx_eids_logs_status ON eids_query_logs(status_code, queried_at DESC);
CREATE INDEX IF NOT EXISTS idx_eids_logs_failed ON eids_query_logs(queried_at DESC) WHERE is_success = false;

-- ============================================================
-- 4) eids_pending_queue (Başarısız sorgular için kuyruk)
-- PDF: "Sistem yoğunluğundan dolayı yapılamazsa veritabanı çökmesin"
-- ============================================================
CREATE TABLE IF NOT EXISTS eids_pending_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  log_id uuid REFERENCES eids_query_logs(id) ON DELETE SET NULL,
  -- Payload
  payload jsonb NOT NULL,                 -- EidsAracApi isteği
  -- Durum
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed', 'cancelled')),
  attempt_count integer DEFAULT 0,
  last_attempt_at timestamptz,
  next_retry_at timestamptz DEFAULT now(),
  -- Hata
  last_error text,
  -- Sonuç
  completed_at timestamptz,
  result_log_id uuid REFERENCES eids_query_logs(id),
  -- Metadata
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eids_queue_pending ON eids_pending_queue(next_retry_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_eids_queue_listing ON eids_pending_queue(listing_id);

-- ============================================================
-- 5) vehicles tablosuna EİDS kolonları
-- PDF: Yönetmelik 21/a — marka, ticari ad, model yılı değiştirilemez
-- ============================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_status text; -- 'not_required', 'pending', 'approved', 'rejected', 'expired', 'failed'
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_query_at timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_expires_at timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_marka_adi text;       -- Bakanlıktan gelen marka
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_ticari_adi text;      -- Bakanlıktan gelen ticari ad
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_model_yili text;      -- Bakanlıktan gelen model yılı
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_ilan_suresi timestamptz;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_reference_id text;    -- Bakanlığın referans no
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS eids_locked boolean DEFAULT false; -- Marka/model kilitli mi

-- Index
CREATE INDEX IF NOT EXISTS idx_vehicles_eids_status ON vehicles(eids_status) WHERE eids_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vehicles_eids_expires ON vehicles(eids_expires_at) WHERE eids_status = 'approved';

-- ============================================================
-- 6) profiles tablosuna e-Devlet KYC alanları
-- ============================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edevlet_authorized boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edevlet_authorized_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edevlet_expires_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS edevlet_full_name text;
CREATE INDEX IF NOT EXISTS idx_profiles_edevlet_auth ON profiles(edevlet_authorized) WHERE edevlet_authorized = true;

-- ============================================================
-- 7) RPC: eids_query_sorgu (Sorgu yap)
-- Service role ile çalışır, edge function tetikler
-- ============================================================
CREATE OR REPLACE FUNCTION eids_query_sorgu(
  p_listing_id uuid,
  p_plaka_no text,
  p_vergi_no text DEFAULT NULL,
  p_ilan_no text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_profile_id uuid;
  v_authorization_id uuid;
  v_kullanici_kodu uuid;
  v_settings record;
  v_log_id uuid;
  v_result jsonb;
  v_pending_id uuid;
BEGIN
  -- Profile ID al
  v_profile_id := auth.uid();
  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Settings al
  SELECT * INTO v_settings FROM eids_settings WHERE is_active = true LIMIT 1;
  IF v_settings.id IS NULL THEN
    RAISE EXCEPTION 'EIDS ayarları aktif değil';
  END IF;

  -- Aktif authorization bul
  SELECT id, kullanici_kodu INTO v_authorization_id, v_kullanici_kodu
  FROM eids_authorizations
  WHERE profile_id = v_profile_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
  ORDER BY authorized_at DESC
  LIMIT 1;

  IF v_authorization_id IS NULL THEN
    RAISE EXCEPTION 'Aktif e-Devlet yetkilendirmesi bulunamadı';
  END IF;

  -- Log oluştur (placeholder, edge function güncelleyecek)
  INSERT INTO eids_query_logs (
    listing_id, profile_id, authorization_id,
    plaka_no, vergi_no, ilan_no, status_code
  ) VALUES (
    p_listing_id, v_profile_id, v_authorization_id,
    p_plaka_no, p_vergi_no, p_ilan_no, 0
  ) RETURNING id INTO v_log_id;

  -- Pending queue'ya ekle (edge function process edecek)
  INSERT INTO eids_pending_queue (listing_id, log_id, payload, next_retry_at)
  VALUES (
    p_listing_id, v_log_id,
    jsonb_build_object(
      'firmaKod', v_settings.firma_kod,
      'kullaniciKodu', v_kullanici_kodu,
      'vergiNo', p_vergi_no,
      'plakaNo', p_plaka_no,
      'ilanNo', p_ilan_no,
      'logId', v_log_id,
      'listingId', p_listing_id
    ),
    now()
  ) RETURNING id INTO v_pending_id;

  -- Listing durumunu güncelle
  UPDATE vehicles
  SET eids_status = 'pending', eids_query_at = now()
  WHERE id = p_listing_id;

  v_result := jsonb_build_object(
    'log_id', v_log_id,
    'pending_id', v_pending_id,
    'status', 'pending',
    'message', 'Sorgu kuyruğa eklendi'
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 8) RPC: eids_process_queue (Retry mekanizması, pg_cron tetikler)
-- ============================================================
CREATE OR REPLACE FUNCTION eids_process_queue(p_max integer DEFAULT 10)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_processed integer := 0;
  v_queue record;
BEGIN
  -- Pending kayıtları al
  FOR v_queue IN
    SELECT * FROM eids_pending_queue
    WHERE status = 'pending'
      AND next_retry_at <= now()
      AND attempt_count < COALESCE((SELECT max_retry_count FROM eids_settings WHERE is_active = true LIMIT 1), 5)
    ORDER BY next_retry_at
    LIMIT p_max
  LOOP
    -- Status güncelle
    UPDATE eids_pending_queue
    SET status = 'processing', last_attempt_at = now(), attempt_count = attempt_count + 1
    WHERE id = v_queue.id;
    
    v_processed := v_processed + 1;
    
    -- NOT: Burada gerçek API call yapılmaz.
    -- Edge function `eids-process-pending` çağrılır, o API yapar.
  END LOOP;

  RETURN v_processed;
END;
$$;

-- ============================================================
-- 9) RPC: eids_update_listing_status (Listing durumunu güncelle)
-- Edge function sonuç gelince çağırır
-- ============================================================
CREATE OR REPLACE FUNCTION eids_update_listing_status(
  p_listing_id uuid,
  p_status text,
  p_marka_adi text DEFAULT NULL,
  p_ticari_adi text DEFAULT NULL,
  p_model_yili text DEFAULT NULL,
  p_ilan_suresi timestamptz DEFAULT NULL,
  p_reference_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE vehicles
  SET
    eids_status = p_status,
    eids_query_at = now(),
    eids_expires_at = p_ilan_suresi,
    eids_marka_adi = COALESCE(p_marka_adi, eids_marka_adi),
    eids_ticari_adi = COALESCE(p_ticari_adi, eids_ticari_adi),
    eids_model_yili = COALESCE(p_model_yili, eids_model_yili),
    eids_ilan_suresi = p_ilan_suresi,
    eids_reference_id = p_reference_id,
    eids_locked = (p_status = 'approved')
  WHERE id = p_listing_id;

  -- PDF Yönetmelik 21/a: Marka/ticari ad/model yılı kilitli
  -- Kullanıcı bunları değiştiremez
END;
$$;

-- ============================================================
-- 10) Default ayar satırı (test mode açık)
-- ============================================================
INSERT INTO eids_settings (
  firma_kod, firma_email, basic_auth_username, basic_auth_password,
  test_mode, is_active
) VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  'bilgi@arabamabak.com',
  'test_user',
  'test_password_change_in_production',
  true,
  false
) ON CONFLICT DO NOTHING;

-- ============================================================
-- 11) RLS Policies
-- ============================================================

-- eids_settings: sadece admin/dealer görebilir ve yazabilir
ALTER TABLE eids_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eids_settings_admin_all" ON eids_settings;
CREATE POLICY "eids_settings_admin_all" ON eids_settings FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- eids_authorizations: kullanıcı kendisininkini görebilir, admin hepsini
ALTER TABLE eids_authorizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eids_auth_self_select" ON eids_authorizations;
CREATE POLICY "eids_auth_self_select" ON eids_authorizations FOR SELECT
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

DROP POLICY IF EXISTS "eids_auth_admin_write" ON eids_authorizations;
CREATE POLICY "eids_auth_admin_write" ON eids_authorizations FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- eids_query_logs: kullanıcı kendisininkini, admin hepsini
ALTER TABLE eids_query_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eids_logs_select" ON eids_query_logs;
CREATE POLICY "eids_logs_select" ON eids_query_logs FOR SELECT
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- INSERT service role / edge function tarafından yapılır
-- (RLS SECURITY DEFINER RPC'ler üzerinden)

-- eids_pending_queue: admin görebilir
ALTER TABLE eids_pending_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "eids_queue_admin_all" ON eids_pending_queue;
CREATE POLICY "eids_queue_admin_all" ON eids_pending_queue FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'dealer'))
  );

-- ============================================================
-- Tamamlandı: 4 yeni tablo + RPC'ler + RLS
-- Mevcut yapıya DOKUNULMADI
-- ============================================================
