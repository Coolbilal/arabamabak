# arabamabak — Veritabanı Planı v2 (Final)

> **Workflow:** Planla → Onay al → Kodla
> Son güncelleme: 2026-06-08
> **Onay alındı, kodlama başladı.**

---

## 0. Temel Kararlar (kullanıcı onayıyla)

| # | Karar | Detay |
|---|-------|-------|
| 1 | Bildirim | Uygulama içi + sağlam email sistemi (transactional + marketing) |
| 2 | Saved searches | MVP'de (baştan planla) |
| 3 | Anti-snipe | Evet, son 30 sn teklif → uzat. Süre admin'den ayarlı |
| 4 | Soft delete | TÜM tablolarda |
| 5 | Üyelik tipi | Bireysel + Mağaza (Bayi) → **ayrı hesap**, aynı login sistemi |
| 6 | Satıcı onayı (mezat) | Onaylamazsa **sistem otomatik onaylasın** (admin ayarlı süre) |
| 7 | Premium | Açık arttırma ücretine **ek bakiye** + anasayfa kayan ilanlar |
| 8 | Aktivasyon | Email (zorunlu) + Telefon (opsiyonel doğrulama) |
| 9 | Ekspertiz ulaşım | Esnek: Vale alır **veya** araç sahibi bayie götürür (formda seçim) |
| 10 | Masa sistemi | 100 örnek, admin ayarlı kapasite, koltuk dolunca yenisi açılır |
| 11 | Masa UI | İkon değil, bilgilendirme metni ("23/100 koltuk dolu") |
| 12 | Sınır aşım ücreti | Admin panelden ayarlı, bayi upgrade değil |
| 13 | Tema/Branding | Tüm renkler, fontlar, karakterler admin editörden ayarlanabilir |
| 14 | Reklam sistemi | Admin panelden kampanya + slot + görsel yönetimi |
| 15 | Premium reklam alanı | İlanların arasına native reklam (her 5 ilanda 1 tane gibi) |
| 16 | Logo yükleme | Transparan PNG/SVG, çoklu boyut (sm/md/lg/xl/xxl + favicon + email) |
| 17 | Kod kalitesi | Alfabetik sıralama, snake_case SQL, camelCase TS, Türkçe UI, tutarlı naming |

---

## 1. Kullanıcı Tipleri (6 tip)

| Tip | Login | Açıklama |
|-----|-------|----------|
| Bireysel Alıcı | `profiles` | İlan arar, teklif verir, favoriler, mesajlaşma |
| Bireysel Satıcı | `profiles` | Ücretsiz + ücretli ilan verir (kota dahilinde) |
| Galeri/Araç Bayi | `dealerships` | Toplu ilan, indirimli ücret, bayi paneli |
| Ekspertiz Bayi (franchise) | `expertise_dealerships` | Atanan taleplere rapor yükler |
| Eksper Vale (saha elemanı) | `expert_valets` | Arabamabak çalışanı |
| Admin | `admin_users` | Super admin + alan-bazlı yetkili admin |

---

## 2. Modüller (5 İskelet)

### 2.1 Açık Arttırma (Mezat)
- Ücretli ilan verme (kredi kart, banka kart, cüzdan)
- **Masa sistemi**: `auctions.max_seats` (admin ayarlı, default 100)
- **Bloke mekaniği**: seat fee bloke, kazanan kesilir, diğerleri çözülür
- **Anti-snipe**: Son 30 sn teklif → `live_ends_at` uzatılır
- **İletişim**: Sadece kazanan ↔ satıcı
- **Onay akışı**: Auto-approval countdown (admin ayarlı)

### 2.2 Ücretsiz İlan
- Kota (admin ayarlı, default 3), aşımda ek ücret
- Yayında kalma süresi admin ayarlı
- **Oylama sistemi**: Eşik aşılınca admin'e "mezat" bildirimi
- Mesajlaşma serbest

### 2.3 Ekspertiz Talepleri
- Site ilanlarından bağımsız (kullanıcı marka/model/plaka girer)
- Ücretli, **esnek ulaşım** (vale / owner)
- Süreç: atama → valet onay → pickup → bayi → rapor → teslim → oylama
- Her aşama bildirimi

### 2.4 Eksper Vale
- Arabamabak çalışanı
- Panel: görevlerim, mesajlaşma, aşamalar
- Kullanıcı tarafından oylanabilir

### 2.5 Bayilik (2 tür)
- **Galeri Bayi**: Toplu ilan, indirim
- **Ekspertiz Bayi**: Atanan talepler, rapor yükleme

---

## 3. Tablolar (47 toplam)

### 3.1 Çekirdek (22 tablo)
1. `profiles`
2. `admin_users`
3. `admin_permissions`
4. `admin_activity_logs`
5. `site_settings`
6. `vehicle_brands`
7. `vehicle_models`
8. `engine_sizes`
9. `cities`
10. `districts`
11. `categories`
12. `vehicles`
13. `vehicle_images`
14. `vehicle_views`
15. `auction_slots`
16. `auctions`
17. `bids`
18. `auction_seat_holds`
19. `auction_seat_transactions`
20. `transactions`
21. `conversations`
22. `messages`
23. `favorites`
24. `notifications`
25. `saved_searches`
26. `vehicle_reports`
27. `expertise_requests`
28. `expertise_process_steps`
29. `expert_valets`
30. `valet_ratings`
31. `dealerships`
32. `expertise_dealerships`
33. `free_listing_votes`
34. `auction_promotion_requests`
35. `audit_logs`

