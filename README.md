# arabamabak - Türk Araba Mezat Sitesi

Türkiye'nin en kapsamlı açık arttırma + ücretsiz ilan platformu.

## 📁 Klasör Yapısı

```
arabamabak/
├── admin/        # Admin paneli (React + Vite + TS) → port 5174
├── frontend/     # Kullanıcı sitesi (React + Vite + TS) → port 5173
└── database/     # Supabase SQL dosyaları
    ├── schema.sql                    # Tüm tablolar, enum'lar, RLS, trigger'lar
    ├── seed_vehicle_models.sql       # 49 marka + 564+ model
    ├── seed_cities_districts.sql     # 81 il + 975 ilçe
    └── seed_engine_sizes.sql         # 55+ motor hacmi
```

## 🚀 Kurulum

```bash
# Her klasör için
cd admin && npm install
cd ../frontend && npm install

# Çalıştır
cd admin && npm run dev      # http://localhost:5174
cd frontend && npm run dev   # http://localhost:5173
```

## 🗄️ Veritabanı Kurulumu (Sırasıyla)

1. Supabase SQL Editor'de (sırayla):
   - `database/schema.sql` (önce tüm yapı)
   - `database/seed_vehicle_models.sql`
   - `database/seed_cities_districts.sql`
   - `database/seed_engine_sizes.sql`

2. **Ek kolonlar (auction lifecycle)** — ayrı SQL:
   ```sql
   ALTER TABLE public.auctions ALTER COLUMN start_at DROP NOT NULL;
   ALTER TABLE public.auctions ALTER COLUMN end_at DROP NOT NULL;
   ALTER TABLE public.auctions ALTER COLUMN start_at SET DEFAULT '2099-12-31T00:00:00Z';
   ALTER TABLE public.auctions ALTER COLUMN end_at SET DEFAULT '2099-12-31T00:00:00Z';
   ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS duration_minutes int NOT NULL DEFAULT 30;
   ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS live_started_at timestamptz;
   ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS live_ends_at timestamptz;
   ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS ended_at timestamptz;
   ALTER TABLE public.auctions ADD COLUMN IF NOT EXISTS final_price numeric(12,2);
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sold_at timestamptz;
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS final_price numeric(12,2);
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES public.profiles(id);
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.admin_users(id);
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rejection_reason text;
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS approved_at timestamptz;
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.admin_users(id);
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rejected_at timestamptz;
   ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES public.admin_users(id);
   ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS auction_default_duration_minutes int NOT NULL DEFAULT 30;
   ALTER TABLE public.site_settings ADD COLUMN IF NOT EXISTS auction_countdown_refresh_ms int NOT NULL DEFAULT 50;
   ```

3. **payment_methods tablosu** — ayrı SQL:
   ```sql
   create table if not exists public.payment_methods (
     id uuid primary key default uuid_generate_v4(),
     name text not null, code text unique not null, type text not null,
     is_active boolean not null default true, is_default boolean not null default false,
     sort_order int not null default 0, icon text,
     config jsonb not null default '{}'::jsonb,
     fee_percent numeric(5,2) not null default 0,
     fee_fixed numeric(10,2) not null default 0,
     description text, created_at timestamptz not null default now(),
     updated_at timestamptz not null default now()
   );
   -- 3 default yöntemi ekle...
   ```

4. **tick_auction_lifecycle fonksiyonu** — ayrı SQL:
   ```sql
   CREATE OR REPLACE FUNCTION public.tick_auction_lifecycle() RETURNS void
   LANGUAGE plpgsql SECURITY DEFINER AS $$
   DECLARE rec RECORD; last_bid RECORD;
   BEGIN
     -- scheduled → live
     FOR rec IN SELECT a.id, a.duration_minutes FROM public.auctions a
       WHERE a.status = 'scheduled' AND a.start_at <= now() LOOP
       UPDATE public.auctions SET status = 'live', live_started_at = now(),
         live_ends_at = now() + (rec.duration_minutes || ' minutes')::interval
       WHERE id = rec.id;
     END LOOP;
     -- live → ended + sold
     FOR rec IN SELECT a.id, a.vehicle_id, a.current_price FROM public.auctions a
       WHERE a.status = 'live' AND a.live_ends_at IS NOT NULL AND a.live_ends_at <= now() LOOP
       SELECT * INTO last_bid FROM public.bids WHERE auction_id = rec.id
         ORDER BY amount DESC, created_at DESC LIMIT 1;
       UPDATE public.auctions SET status = 'ended', ended_at = now(),
         winner_id = last_bid.bidder_id, final_price = COALESCE(last_bid.amount, rec.current_price)
       WHERE id = rec.id;
       IF last_bid.bidder_id IS NOT NULL THEN
         UPDATE public.vehicles SET status = 'sold', sold_at = now(),
           final_price = last_bid.amount, winner_id = last_bid.bidder_id
         WHERE id = rec.vehicle_id;
       ELSE
         UPDATE public.vehicles SET status = 'expired', final_price = rec.current_price
         WHERE id = rec.vehicle_id;
       END IF;
     END LOOP;
   END;
   $$;
   ```

