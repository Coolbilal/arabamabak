# arabamabak — Veritabanı Migration Rehberi

> **Bu klasördeki SQL'ler Supabase'e sırayla uygulanmalıdır.**

## 📋 Kurulum Adımları

### 1) Supabase Dashboard'a git
- https://supabase.com/dashboard
- Projeni seç: `xfcxrbnnesliflwwejwh`
- Sol menüden **SQL Editor** aç

### 2) Migration'ları sırayla çalıştır
Her migration'ı **ayrı query** olarak yapıştır ve **Run** bas:

```
01_extensions_and_enums.sql         → Extensions + 22 enum
02_reference_tables.sql             → cities, districts, engine_sizes, categories, brands, models
03_users_and_admins.sql            → profiles, admin_users, admin_permissions, admin_activity_logs
04_site_config.sql                 → site_settings + site_themes + site_logos
05_vehicles.sql                    → vehicles, vehicle_images, vehicle_views
06_dealerships.sql                 → dealerships + expertise_dealerships
07_valets.sql                      → expert_valets + valet_ratings
08_auctions.sql                    → auctions + auction_slots + bids
09_seat_system.sql                 → auction_seat_holds + auction_seat_transactions
10_expertise.sql                   → expertise_requests + expertise_process_steps
11_transactions.sql
12_communication.sql               → conversations + messages + favorites
13_user_features.sql               → notifications + saved_searches + vehicle_reports
14_promotion.sql                   → free_listing_votes + auction_promotion_requests
15_email_system.sql                → email_templates + email_logs + email_suppressions
16_audit.sql                       → audit_logs
17_advertising.sql                 → 6 reklam tablosu
18_helper_functions.sql            → is_admin, is_super_admin, is_valet, set_slug, vb.
19_trigger_functions.sql           → validate_bid, wallet_balance, anti_snipe, vb.
20_views.sql                       → 5 view
21_rls_policies.sql                → Tüm RLS politikaları
22_storage.sql                     → 7 storage bucket + politikaları
23_seed_data.sql                   → cities, districts, brands, models, engine_sizes, categories
```

### 3) Test et
Her migration'dan sonra Supabase'de:
- **Table Editor**'da yeni tabloları gör
- **Database** → **Extensions**'da uuid-ossp, pgcrypto kurulu mu bak
- SQL hatası alırsan: **Hata mesajını kopyala, bana gönder**, düzelteyim

### 4) Hata olursa
- Her migration `idempotent` (tekrar çalıştırılabilir) yazıldı
- Hata durumunda: hatayı oku, düzeltilmiş SQL'i yapıştır, devam et
- Tüm migration'ları sıfırdan çalıştırmak istersen: Supabase projesini sil, yenisini oluştur

## ⚠️ Önemli Notlar

- **Tüm tablolarda soft delete** (`deleted_at`) var
- **Tüm tablolarda** `created_at`, `updated_at` timestamp var
- **Alfabetik sıralama** kolonlarda
- **snake_case** tüm isimlerde
- **Türkçe enum değerleri** korundu (UTF-8 destekli)

## 🆘 Sık Karşılaşılan Hatalar

| Hata | Çözüm |
|---|---|
| `extension "postgis" is not available` | Önemli değil, sadece opsiyonel. Diğerleri kuruldu |
| `type "xxx" already exists` | Bu normal, idempotent — yoksay |
| `relation "xxx" already exists` | Tablo zaten var, yoksay veya yenisini sil önce |
| `permission denied for schema public` | Supabase SQL Editor'de çalıştır (anon key yetmez) |

## 📊 Toplam

- **47 tablo**
- **22 enum**
- **7 storage bucket**
- **5 view**
- **10+ trigger fonksiyonu**
- **Tam RLS koruması**

---

**Soru?** Migration'ı çalıştırırken hata alırsan hemen söyle, yardımcı olurum.