### 3.2 Email & Bildirim (4 tablo)
36. `email_templates`
37. `email_logs`
38. `email_suppressions`
39. `push_tokens`

### 3.3 Tema & Branding (1 tablo)
40. `site_themes`

### 3.4 Reklam Yönetimi (6 tablo)
41. `ad_campaigns`
42. `ad_slots`
43. `ad_creatives`
44. `ad_placements`
45. `ad_impressions`
46. `ad_clicks`

### 3.5 Multi-Logo (1 tablo)
47. `site_logos`

---

## 4. Storage Bucket'lar (7)

1. `vehicle-images` (public, 10MB, jpeg/png/webp/avif)
2. `avatars` (public, 2MB, jpeg/png/webp)
3. `site-assets` (public, 5MB, image/* + svg)
4. `expertise-reports` (private, 20MB, pdf + image)
5. `dealership-logos` (public, 2MB, image/* + svg)
6. `category-icons` (public, 1MB, svg/png) — **yeni**
7. `ad-creatives` (public, 2MB, jpeg/png/webp/svg) — **yeni**

---

## 5. Migration Stratejisi (23 sıralı dosya)

```
01_extensions_and_enums.sql
02_reference_tables.sql         (cities, districts, engine_sizes, categories, brands, models)
03_users_and_admins.sql         (profiles, admin_users, admin_permissions, admin_activity_logs)
04_site_config.sql              (site_settings + site_themes + site_logos)
05_vehicles.sql                 (vehicles, vehicle_images, vehicle_views)
06_dealerships.sql              (dealerships + expertise_dealerships)
07_valets.sql                   (expert_valets + valet_ratings)
08_auctions.sql                 (auctions + auction_slots + bids)
09_seat_system.sql              (auction_seat_holds + auction_seat_transactions)
10_expertise.sql                (expertise_requests + expertise_process_steps)
11_transactions.sql
12_communication.sql            (conversations + messages + favorites)
13_user_features.sql            (notifications + saved_searches + vehicle_reports)
14_promotion.sql                (free_listing_votes + auction_promotion_requests)
15_email_system.sql             (email_templates + email_logs + email_suppressions)
16_audit.sql
17_advertising.sql              (6 ad tablo)
18_helper_functions.sql
19_trigger_functions.sql
20_views.sql
21_rls_policies.sql
22_storage.sql
23_seed_data.sql
```

---

## 6. Kod Kalitesi Kuralları

### SQL
- ✅ snake_case (user_id, created_at, wallet_balance)
- ✅ Enum: snake_case
- ✅ **Alfabetik sıralama** kolonlarda
- ✅ Index: `idx_<tablo>_<kolon>`
- ✅ Trigger: `trg_<tablo>_<aksiyon>`
- ✅ Function: snake_case verb-first
- ✅ Tablo: tekil isim

### TypeScript
- ✅ camelCase değişken/fonksiyon
- ✅ PascalCase component/type
- ✅ UPPER_SNAKE_CASE sabit
- ✅ Alfabetik import sıralaması
- ✅ Strict mode, no `any`
- ✅ PascalCase.tsx component, camelCase.ts util

### Genel
- ✅ Timestamp: `created_at`, `updated_at`, `deleted_at`
- ✅ Boolean: `is_*`, `has_*`, `can_*`
- ✅ Para: `numeric(12,2)` (float YOK)
- ✅ UI etiketleri Türkçe, kod İngilizce
- ✅ Yorum/doc İngilizce, kullanıcı mesajı Türkçe

---

## 7. Deployment Workflow (özet)

| Parça | Ne olacak? |
|---|---|
| Supabase migrations | `database/migrations/` altına SQL dosyaları, sen SQL Editor'de çalıştırırsın |
| Frontend kodu | Mevcut repoyu güncellerim, GitHub Desktop'tan pull, Vercel auto-deploy |
| Admin kodu | Mevcut repoyu güncellerim, GitHub Desktop'tan pull, Vercel auto-deploy |
| Domain | Vercel'den domain'e DNS bağlama |

---

## 8. Kodlama Sırası (ONAY ALINDI)

1. `database/migrations/` → 23 migration dosyası
2. `database/README.md` → sıralı çalıştırma rehberi
3. Supabase SQL Editor'de sırayla çalıştırılacak
4. Seed data + test
5. Frontend güncellemeleri (theme editor, ad components, logo upload)
6. Admin güncellemeleri (theme editor, ad management, logo upload)
7. Vercel env değişkenleri + deploy
8. Domain bağlama

---

**Bu plan, migration ve kod yazımı için tek referans dokümanıdır. Değişiklik gerekirse buraya not düşülür.**
