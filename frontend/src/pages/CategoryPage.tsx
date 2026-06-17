import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { cn, formatKm, formatPrice } from '../lib/utils';
import { useCities } from '../lib/useLocationData';
import CountdownTimer from '../components/CountdownTimer';
import type {
  Auction,
  BodyType,
  FuelType,
  TransmissionType,
  Vehicle,
  VehicleBrand,
  VehicleImage,
  VehicleModel,
} from '../lib/types';
import {
  Car,
  ChevronDown,
  Fuel,
  Gavel,
  Grid3x3,
  Heart,
  List,
  Loader2,
  MapPin,
  Palette,
  Search,
  Settings2,
} from 'lucide-react';

type Cat = 'live' | 'upcoming' | 'sold' | 'free';
type SortKey = 'created_desc' | 'created_asc' | 'price_asc' | 'price_desc' | 'year_asc' | 'year_desc';
type View = 'grid' | 'list';

type AuctionVehicle = Vehicle & {
  brand: VehicleBrand | null;
  model: VehicleModel | null;
  images: VehicleImage[];
  auction: Auction | null;
};

const CAT_META: Record<Cat, { title: string; subtitle: string; color: string; icon: React.ReactNode }> = {
  live: {
    title: 'Açık Arttırması Devam Eden Araçlar',
    subtitle: 'Şu anda canlı olan açık arttırmalar — hemen teklif verin',
    color: 'bg-red-50 text-red-700 border-red-200',
    icon: <Gavel className="h-5 w-5" />,
  },
  upcoming: {
    title: 'Açık Arttırmaya Çıkacak Araçlar',
    subtitle: 'Yakında başlayacak açık arttırmalar',
    color: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <Gavel className="h-5 w-5" />,
  },
  free: {
    title: 'Ücretsiz İlanlar',
    subtitle: 'Sahibinden ilanlar — komisyon yok, aracısız',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    icon: <Car className="h-5 w-5" />,
  },
  sold: {
    title: 'Satılan Araçlar',
    subtitle: 'Tamamlanmış açık arttırmalar — satıldı mührü vurulan araçlar',
    color: 'bg-slate-100 text-slate-700 border-slate-300',
    icon: <Gavel className="h-5 w-5" />,
  },
};

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: 'benzin', label: 'Benzin' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'lpg', label: 'LPG & Benzin' },
  { value: 'elektrik', label: 'Elektrik' },
  { value: 'hibrit', label: 'Hibrit' },
];
const TRANSMISSION_OPTIONS: { value: TransmissionType; label: string }[] = [
  { value: 'manuel', label: 'Manuel' },
  { value: 'otomatik', label: 'Otomatik' },
  { value: 'yarı_otomatik', label: 'Yarı Otomatik' },
];
const BODY_OPTIONS: { value: BodyType; label: string }[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'station wagon', label: 'Station Wagon' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'minivan', label: 'Minivan' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'cabrio', label: 'Cabrio' },
  { value: 'mpv', label: 'MPV' },
];