5. **RLS DELETE policy** (vehicles):
   ```sql
   CREATE POLICY vehicles_seller_delete ON public.vehicles FOR DELETE
     USING (seller_id = auth.uid() OR public.is_admin(auth.uid()));
   ```

6. **Storage buckets** (Supabase Dashboard → Storage → New bucket):
   - `site-assets`, `vehicle-images`, `avatars`, `expertise-reports`, `dealership-logos`
   - Public = ON

7. **`handle_new_user` trigger** (yeni kullanıcılar için profil):
   ```sql
   create or replace function public.handle_new_user() returns trigger
   as $$ begin
     insert into public.profiles (id, email, full_name, role, email_verified_at, wallet_balance)
     values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'user', new.email_confirmed_at, 1000)
     on conflict (id) do nothing;
     return new;
   end; $$ language plpgsql security definer;
   create trigger on_auth_user_created after insert on auth.users
     for each row execute function public.handle_new_user();
   ```

## 🔐 Environment Variables

`frontend/src/lib/supabase.ts` ve `admin/src/lib/supabase.ts`:
```
VITE_SUPABASE_URL=https://cvfoufneshgqebynbxsc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

## 👤 İlk Admin Kullanıcısı

1. Frontend'de `/kayit` ile kayıt ol
2. Supabase SQL Editor'de:
   ```sql
   INSERT INTO public.admin_users (user_id, username, full_name, is_active, is_super_admin)
   SELECT id, 'admin', 'Site Yöneticisi', true, true
   FROM auth.users WHERE email = 'senin@email.com';
   UPDATE public.profiles SET role='admin', wallet_balance=10000
   WHERE id = (SELECT id FROM auth.users WHERE email = 'senin@email.com');
   ```
3. Admin panelde `/giris` ile giriş yap

## 🎯 Özellikler

### Kullanıcı Tarafı
- ✅ Kayıt / Giriş (Supabase Auth)
- ✅ Marka / Model / Motor Hacmi cascading dropdown
- ✅ 7 adımlı ilan verme sihirbazı (foto yükleme, konum, vs.)
- ✅ Ücretsiz ilan + Açık Arttırma + Premium Açık Arttırma
- ✅ Cüzdan, Kredi Kartı (3D Secure simülasyonu), Havale ödeme yöntemleri
- ✅ Açık arttırma teklif verme (kronometre dahil)
- ✅ Favori, mesaj, profil, cüzdan yönetimi
- ✅ Filtreler (marka, model, yıl, km, fiyat, yakıt, vites, kasa, motor, şehir, hasar)
- ✅ `/muzayedeler` 3 sekme: Canlı / Çıkacak / Satılanlar
- ✅ `/kategori/:cat` filtreli kategori sayfaları

### Admin Tarafı
- ✅ Dashboard (istatistikler)
- ✅ **Onay Merkezi** (pending → incele → onayla+slot / reddet)
- ✅ **Açık Arttırma Başvuruları** (vehicles'tan)
- ✅ **Açık Arttırmaya Çıkacaklar** (scheduled, slot atanmamış)
- ✅ **Devam Eden Açık Arttırmalar** (live, salise kronometresi)
- ✅ **Satılan Araçlar** (24 saat sonra kaybolur)
- ✅ Ücretsiz İlanlar
- ✅ Slot Yönetimi (tarih/saat aralığı, max araç)
- ✅ Site Ayarları (logo, renkler, ücretler, **mezat süresi**)
- ✅ Ödeme Yöntemleri Yönetimi (iyzico config, IBAN)
- ✅ Kullanıcılar, Bayilikler, İşlem Geçmişi, Yetkilendirme
- ✅ ErrorBoundary (modal hatalarını yakalar)

### Veritabanı
- 19+ tablo, 11+ enum
- 5 storage bucket
- RLS policies (kullanıcı kendi verisini görebilir, admin her şeyi)
- Trigger'lar: `handle_new_user`, `touch_updated_at`, `on_new_bid`, `on_favorite_change`
- `tick_auction_lifecycle()` fonksiyonu (cron ile veya manuel çağrılır)
- Yardımcı fonksiyonlar: `is_admin`, `is_super_admin`

## 📝 Notlar

- `vehicle_brands` (49), `vehicle_models` (564+), `cities` (81), `districts` (975+), `engine_sizes` (55+) tabloları seed'lendi
- `wallet_balance` başlangıç değeri 1000 TL (yeni kullanıcılar için)
- 3D Secure demo: OTP `123456` kabul edilir
- `pg_cron` extension kuruluysa `tick_auction_lifecycle` her dakika otomatik çalışır; yoksa admin panelde "Kontrol Et" butonu var
- Soft delete: `vehicles.deleted_at` set edilince RLS gizler
- Cascade delete: vehicle sil → images, auctions, bids, favorites hepsi silinir; transactions korunur

## 🔗 Canlı Linkler

- Frontend: https://f2psdafqxu9l.space.minimax.io
- Admin: https://6fupnkotimse.space.minimax.io
EOF
echo "README yazıldı"