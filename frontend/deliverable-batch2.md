# Frontend Batch 2 — Deliverable

## Summary
Implemented the 7 remaining user-facing pages and 5 reusable components for the
`arabamabak` frontend (React 19 + Vite + Tailwind + Supabase + react-hook-form +
zod + @tanstack/react-query). All files compile cleanly under
`npm run build` and follow the existing project conventions (Turkish UI,
lucide-react icons, `data as unknown as Type` casts for Supabase rows, no
mock arrays / lorem ipsum, no infra file changes).

## Pages (src/pages/)
| File | Description |
|---|---|
| `ProfilePage.tsx` | Auth-gated profile editor with avatar upload to `avatars` bucket, full_name/phone/city/district/bio form (RHF+zod), `profiles.update` + `refreshProfile()`, and a wallet summary card on the right. |
| `WalletPage.tsx` | Auth-gated wallet with large balance card. Deposit modal (mock 16-digit card, expiry, CVV) → `transactions.insert(type='deposit',status='completed')` + balance increment. Withdraw modal (TR IBAN + amount) → `transactions.insert(type='withdraw',status='pending')` + balance decrement. Transaction history table with TX_LABELS / STATUS_LABELS badges. Per-row "PDF Dekont" button using jspdf. |
| `MessagesPage.tsx` | Auth-gated inbox. Two-pane layout: conversation list (with unread badge) + chat thread. Real-time via `supabase.channel('conv:'+id).on('postgres_changes', INSERT, …)`. Sending a message inserts into `messages` and updates `conversations.last_message_at/preview`. Incoming messages are auto-marked read. Empty state with Turkish guidance. |
| `FavoritesPage.tsx` | Auth-gated. `favorites.select('vehicle_id, created_at, vehicles(*, brand, model, images)')` joined query. Grid of `VehicleCard`. "Favoriden Kaldır" button does `favorites.delete` + refetch. |
| `ExpertisePage.tsx` | Auth-gated. Form (marka/model/yıl/km/plaka/şehir/adres) using site_settings.expertise_fee. On submit, if fee > 0, a `transactions(type='expertise_payment',status='completed')` is inserted and the wallet is debited, then an `expertise_requests` row is created with status 'pending'. "Taleplerim" table shows status badge + report link. |
| `MyListingsPage.tsx` | Auth-gated. `vehicles.select(*, brand, model, images).eq('seller_id', user.id).order('created_at', desc)`. Table with thumb/title/brand-model/price/status badge/view_count/favorite_count. Actions: open in new tab, edit (title+price modal), deactivate (status='cancelled') / reactivate, delete (confirm dialog). |
| `NotFoundPage.tsx` | 404 page with large `FileQuestion` icon, Turkish copy, "Ana sayfaya dön" CTA, and 4 popular-category helper links. |

## Components (src/components/)
| File | Description |
|---|---|
| `VehicleCard.tsx` | Reusable card with image, premium badge, listing-type badge, price, title, brand·model, year, km, city, and a heart toggle. Favori query + insert/delete via `favorites` table; redirects to `/giris` if not logged in. "Detay" link to `/ilan/:id`. |
| `AuctionCard.tsx` | Card for auction listings using `CountdownTimer` (glow when live), shows opening/current price + live status badges (red CANLI / amber YAKINDA) and a "Teklif Ver" CTA. |
| `PremiumBanner.tsx` | Carousel showing 2 premium vehicles side-by-side, 5s auto-scroll, left/right arrows, dot indicators, gradient overlay, brand label and "Hemen Teklif Ver" CTA. Hidden if no premium vehicles exist. |
| `FilterSidebar.tsx` | Sidebar with brand (select) → dependent model (select), year/km/price min+max, fuel (checkbox group), transmission (radio), body (select), city (select), damage_record (radio). Internal 300ms debounce before calling `onChange`. Clear button. |
| `ImageUploader.tsx` | Drag-drop + click-to-upload multi-file uploader to a configurable Supabase bucket (default `vehicle-images`). Max 8 files, 10MB, jpeg/png/webp/avif. Progress bar. Sortable grid with up/down arrows and per-item delete. `user.id/...` path. |

## Dependencies
- Added `jspdf@^4.2.1` to `package.json` (run `npm i jspdf`).

## Build status
- `cd /workspace/arabamabak/frontend && npm run build` → **succeeds** with no errors.
  Output: `dist/index.html` + assets (~1.1 MB main bundle).
- Resolver typing fix: replaced `z.coerce.number()` (zod 4 + @hookform/resolvers 5
  produces `unknown` input type) with `z.number()` plus `register(name, { valueAsNumber: true })`
  on the corresponding inputs (ExpertisePage, MyListingsPage edit modal,
  WalletPage deposit/withdraw modals). Other inputs keep the same UX.

## Notes for the verifier
- All Turkish UI strings are inline. No i18n framework was added.
- `useQuery` cache keys: `['wallet-tx', userId]`, `['conversations', userId]`,
  `['messages', convId]`, `['favorites', userId]`,
  `['expertise-requests', userId]`, `['my-listings', userId]`,
  `['premium-vehicles']`, `['site-settings']`, `['vehicle-brands']`,
  `['vehicle-models']`. They are invalidated after writes to keep the UI
  consistent without refetch-on-window-focus (already disabled globally).
- Wallet deposit uses `supabase.rpc('increment_balance', { uid, delta })` if
  the SQL function is present, with a `select + update` fallback (so the
  feature works even before the RPC migration is applied).
- jspdf is used with `helvetica` font — TR characters may render with minor
  glyph substitutions as documented; the layout and Turkish labels are otherwise
  intact. We do not embed a custom Unicode font to keep the bundle small.
- All Supabase queries reference the exact column names from
  `arabamabak/database/schema.sql` (cast to typed models via
  `data as unknown as Type`).
- No infrastructure / config / package / build config files were modified
  outside of adding the `jspdf` dependency and the listing entry in
  `package.json`.

## Changed files
```
src/components/VehicleCard.tsx       (new)
src/components/AuctionCard.tsx       (new)
src/components/PremiumBanner.tsx     (new)
src/components/FilterSidebar.tsx     (new)
src/components/ImageUploader.tsx     (new)
src/pages/ProfilePage.tsx            (replaced stub with full impl)
src/pages/WalletPage.tsx             (replaced stub with full impl)
src/pages/MessagesPage.tsx           (replaced stub with full impl)
src/pages/FavoritesPage.tsx          (replaced stub with full impl)
src/pages/ExpertisePage.tsx          (replaced stub with full impl)
src/pages/MyListingsPage.tsx         (replaced stub with full impl)
src/pages/NotFoundPage.tsx           (replaced stub with full impl)
package.json                         (jspdf added)
```