export default function CategoryPage() {
  const params = useParams<{ cat: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const cat = (params.cat as Cat) ?? 'free';
  const meta = CAT_META[cat] ?? CAT_META.free;

  const [view, setView] = useState<View>('grid');
  const [sort, setSort] = useState<SortKey>('created_desc');
  const [filterOpen, setFilterOpen] = useState(false);
  const [trackedCat, setTrackedCat] = useState<Cat>(cat);

  // Reset transient UI state when category changes.
  if (trackedCat !== cat) {
    setTrackedCat(cat);
    setView('grid');
    setSort('created_desc');
  }

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);
  const setFilter = (k: string, v: string | undefined) => {
    const next = new URLSearchParams(searchParams);
    if (!v) next.delete(k);
    else next.set(k, v);
    setSearchParams(next, { replace: true });
  };
  const clearAll = () => setSearchParams(new URLSearchParams(), { replace: true });

  const { data, isLoading } = useQuery({
    queryKey: ['category', cat, sort, filters],
    staleTime: 30_000,
    queryFn: async () => {
      let q = supabase
        .from('vehicles')
        .select(
          '*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*), auction:auctions!auctions_vehicle_id_fkey(*)',
        )
        .eq('status', 'active');

      if (cat === 'live') {
        q = q.in('listing_type', ['auction', 'premium_auction']);
      } else if (cat === 'free') {
        q = q.eq('listing_type', 'free');
      } else if (cat === 'sold') {
        // Satılanlar: sadece auction tipinde ve status='sold' olan ilanlar
        q = q.in('listing_type', ['auction', 'premium_auction']).eq('status', 'sold');
      } else {
        // upcoming: scheduled auctions in the future
        q = q.in('listing_type', ['auction', 'premium_auction']);
      }

      if (filters.brand_id) q = q.eq('brand_id', filters.brand_id);
      if (filters.model_id) q = q.eq('model_id', filters.model_id);
      if (filters.year_min) q = q.gte('year', Number(filters.year_min));
      if (filters.year_max) q = q.lte('year', Number(filters.year_max));
      if (filters.km_min) q = q.gte('km', Number(filters.km_min));
      if (filters.km_max) q = q.lte('km', Number(filters.km_max));
      if (filters.price_min) q = q.gte('price', Number(filters.price_min));
      if (filters.price_max) q = q.lte('price', Number(filters.price_max));
      if (filters.fuel) q = q.eq('fuel', filters.fuel);
      if (filters.transmission) q = q.eq('transmission', filters.transmission);
      if (filters.body) q = q.eq('body', filters.body);
      if (filters.city) q = q.eq('city', filters.city);
      if (filters.damage === 'no') q = q.eq('damage_record', false);
      if (filters.damage === 'yes') q = q.eq('damage_record', true);

      switch (sort) {
        case 'created_asc': q = q.order('created_at', { ascending: true }); break;
        case 'price_asc': q = q.order('price', { ascending: true }); break;
        case 'price_desc': q = q.order('price', { ascending: false }); break;
        case 'year_asc': q = q.order('year', { ascending: true }); break;
        case 'year_desc': q = q.order('year', { ascending: false }); break;
        default: q = q.order('created_at', { ascending: false });
      }

      q = q.limit(120);
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as unknown as AuctionVehicle[];

      if (cat === 'live') {
        const now = new Date().toISOString();
        // Sadece canlı mezatlar (scheduled'ler DEĞİL!)
        rows = rows.filter(
          (r) => r.auction && r.auction.status === 'live' && r.auction.end_at && r.auction.end_at > now,
        );
      } else if (cat === 'upcoming') {
        const now = new Date().toISOString();
        // Sadece gelecekte başlayacak scheduled mezatlar
        rows = rows
          .filter((r) => r.auction && r.auction.status === 'scheduled' && r.auction.start_at && r.auction.start_at > now)
          .sort((a, b) => ((a.auction?.start_at ?? '') > (b.auction?.start_at ?? '') ? 1 : -1));
      } else if (cat === 'sold') {
        // Satılanlar: sadece auctions.status='ended' olanlar
        rows = rows.filter(
          (r) => r.auction && (r.auction.status === 'ended' || r.auction.status === 'completed'),
        );
        // Satılanlar: en son satılan üstte
        rows = rows.sort((a, b) => {
          const ad = a.auction?.ended_at ?? a.sold_at ?? a.created_at;
          const bd = b.auction?.ended_at ?? b.sold_at ?? b.created_at;
          return bd.localeCompare(ad);
        });
      }
      return rows;
    },
  });

  const items = data ?? [];
  const brands = useBrands();
  const models = useModels(filters.brand_id);

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Header */}
      <div className={cn('mb-6 rounded-2xl border p-5', meta.color)}>
        <div className="flex items-center gap-3">
          {meta.icon}
          <h1 className="text-xl md:text-2xl font-bold">{meta.title}</h1>
        </div>
        <p className="mt-1 text-sm opacity-80">{meta.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <FilterSidebar
            brands={brands}
            models={models}
            filters={filters}
            setFilter={setFilter}
            clearAll={clearAll}
          />
        </aside>

        {/* Results */}
        <div>
          {/* Toolbar */}
          <div className="card mb-4 flex flex-wrap items-center gap-3 p-3">
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              className="btn-secondary lg:hidden"
            >
              <Search className="h-4 w-4" /> Filtrele
              {activeFilterCount > 0 && (
                <span className="badge bg-brand-100 text-brand-700 ml-1">{activeFilterCount}</span>
              )}
            </button>

            <div className="text-sm text-slate-600">
              {isLoading ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
                </span>
              ) : (
                <>
                  <strong className="text-slate-900">{items.length}</strong> sonuç bulundu
                </>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2">
              <label className="text-xs text-slate-500 hidden sm:inline">Sırala:</label>
              <div className="relative">
                <select
                  className="input pr-8 py-1.5 text-sm"
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="created_desc">En Yeni</option>
                  <option value="created_asc">En Eski</option>
                  <option value="price_asc">Fiyat (Düşükten Yükseğe)</option>
                  <option value="price_desc">Fiyat (Yüksekten Düşüğe)</option>
                  <option value="year_asc">Yıl (Eskiden Yeniye)</option>
                  <option value="year_desc">Yıl (Yeniden Eskiye)</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>

              <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
                <button
                  type="button"
                  onClick={() => setView('grid')}
                  className={cn('p-1.5 rounded', view === 'grid' ? 'bg-brand-600 text-white' : 'text-slate-500')}
                  aria-label="Izgara görünüm"
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setView('list')}
                  className={cn('p-1.5 rounded', view === 'list' ? 'bg-brand-600 text-white' : 'text-slate-500')}
                  aria-label="Liste görünüm"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile filters */}
          {filterOpen && (
            <div className="card mb-4 p-4 lg:hidden">
              <FilterSidebar
                brands={brands}
                models={models}
                filters={filters}
                setFilter={setFilter}
                clearAll={clearAll}
              />
            </div>
          )}

          {/* Results */}
          {isLoading ? (
            <div className={cn('grid gap-4', view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1')}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card overflow-hidden">
                  <div className="aspect-[4/3] w-full animate-pulse bg-slate-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
                    <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
                    <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="card p-12 text-center">
              <Car className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-lg font-semibold text-slate-700">Bu kategoride henüz ilan yok</h3>
              <p className="mt-1 text-sm text-slate-500">
                Filtreleri değiştirip tekrar deneyin veya daha sonra tekrar ziyaret edin.
              </p>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearAll} className="btn-primary mt-4">
                  Filtreleri Temizle
                </button>
              )}
            </div>
          ) : view === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {items.map((v) => (
                <ResultCard key={v.id} v={v} cat={cat} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((v) => (
                <ResultRow key={v.id} v={v} cat={cat} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function parseFilters(sp: URLSearchParams) {
  return {
    brand_id: sp.get('brand_id') || undefined,
    model_id: sp.get('model_id') || undefined,
    year_min: sp.get('year_min') || undefined,
    year_max: sp.get('year_max') || undefined,
    km_min: sp.get('km_min') || undefined,
    km_max: sp.get('km_max') || undefined,
    price_min: sp.get('price_min') || undefined,
    price_max: sp.get('price_max') || undefined,
    fuel: (sp.get('fuel') as FuelType) || undefined,
    transmission: (sp.get('transmission') as TransmissionType) || undefined,
    body: (sp.get('body') as BodyType) || undefined,
    city: sp.get('city') || undefined,
    damage: sp.get('damage') || undefined,
  };
}

/* ---------------- Filter Sidebar ---------------- */

function FilterSidebar({
  brands,
  models,
  filters,
  setFilter,
  clearAll,
}: {
  brands: VehicleBrand[];
  models: VehicleModel[];
  filters: ReturnType<typeof parseFilters>;
  setFilter: (k: string, v: string | undefined) => void;
  clearAll: () => void;
}) {
  const cities = useCities();
  const activeCount = Object.values(filters).filter(Boolean).length;
  return (
    <div className="card p-4 space-y-5 sticky top-20">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Filtreler</h3>
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="text-xs font-medium text-brand-600 hover:underline">
            Temizle ({activeCount})
          </button>
        )}
      </div>

      <Field label="Marka">
        <select
          className="input"
          value={filters.brand_id ?? ''}
          onChange={(e) => {
            setFilter('brand_id', e.target.value || undefined);
            setFilter('model_id', undefined);
          }}
        >
          <option value="">Tümü</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Model" disabled={!filters.brand_id}>
        <select
          className="input disabled:bg-slate-50 disabled:text-slate-400"
          value={filters.model_id ?? ''}
          onChange={(e) => setFilter('model_id', e.target.value || undefined)}
          disabled={!filters.brand_id}
        >
          <option value="">Tümü</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Yıl Aralığı">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input"
            placeholder="min"
            value={filters.year_min ?? ''}
            onChange={(e) => setFilter('year_min', e.target.value || undefined)}
            min={1950}
            max={2026}
          />
          <input
            type="number"
            className="input"
            placeholder="max"
            value={filters.year_max ?? ''}
            onChange={(e) => setFilter('year_max', e.target.value || undefined)}
            min={1950}
            max={2026}
          />
        </div>
      </Field>

      <Field label="KM Aralığı">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input"
            placeholder="min"
            value={filters.km_min ?? ''}
            onChange={(e) => setFilter('km_min', e.target.value || undefined)}
          />
          <input
            type="number"
            className="input"
            placeholder="max"
            value={filters.km_max ?? ''}
            onChange={(e) => setFilter('km_max', e.target.value || undefined)}
          />
        </div>
      </Field>

      <Field label="Fiyat (TL)">
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            className="input"
            placeholder="min"
            value={filters.price_min ?? ''}
            onChange={(e) => setFilter('price_min', e.target.value || undefined)}
          />
          <input
            type="number"
            className="input"
            placeholder="max"
            value={filters.price_max ?? ''}
            onChange={(e) => setFilter('price_max', e.target.value || undefined)}
          />
        </div>
      </Field>

      <Field label="Yakıt">
        <select
          className="input"
          value={filters.fuel ?? ''}
          onChange={(e) => setFilter('fuel', e.target.value || undefined)}
        >
          <option value="">Tümü</option>
          {FUEL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Vites">
        <select
          className="input"
          value={filters.transmission ?? ''}
          onChange={(e) => setFilter('transmission', e.target.value || undefined)}
        >
          <option value="">Tümü</option>
          {TRANSMISSION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kasa Tipi">
        <select
          className="input"
          value={filters.body ?? ''}
          onChange={(e) => setFilter('body', e.target.value || undefined)}
        >
          <option value="">Tümü</option>
          {BODY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Şehir">
        <select
          className="input"
          value={filters.city ?? ''}
          onChange={(e) => setFilter('city', e.target.value || undefined)}
        >
          <option value="">Tümü</option>
          {cities.data?.map((c) => (
            <option key={c.id} value={c.name}>
              {c.plate_code.toString().padStart(2, '0')} - {c.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Hasar Kaydı">
        <div className="flex gap-2">
          {[
            { v: '', l: 'Farketmez' },
            { v: 'no', l: 'Yok' },
            { v: 'yes', l: 'Var' },
          ].map((o) => (
            <button
              key={o.v || 'all'}
              type="button"
              onClick={() => setFilter('damage', o.v || undefined)}
              className={cn(
                'flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium',
                (filters.damage ?? '') === o.v
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {o.l}
            </button>
          ))}
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children, disabled }: { label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <div className={cn('space-y-1.5', disabled && 'opacity-60')}>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</label>
      {children}
    </div>
  );
}

/* ---------------- Hooks for brand/model data ---------------- */

function useBrands() {
  return useQuery({
    queryKey: ['brands'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VehicleBrand[];
    },
  }).data ?? [];
}

function useModels(brandId: string | undefined) {
  return useQuery({
    queryKey: ['models', brandId],
    enabled: !!brandId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .eq('is_active', true)
        .eq('brand_id', brandId!)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VehicleModel[];
    },
  }).data ?? [];
}

/* ---------------- Result Cards ---------------- */

function ResultCard({ v, cat }: { v: AuctionVehicle; cat: Cat }) {
  const cover = v.images?.[0]?.url;
  const isAuction = cat !== 'free';
  return (
    <Link to={`/ilan/${v.id}`} className="card group overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {cover ? (
          <img src={cover} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car className="h-12 w-12" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {v.is_premium && <span className="badge bg-amber-500 text-white">PREMIUM</span>}
          {isAuction && cat !== 'sold' && (
            <span className="badge bg-red-600 text-white">
              {v.auction?.status === 'scheduled' ? 'YAKINDA' : 'CANLI'}
            </span>
          )}
          {cat === 'sold' && (
            <span className="badge bg-slate-800 text-white">SATILDI</span>
          )}
        </div>
        {v.auction && cat === 'live' && (
          <div className="absolute bottom-2 right-2">
            <CountdownTimer target={v.auction.end_at ?? undefined} size="sm" glow />
          </div>
        )}
        {v.favorite_count > 0 && (
          <div className="absolute top-2 right-2">
            <span className="badge bg-white/90 text-rose-600">
              <Heart className="h-3 w-3 mr-0.5" /> {v.favorite_count}
            </span>
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <div className="text-xs text-slate-500">
          {v.brand?.name ?? 'Marka'} {v.model?.name ? `· ${v.model.name}` : ''} · {v.year}
        </div>
        <div className="line-clamp-1 text-sm font-semibold text-slate-900">{v.title}</div>
        <div className="grid grid-cols-2 gap-1 text-xs text-slate-600 pt-1">
          <Spec icon={<Settings2 className="h-3 w-3" />}>{formatKm(v.km)}</Spec>
          <Spec icon={<Fuel className="h-3 w-3" />}>{v.fuel}</Spec>
          <Spec icon={<Palette className="h-3 w-3" />}>{v.color ?? '-'}</Spec>
          <Spec icon={<MapPin className="h-3 w-3" />}>{v.city}</Spec>
        </div>
        <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="text-base font-extrabold text-brand-600">
            {formatPrice(isAuction && v.auction ? v.auction.current_price : v.price)}
          </span>
          {isAuction && v.auction && (
            <span className="text-xs text-slate-500">{v.auction.total_bids} teklif</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function ResultRow({ v, cat }: { v: AuctionVehicle; cat: Cat }) {
  const cover = v.images?.[0]?.url;
  const isAuction = cat !== 'free';
  return (
    <Link
      to={`/ilan/${v.id}`}
      className="card group flex flex-col sm:flex-row gap-3 p-3 transition hover:shadow-md"
    >
      <div className="relative sm:w-56 shrink-0">
        <div className="aspect-[4/3] sm:aspect-[4/3] w-full overflow-hidden rounded-lg bg-slate-100">
          {cover ? (
            <img src={cover} alt={v.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Car className="h-8 w-8" />
            </div>
          )}
        </div>
        {v.auction && cat === 'live' && (
          <div className="absolute right-2 bottom-2">
            <CountdownTimer target={v.auction.end_at ?? undefined} size="sm" glow />
          </div>
        )}
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <div className="text-xs text-slate-500">
              {v.brand?.name ?? 'Marka'} {v.model?.name ? `· ${v.model.name}` : ''} · {v.year}
            </div>
            <div className="text-base font-bold text-slate-900 line-clamp-1">{v.title}</div>
          </div>
          <div className="text-right">
            <div className="text-base font-extrabold text-brand-600">
              {formatPrice(isAuction && v.auction ? v.auction.current_price : v.price)}
            </div>
            {isAuction && v.auction && (
              <div className="text-xs text-slate-500">{v.auction.total_bids} teklif</div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-600">
          <Spec icon={<Settings2 className="h-3 w-3" />}>{formatKm(v.km)}</Spec>
          <Spec icon={<Fuel className="h-3 w-3" />}>{v.fuel}</Spec>
          <Spec icon={<Palette className="h-3 w-3" />}>{v.color ?? '-'}</Spec>
          <Spec icon={<MapPin className="h-3 w-3" />}>{v.city}</Spec>
        </div>
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {v.is_premium && <span className="badge bg-amber-500 text-white">PREMIUM</span>}
          {isAuction && cat !== 'sold' && (
            <span className="badge bg-red-600 text-white">
              {v.auction?.status === 'scheduled' ? 'YAKINDA' : 'CANLI'}
            </span>
          )}
          {cat === 'sold' && (
            <span className="badge bg-slate-800 text-white">SATILDI</span>
          )}
          {v.damage_record && <span className="badge bg-orange-100 text-orange-700">Hasar Kaydı Var</span>}
          {v.exchange_accepted && <span className="badge bg-blue-100 text-blue-700">Takas Kabul</span>}
        </div>
      </div>
    </Link>
  );
}

function Spec({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 truncate">
      {icon} {children}
    </span>
  );
}
