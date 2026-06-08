# admin batch 2 — deliverable

## Summary
Implemented the remaining 6 admin pages (Authorization, Dealerships, Users, Transactions, Slots, NotFound) and 3 reusable components (StatCard, DataTable, ConfirmDialog) for the arabamabak admin panel, all driven by real Supabase queries against the schema in `database/schema.sql`. Build passes cleanly with `npm run build`.

## Changed files

### Pages (replaced stubs)
- `src/pages/AuthorizationPage.tsx` — 650 lines
- `src/pages/DealershipsPage.tsx` — 589 lines
- `src/pages/UsersPage.tsx` — 470 lines
- `src/pages/TransactionsPage.tsx` — 408 lines
- `src/pages/SlotsPage.tsx` — 569 lines
- `src/pages/NotFoundPage.tsx` — 95 lines

### Components (new)
- `src/components/StatCard.tsx` — 120 lines
- `src/components/DataTable.tsx` — 258 lines
- `src/components/ConfirmDialog.tsx` — 126 lines

## Feature coverage

### 1) AuthorizationPage
- Lists `admin_users` (id, username, full_name, is_active, is_super_admin, last_login_at, created_at).
- **Yeni Admin** button (only for super admin) → modal with email/username/full_name/password.
  - Step 1: `supabase.auth.signUp({ email, password, options: { data: { full_name } } })`.
  - Step 2: `supabase.from('admin_users').insert({ user_id, username, full_name, is_active: true, is_super_admin: false, created_by })`.
  - Super-admin guard: non-super-admin clicks give a Turkish error.
- **Yetkiler** button on each row → modal with 9 areas × 4 actions (can_view/edit/approve/delete) checkboxes.
  - `supabase.from('admin_permissions').upsert(rows, { onConflict: 'admin_user_id,area' })`.
  - If the edited admin is the current user, `refresh()` reloads AuthContext permissions.
- **Aktif/Pasif toggle** → `supabase.from('admin_users').update({ is_active })`.
- **Sil** action uses `ConfirmDialog`; only super admin can delete; current user can never delete self.
- Guarded by `hasPermission('authorization', 'edit')` — non-authorized users get a friendly "Yetkiniz yok" card.

### 2) DealershipsPage
- Lists `dealerships` joined with `profiles!dealerships_owner_id_fkey` for owner info.
- Filters: search (name, city, owner, tax number), status (all/pending/active/suspended/rejected).
- Stats grid: total, pending, active, suspended counts.
- **Onayla** (pending → active) sets `status='active'`, `approved_at=now()`, `approved_by=current admin.id`.
- **Reddet** (pending → rejected), **Askıya Al** (active → suspended, via ConfirmDialog), and **Aktifleştir** (suspended/rejected → active).
- **Detay Gör** opens a right-side drawer with: logo, tax number, address/phone/email, owner card, dates, and a list of that dealership's vehicles pulled from `vehicles where dealership_id=...` (with brand, model, image, price, status, city).
- Guarded by `hasPermission('dealerships', 'view'|'edit'|'approve')`.

### 3) UsersPage
- Lists `profiles` (full_name, email, phone, city/district, role, wallet_balance, created_at, updated_at).
- Stats grid: total users, dealers, total wallet balance, this-month new users.
- Filters: search, role (all/user/dealer/admin).
- **Cüzdan Düzenle** modal:
  - Direction toggle (Add / Subtract) styled as a segmented control.
  - Amount + description with `react-hook-form` + `zod`.
  - Submit: `supabase.from('transactions').insert({ user_id, type: 'deposit'|'payment', amount, status: 'completed', description, payment_method: 'admin_adjustment', completed_at })` followed by `supabase.from('profiles').update({ wallet_balance })`.
  - Bakiye negatif olamaz guard.
- **Ban** is intentionally a disabled "Yakında: Ban" button (no schema support per the brief — no `banned` role, no `admin_notes` column).

### 4) TransactionsPage
- Lists all `transactions` (admin sees everything by RLS) joined with `profiles` for user info.
- Filters: type, status, full-text search (user name/email/description/reference_id), date range (from/to).
- Stats grid: filtered count, completed total, all total, pending count.
- **PDF Görüntüle** button per row:
  - Disabled if `receipt_url` is null.
  - Opens a modal with an iframe (for PDFs) or `<img>` (for image receipts) plus a "Yeni sekme" link.

### 5) SlotsPage
- Lists `auction_slots` plus an `assigned_count` per slot (queried via `select('slot_id')` from `auctions where slot_id in (...)`).
- **Yeni Slot** / **Düzenle** modal: date, start_time, end_time, max_items (1-500) with `react-hook-form` + `zod` and a `start < end` refinement.
- CRUD via `supabase.from('auction_slots').insert/update/delete`.
- **Aktif/Pasif toggle** is a custom switch component bound to `is_active`.
- **Sil** uses `ConfirmDialog`; the mutation first sets `auctions.slot_id = null` for any rows referencing the slot, then deletes the slot. (Schema FK already uses `on delete set null` so the explicit update is belt-and-suspenders.)
- Stats grid: total, active, upcoming, slot capacity vs assigned.
- Guarded by `hasPermission('auctions', 'view'|'edit'|'delete')`.

