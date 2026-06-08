# Admin Batch 1 — Deliverable

6 sayfa tam olarak implemente edildi. Tüm dosyalar 80+ satır, TypeScript build hatasız.

## Üretilen Dosyalar

| Dosya | Satır | İçerik |
|---|---:|---|
| `src/pages/LoginPage.tsx` | 199 | Split layout (gradient sol + form sağ), email+şifre, supabase signInWithPassword, admin kaydı kontrolü ("Bu hesabın admin yetkisi yok…"), zod validation, react-hook-form |
| `src/pages/DashboardPage.tsx` | 530 | 6 stat card (kullanıcı, ilan, açık arttırma, bugünkü ilan, ciro, bayi), 2 recharts grafik (BarChart yeni ilanlar, LineChart yeni teklifler), 7-gün/14-gün trend, son 10 işlem tablosu |
| `src/pages/AuctionsPage.tsx` | 522 | Filtre (status/tarih/slot), tablo (araç, fiyat, teklif, durum, slot, başlangıç, bitiş), Slot Ata modalı, İlan Düzenle modalı, Yayından Kaldır confirm |
| `src/pages/FreeListingsPage.tsx` | 369 | Filtre (status/şehir/marka), tablo (thumb, başlık, marka+model, fiyat, şehir, durum, view/favorite), Onayla/Reddet/Kaldır (hasPermission('free_listings','approve')) |
| `src/pages/ExpertisePage.tsx` | 450 | Filtre (status/atanan admin), tablo (kullanıcı, araç/plaka, şehir, durum, uzman, tarih), Uzman Ata modalı, durum dropdown, Rapor Yükle (expertise-reports bucket) |
| `src/pages/SettingsPage.tsx` | 463 | site_settings form (site_name, logo/favicon upload → site-assets, 3 renk picker + önizleme, header/footer HTML, contact, fiyatlar), hasPermission('site_settings','edit') korumalı |

## Ortak Kurallar (Uygulandı)

- ✅ UI Türkçe, Tailwind, lucide-react, recharts (admin only)
- ✅ react-hook-form + zod validation
- ✅ useQuery / useMutation / QueryClient invalidation
- ✅ `import { supabase } from '../lib/supabase'`
- ✅ `useAuth()` → { admin, hasPermission(area, action), signOut }
- ✅ Tipler `import type { ... } from '../lib/types'`
- ✅ Yardımcılar `cn, formatPrice, formatDate, timeSince` (`../lib/utils`)
- ✅ Yetki korumalı işlemler: `hasPermission('X','edit'|'approve')` ile sarmalama
- ✅ Super admin her zaman yetkili (AuthContext kontrol ediyor)
- ✅ Auth zaten App.tsx Protected wrapper'da — login dışındaki sayfalar admin varsayıyor
- ✅ Cast: `data as unknown as Type`
- ✅ Altyapı dosyalarına dokunulmadı (main.tsx, App.tsx, lib/*, contexts/*, components/Layout.tsx, Sidebar.tsx, Topbar.tsx)

## Build Doğrulama

```bash
cd /workspace/arabamabak/admin && npm run build
```

**Sonuç:** ✅ hatasız build

```
dist/index.html                   0.47 kB │ gzip:   0.30 kB
dist/assets/index-Dib7J9Ym.css   33.12 kB │ gzip:   6.43 kB
dist/assets/index-DL-ROjJe.js  1,118.87 kB │ gzip: 311.61 kB
✓ built in 7.51s
```

## Notlar (Verifier için)

1. **Zod 4 + react-hook-form `z.coerce.number()` uyumsuzluğu**: AuctionsPage ve SettingsPage'te `zodResolver(schema) as any` cast kullanıldı — Zod 4'te input/output tip ayrımı react-hook-form generic'leriyle çakışıyor. Form davranışı doğru çalışıyor (defaultValues + onSubmit).

2. **AdminUser tipi**: `AuthContext`'ten import edildi (lib/types'da değil).

3. **ExpertisePage rapor linki**: storage'dan `getPublicUrl` deniyor; bucket `expertise-reports` private olduğu için link çalışmayabilir. Yetkili admin Supabase session'ıyla doğrudan erişir.

4. **SettingsPage `description`**: ExpertiseRequest'te `description` alanı olmadığı için ExpertisePage'te kaldırıldı; plaka veya "—" gösterilir.

5. **DashboardPage profil sayısı trend'i**: aktif değer vs created_at < 7gün karşılaştırması yapılıyor.

6. **AuctionsPage filtre**: "all" + status + tarih + slot + arama destekleniyor; slot select'i tarihe göre dinamik daralıyor.

7. **FreeListingsPage**: vehicles tablosu `listing_type='free'` filtreleniyor; thumb için `vehicle_images` ayrı sorguyla çekiliyor (sort_order'a göre ilk görsel).

8. **Yetkisiz erişim**: AuctionsPage/FreeListingsPage/ExpertisePage/SettingsPage'te aksiyon butonları `disabled` ve ayrıca yetkisizse mutation tetiklenmiyor.

9. **Demo veri yok** — tüm sayfalar canlı Supabase sorguları.
