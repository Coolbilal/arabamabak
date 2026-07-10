import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { cn, formatKm, formatPrice } from '../lib/utils';
import { Countdown } from '../components/Countdown';
import { LiveBidPill } from '../components/LiveBidPill';
import type {
  Auction,
  Vehicle,
  VehicleBrand,
  VehicleImage,
  VehicleModel,
  VehicleWithRelations,
} from '../lib/types';
import {
  ArrowRight,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Fuel,
  Gavel,
  Heart,
  MapPin,
  Palette,
  Settings2,
  Star,
} from 'lucide-react';

type BannerVehicle = Vehicle & {
  brand: VehicleBrand | null;
  model: VehicleModel | null;
  images: VehicleImage[];
  auction?: Auction | null;
};

interface AdBannerItem {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
}

type AuctionVehicle = Vehicle & {
  brand: VehicleBrand | null;
  model: VehicleModel | null;
  images: VehicleImage[];
  auction: Auction | null;
};

export default function HomePage() {
  const premiumAuctionsQ = useQuery({
    queryKey: ['home', 'premium-auctions'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*), auction:auctions!auctions_vehicle_id_fkey(*)')
        .eq('is_premium', true)
        .eq('status', 'active')
        .eq('listing_type', 'premium_auction')
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const now = Date.now();
      return ((data ?? []) as unknown as BannerVehicle[]).filter((v) => {
        const a = (v as any).auction;
        if (!a) return true;
        if (a.status === 'live' || a.status === 'ended' || a.status === 'cancelled' || a.status === 'sold' || a.status === 'sold_pending_confirmation') return false;
        if (a.start_at && new Date(a.start_at).getTime() <= now) return false;
        return true;
      });
    },
  });

  const adBannersQ = useQuery({
    queryKey: ['home', 'ad-banners'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('id, title, description, image_url, link_url')
        .eq('is_active', true)
        .eq('display_position', 'hero_inline')
        .order('display_order', { ascending: true })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as AdBannerItem[];
    },
  });

  const siteSettingsQ = useQuery({
    queryKey: ['site-settings', 'slider-interval'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('premium_slider_interval_seconds')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return Number((data as any)?.premium_slider_interval_seconds ?? 5);
    },
  });

  const live = useQuery({
    queryKey: ['home', 'live'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(
          '*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*), auction:auctions!auctions_vehicle_id_fkey(*)',
        )
        .eq('status', 'active')
        .in('listing_type', ['auction', 'premium_auction'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      const all = (data ?? []) as unknown as AuctionVehicle[];
      // Sadece canlı mezatlar (scheduled'ler ayrı bölümde gösterilir)
      return all
        .filter((v) => v.auction && v.auction.status === 'live')
        .slice(0, 6);
    },
  });

  const upcoming = useQuery({
    queryKey: ['home', 'upcoming'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(
          '*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*), auction:auctions!auctions_vehicle_id_fkey(*)',
        )
        .eq('status', 'active')
        .in('listing_type', ['auction', 'premium_auction'])
        .order('created_at', { ascending: false })
        .limit(40);
      if (error) throw error;
      const now = new Date().toISOString();
      const all = (data ?? []) as unknown as AuctionVehicle[];
      return all
        .filter((v) => v.auction && v.auction.status === 'scheduled' && v.auction.start_at && v.auction.start_at > now)
        .sort((a, b) => ((a.auction?.start_at ?? '') > (b.auction?.start_at ?? '') ? 1 : -1))
        .slice(0, 6);
    },
  });

  const free = useQuery({
    queryKey: ['home', 'free'],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*)')
        .eq('listing_type', 'free')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8);
      if (error) throw error;
      return (data ?? []) as unknown as VehicleWithRelations[];
    },
  });

  return (
    <div className="bg-slate-50">
      {/* Premium Açık Arttırma İlan Panosu (Kayan) */}
      <section className="bg-gradient-to-b from-slate-50 to-white py-10">
        <div className="mx-auto max-w-7xl px-4">
          <PremiumAuctionSlider
            vehicles={premiumAuctionsQ.data ?? []}
            ads={adBannersQ.data ?? []}
            intervalSec={siteSettingsQ.data ?? 5}
            loading={premiumAuctionsQ.isLoading}
          />
        </div>
      </section>

      {/* Açık Arttırması Devam Eden */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader
            icon={<Gavel className="h-5 w-5 text-red-500" />}
            title="Açık Arttırması Devam Eden Araçlar"
            description="Şu anda canlı olan açık arttırmalara katılın"
            link={{ to: '/kategori/live', label: 'Tümünü Gör' }}
          />
          <AuctionGrid items={live.data ?? []} loading={live.isLoading} type="live" />
        </div>
      </section>

      {/* Açık Arttırmaya Çıkacak */}
      <section className="bg-white py-10 border-y border-slate-200">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader
            icon={<Calendar className="h-5 w-5 text-amber-500" />}
            title="Açık Arttırmaya Çıkacak Araçlar"
            description="Yakın zamanda başlayacak açık arttırmalar"
            link={{ to: '/kategori/upcoming', label: 'Tümünü Gör' }}
          />
          <AuctionGrid items={upcoming.data ?? []} loading={upcoming.isLoading} type="upcoming" />
        </div>
      </section>

      {/* Ücretsiz İlanlar */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4">
          <SectionHeader
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
            title="Ücretsiz İlanlar"
            description="Hemen sahibinden, komisyonsuz ilanlar"
            link={{ to: '/kategori/free', label: 'Tümünü Gör' }}
          />
          <VehicleGrid items={free.data ?? []} loading={free.isLoading} />
        </div>
      </section>

      {/* Kategori kartları */}
      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <CategoryCard
            to="/kategori/live"
            title="Canlı Açık Arttırma"
            description="Şu anda teklif verilebilen araçlar"
            tone="red"
            icon={<Gavel className="h-6 w-6" />}
          />
          <CategoryCard
            to="/kategori/upcoming"
            title="Yaklaşan Açık Arttırma"
            description="Yakında başlayacak araçlar"
            tone="amber"
            icon={<Calendar className="h-6 w-6" />}
          />
          <CategoryCard
            to="/kategori/free"
            title="Ücretsiz İlanlar"
            description="Sahibinden ilanlar, komisyon yok"
            tone="emerald"
            icon={<Car className="h-6 w-6" />}
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  link,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  link?: { to: string; label: string };
}) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 className="flex items-center gap-2 text-xl md:text-2xl font-bold text-slate-900">
          {icon} {title}
        </h2>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {link && (
        <Link
          to={link.to}
          className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          {link.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function CategoryCard({
  to,
  title,
  description,
  icon,
  tone,
}: {
  to: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  tone: 'red' | 'amber' | 'emerald';
}) {
  const toneCls =
    tone === 'red'
      ? 'from-red-500 to-red-700 text-white'
      : tone === 'amber'
        ? 'from-amber-400 to-amber-600 text-white'
        : 'from-emerald-500 to-emerald-700 text-white';
  return (
    <Link
      to={to}
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-gradient-to-br p-6 shadow-sm transition hover:shadow-md',
        toneCls,
      )}
    >
      <div className="absolute -right-6 -bottom-6 h-32 w-32 rounded-full bg-white/10 transition group-hover:scale-110" />
      <div className="relative">
        <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">
          {icon}
        </div>
        <div className="text-lg font-bold">{title}</div>
        <div className="text-sm text-white/80">{description}</div>
        <div className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
          Keşfet <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Premium Auction Slider (Kayan) ---------------- */

function PremiumAuctionSlider({
  vehicles,
  ads,
  intervalSec,
  loading,
}: {
  vehicles: BannerVehicle[];
  ads: AdBannerItem[];
  intervalSec: number;
  loading: boolean;
}) {
  // Her 2 ilan/banner'dan sonra 1 banner karışsın, tek kutu içinde 2'li kayar
  const slides = useMemo(() => {
    type SlideItem = { type: 'vehicle' | 'ad'; payload: BannerVehicle | AdBannerItem; key: string };
    const items: SlideItem[] = [];
    const vehList = vehicles.slice(0, 12);
    const adList = ads.slice(0, 6);
    let adCursor = 0;
    vehList.forEach((v, i) => {
      items.push({ type: 'vehicle', payload: v, key: `v-${v.id}` });
      // her 3 ilandan sonra 1 banner ekle (pairs oluşturmak için)
      if ((i + 1) % 3 === 0 && adCursor < adList.length) {
        items.push({ type: 'ad', payload: adList[adCursor++], key: `a-${adList[adCursor - 1].id}` });
      }
    });
    // Eğer hiç banner eklenmediyse ama banner varsa en sona 1 tane ekle
    if (adCursor === 0 && adList.length > 0) {
      items.push({ type: 'ad', payload: adList[0], key: `a-${adList[0].id}` });
    }
    // 2'li gruplara böl
    const pairs: SlideItem[][] = [];
    for (let i = 0; i < items.length; i += 2) {
      const pair = items.slice(i, i + 2);
      // Tek kaldıysa yanına boş bırak (grid tek satır gibi görünür)
      pairs.push(pair);
    }
    return pairs;
  }, [vehicles, ads]);
  const [idx, setIdx] = useState(0);
  const total = slides.length;

  useEffect(() => {
    if (total <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % total), Math.max(2, intervalSec) * 1000);
    return () => clearInterval(id);
  }, [total, intervalSec]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BannerSkeleton />
        <BannerSkeleton />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="card p-8 text-center text-slate-500">
        Şu anda premium açık arttırma ilanı bulunmuyor.
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div
        className="flex transition-transform duration-700 ease-in-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((pair, i) => (
          <div key={`slide-${i}`} className="w-full flex-shrink-0 px-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pair.map((s) =>
                s.type === 'ad' ? (
                  <AdBannerCard key={s.key} banner={s.payload as AdBannerItem} />
                ) : (
                  <PremiumAuctionCard key={s.key} v={s.payload as BannerVehicle} />
                ),
              )}
              {/* Tek kaldıysa dolu görünsün */}
              {pair.length === 1 && <div className="hidden md:block" />}
            </div>
          </div>
        ))}
      </div>
      {total > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {slides.map((pair, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Slide ${i + 1}`}
              className={cn(
                'h-2.5 rounded-full transition-all',
                i === idx
                  ? pair.some((s) => s.type === 'ad')
                    ? 'w-8 bg-rose-500'
                    : 'w-8 bg-amber-500'
                  : 'w-2.5 bg-slate-300 hover:bg-slate-400',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AdBannerCard({ banner }: { banner: AdBannerItem }) {
  const inner = (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md h-full">
      <div className="aspect-[16/9] w-full bg-slate-100">
        <img src={banner.image_url} alt={banner.title} className="h-full w-full object-cover transition group-hover:scale-105" />
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="badge bg-rose-600 text-white">REKLAM</span>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
        <div className="text-lg font-bold leading-tight line-clamp-1">{banner.title}</div>
        {banner.description && (
          <div className="text-xs opacity-90 line-clamp-1">{banner.description}</div>
        )}
      </div>
    </div>
  );
  if (banner.link_url) {
    return (
      <a
        href={banner.link_url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackAdClick(banner.id)}
        className="block h-full"
      >
        {inner}
      </a>
    );
  }
  return inner;
}

function trackAdClick(bannerId: string) {
  try {
    fetch('/api/track-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bannerId }),
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

function PremiumAuctionCard({ v }: { v: BannerVehicle }) {
  const cover = v.images?.[0]?.url;
  const a = (v as any).auction;
  const startAt = a?.start_at ? new Date(a.start_at).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(() =>
    startAt ? Math.max(0, startAt - Date.now()) : null,
  );

  useEffect(() => {
    if (!startAt) return;
    const tick = () => setRemaining(Math.max(0, startAt - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startAt]);

  return (
    <Link
      to={`/ilan/${v.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[16/9] w-full bg-slate-100">
        {cover ? (
          <img src={cover} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car className="h-16 w-16" />
          </div>
        )}
      </div>
      <div className="absolute top-3 left-3 flex items-center gap-2">
        <span className="badge bg-amber-500 text-white inline-flex items-center gap-1">
          <Star className="h-3 w-3 fill-current" /> PREMIUM
        </span>
        <span className="badge bg-red-600 text-white">AÇIK ARTTIRMA</span>
      </div>
      {remaining !== null && (
        <div className="absolute top-3 right-3">
          <span className="badge bg-black/70 text-white tabular-nums">
            <Clock className="h-3 w-3 mr-1" />
            {formatRemaining(remaining)}
          </span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
        <div className="text-sm opacity-90">
          {v.brand?.name ?? 'Marka'} {v.model?.name ?? ''} · {v.year}
        </div>
        <div className="text-lg font-bold leading-tight line-clamp-1">{v.title}</div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-xl font-extrabold text-amber-300">{formatPrice(v.price)}</span>
          <span className="inline-flex items-center gap-1 text-xs opacity-90">
            <Gavel className="h-3.5 w-3.5" /> Açık Arttırma
          </span>
        </div>
      </div>
    </Link>
  );
}

function formatRemaining(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}g ${h}s`;
  if (h > 0) return `${h}s ${m}dk`;
  if (m > 0) return `${m}dk ${s}sn`;
  return `${s}sn`;
}

function BannerSkeleton() {
  return (
    <div className="aspect-[16/9] w-full animate-pulse rounded-2xl bg-slate-200" />
  );
}

/* ---------------- Auction Grid (live / upcoming) ---------------- */

function AuctionGrid({
  items,
  loading,
  type,
}: {
  items: AuctionVehicle[];
  loading: boolean;
  type: 'live' | 'upcoming';
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500">
        {type === 'live'
          ? 'Şu anda devam eden açık arttırma bulunmuyor.'
          : 'Yaklaşan açık arttırma planlanmadı.'}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((v) => (
        <AuctionCard key={v.id} v={v} type={type} />
      ))}
    </div>
  );
}

function AuctionCard({ v, type }: { v: AuctionVehicle; type: 'live' | 'upcoming' }) {
  const cover = v.images?.[0]?.url;
  const isUpcoming = type === 'upcoming';
  const currentBid = v.auction?.current_price ?? v.price;
  const openingBid = v.auction?.opening_price ?? v.price;
  const totalBids = v.auction?.total_bids ?? 0;

  return (
    <Link
      to={`/ilan/${v.id}`}
      className={cn(
        'card group overflow-hidden transition hover:shadow-md',
        !isUpcoming && 'ring-2 ring-emerald-200 hover:ring-emerald-400',
      )}
    >
      <div className="relative aspect-[16/10] w-full bg-slate-100">
        {cover ? (
          <img src={cover} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car className="h-12 w-12" />
          </div>
        )}

        {/* Sol üst: badge'ler */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {v.is_premium && <span className="badge bg-amber-500 text-white">PREMIUM</span>}
          <span className={cn(
            'badge inline-flex items-center gap-1',
            isUpcoming ? 'bg-amber-100 text-amber-800' : 'bg-red-600 text-white',
          )}>
            {!isUpcoming && <span className="inline-block h-1.5 w-1.5 rounded-full bg-white animate-pulse-dot" />}
            {isUpcoming ? 'YAKINDA' : 'CANLI'}
          </span>
        </div>

        {/* Sağ alt: countdown */}
        {v.auction && !isUpcoming && v.auction.live_ends_at && (
          <div className="absolute bottom-2 right-2 rounded-md bg-red-600/95 px-2.5 py-1 ring-2 ring-red-300 shadow-lg shadow-red-500/40 animate-pulse-glow">
            <Countdown target={v.auction.live_ends_at} format="short" className="text-white font-extrabold" />
          </div>
        )}
        {v.auction && isUpcoming && v.auction.start_at && (
          <div className="absolute bottom-2 right-2 rounded-md bg-slate-900/90 px-2 py-1">
            <Countdown target={v.auction.start_at} format="full" className="text-white" />
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

        {/* Alt kısım: fiyat + teklif */}
        <div className="mt-2 border-t border-slate-100 pt-2">
          {isUpcoming ? (
            // Scheduled: Açılış Fiyatı (normal stil, yanıp-sönme yok)
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-500 uppercase tracking-wide">Açılış Fiyatı</div>
                <div className="text-base font-extrabold text-brand-600">{formatPrice(openingBid)}</div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-slate-500">Başlangıç</div>
                <div className="text-xs font-medium text-slate-700">
                  {v.auction?.start_at
                    ? new Date(v.auction.start_at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })
                    : '—'}
                </div>
              </div>
            </div>
          ) : (
            // Live: yeşil yanıp-sönen Son Teklif pill
            <div className="flex items-center justify-between gap-2">
              <LiveBidPill amount={currentBid} totalBids={totalBids} size="sm" />
              <div className="text-right text-[10px] text-slate-500">
                <Clock className="inline h-3 w-3 mr-0.5" />
                Bitiş
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Free Vehicle Grid ---------------- */

function VehicleGrid({ items, loading }: { items: VehicleWithRelations[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return (
      <div className="card p-10 text-center text-slate-500">Henüz ücretsiz ilan yok.</div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((v) => (
        <VehicleCard key={v.id} v={v} />
      ))}
    </div>
  );
}

function VehicleCard({ v }: { v: VehicleWithRelations }) {
  const cover = v.images?.[0]?.url;
  return (
    <Link to={`/ilan/${v.id}`} className="card group overflow-hidden transition hover:shadow-md">
      <div className="relative aspect-[4/3] w-full bg-slate-100">
        {cover ? (
          <img src={cover} alt={v.title} className="h-full w-full object-cover transition group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Car className="h-10 w-10" />
          </div>
        )}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {v.favorite_count > 0 && (
            <span className="badge bg-white/90 text-rose-600">
              <Heart className="h-3 w-3 mr-0.5" /> {v.favorite_count}
            </span>
          )}
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        <div className="text-[11px] text-slate-500">
          {v.brand?.name ?? 'Marka'} {v.model?.name ? `· ${v.model.name}` : ''} · {v.year}
        </div>
        <div className="line-clamp-1 text-sm font-semibold text-slate-900">{v.title}</div>
        <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
          <Spec icon={<Settings2 className="h-3 w-3" />}>{formatKm(v.km)}</Spec>
          <Spec icon={<Fuel className="h-3 w-3" />}>{v.fuel}</Spec>
        </div>
        <div className="mt-1 flex items-center justify-between border-t border-slate-100 pt-2">
          <span className="text-base font-extrabold text-slate-900">{formatPrice(v.price)}</span>
          <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-500">
            <MapPin className="h-3 w-3" /> {v.city}
          </span>
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

function CardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[4/3] w-full animate-pulse bg-slate-200" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}