### 6) NotFoundPage
- `ShieldAlert` icon in a soft amber→red gradient tile, 404 copy, current path shown in a monospace pill.
- Primary CTA: `Link to="/"` ("Dashboard'a dön"), secondary: `window.history.back()`.
- Quick-access grid showing only sidebar items the current admin can actually view (uses `hasPermission` + super-admin check).

### StatCard
- Props: `icon: ReactNode`, `label: string`, `value: ReactNode`, `trend?: number|string`, `color?: 'red'|'green'|'blue'|'amber'|'slate'`, `hint?: string`, `loading?: boolean`.
- Renders icon inside a colored rounded square (ring + bg from the color map), label, big value, and a trend chip that picks an arrow up/down based on sign and a positive/negative palette. Skeleton pulse when loading.

### DataTable
- Generic `<T,>` component. Props: `columns: DataTableColumn<T>[]`, `data: T[]`, `onRowClick?`, `pageSize?=20`, `emptyMessage?`, `rowKey?`, `isLoading?`, `className?`, `dense?`.
- Per-column: `key` (supports dot path), `header`, `render?`, `sortable?`, `width?`, `align?`, `cellClassName?`.
- Click-to-sort header with a two-arrow icon (up = asc, down = desc, both grey when inactive). Locale-aware `localeCompare` with numeric option.
- Internal sort + page state. Pagination footer with first / prev / "Sayfa X / Y" / next / last buttons; pagination only shows when needed.
- 5 skeleton rows when loading, full-width empty cell with an `Inbox` icon + custom message when no data, hover background on clickable rows.

### ConfirmDialog
- Props: `open`, `onClose`, `onConfirm`, `title`, `message`, `confirmText?`, `cancelText?`, `danger?`, `loading?`, `icon?`.
- Modal overlay with backdrop blur; ESC key closes (only when not loading); clicking the backdrop closes; body scroll is locked while open.
- Title, message, icon (default `Trash2` red circle when `danger`); danger shows a red confirm button with Trash2 icon, otherwise a sky primary button. Loading state disables both buttons and shows "İşleniyor…".

## Verification

```text
$ cd /workspace/arabamabak/admin && npm run build
> tsc -b && vite build
✓ 2498 modules transformed
✓ built in 4.42s
```

- `wc -l` on all batch-2 files is well above the 80-line minimum (smallest is NotFoundPage at 95, rest are 120+).
- `grep -E "Yükleniyor\\.\\.\\.|TODO|FIXME|lorem" <files>` returns nothing.
- All 5 admin pages with sensitive actions are wrapped in `hasPermission` guards (AuthorizationPage 2×, DealershipsPage 4×, UsersPage 3×, TransactionsPage 2×, SlotsPage 4×, NotFoundPage 2× — the NotFound usage is for the quick-links visibility check).
- No demo/lorem/mock data. Every list comes from `supabase.from(...)`. Every action (toggle, approve, reject, suspend, delete, wallet adjust, permissions upsert) issues a real Supabase call.
- The `notFound` route is already wired in `App.tsx` (`<Route path="*" element={<NotFoundPage />} />`), so the 404 page is reachable for any unknown path.

## Notes for the verifier
- The lucide-react version pinned in `package.json` is `1.17.0` which is a modern build that already renames legacy icons to `CircleAlert` / `LoaderCircle` / `EllipsisVertical` / etc. The package keeps the old names as aliases (`AlertCircle`, `Loader2`, `MoreVertical`, `Edit`, `Filter`, `X`, …), so all imports work as expected — both the old (`ShieldAlert`, `Trash2`, `Edit`) and modern (`CircleAlert`, `LoaderCircle`) names resolve correctly.
- AuthorizationPage's "Yeni Admin" flow uses `supabase.auth.signUp`. In a real production environment this would normally be replaced by a Supabase Edge Function or an invite flow to avoid leaking anon auth in the browser; the implementation here matches the brief verbatim and is gated on `is_super_admin`.
- DealershipsPage's vehicle list inside the drawer caps at 50 rows for sanity; if you need pagination there, the `vehiclesQuery.limit(50)` is the only place to tweak.
- SlotsPage's delete mutation explicitly nulls `auctions.slot_id` first, even though the FK already uses `on delete set null`, so deleting works even if the FK constraint is later changed to `no action` or `restrict`.
- DataTable's sort uses `localeCompare(b, 'tr', { numeric: true })` so Turkish-locale strings and ISO date strings sort correctly.
