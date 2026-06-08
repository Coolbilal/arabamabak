import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Crown, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn, formatPrice } from '../lib/utils';
import type { VehicleWithRelations } from '../lib/types';

const AUTO_MS = 5000;

export default function PremiumBanner() {
  const [start, setStart] = useState(0);
  const timer = useRef<number | null>(null);

  const { data: vehicles } = useQuery({
    queryKey: ['premium-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*)')
        .eq('is_premium', true)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(12);
      if (error) throw error;
      return (data ?? []) as unknown as VehicleWithRelations[];
    },
  });

  const list = vehicles ?? [];

  useEffect(() => {
    if (list.length <= 2) return;
    timer.current = window.setInterval(() => {
      setStart((s) => (s + 1) % list.length);
    }, AUTO_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [list.length]);

  if (list.length === 0) return null;

  // 2 banner aynı anda görünür, döngüsel pencere
  const visible = [0, 1].map((i) => list[(start + i) % list.length]);

  const prev = () => setStart((s) => (s - 1 + list.length) % list.length);
  const next = () => setStart((s) => (s + 1) % list.length);

  const dotsCount = Math.max(1, list.length);
  const currentDot = start;

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-900">Premium Vitrin</h2>
          <span className="badge bg-amber-100 text-amber-700">Öne Çıkanlar</span>
        </div>
        <Link to="/kategori/free" className="text-xs font-semibold text-brand-600 hover:underline">
          Tümünü Gör →
        </Link>
      </div>

      <div className="relative">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {visible.map((v, idx) => (
            <BannerCard key={`${v.id}-${idx}-${start}`} vehicle={v} />
          ))}
        </div>

        {list.length > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              aria-label="Önceki"
              className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5 text-slate-700" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Sonraki"
              className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-slate-50"
            >
              <ChevronRight className="h-5 w-5 text-slate-700" />
            </button>
          </>
        )}
      </div>

      {dotsCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: dotsCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStart(i)}
              aria-label={`Banner ${i + 1}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === currentDot ? 'w-6 bg-brand-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400',
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function BannerCard({ vehicle }: { vehicle: VehicleWithRelations }) {
  const cover = vehicle.images?.[0]?.url;
  return (
    <Link
      to={`/ilan/${vehicle.id}`}
      className="group relative block aspect-[16/7] overflow-hidden rounded-2xl bg-slate-900 shadow-md"
    >
      {cover ? (
        <img
          src={cover}
          alt={vehicle.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900" />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15" />
      <div className="absolute inset-0 flex flex-col justify-center p-6 md:p-8">
        <span className="mb-2 inline-flex w-fit items-center gap-1.5 rounded-md bg-amber-500/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          <Sparkles className="h-3 w-3" /> Premium
        </span>
        <div className="text-xs font-semibold uppercase tracking-wider text-amber-300">
          {vehicle.brand?.name ?? ''}
        </div>
        <h3 className="mt-1 line-clamp-2 text-xl font-extrabold text-white md:text-2xl">
          {vehicle.title}
        </h3>
        <div className="mt-1 text-sm text-white/80">
          {vehicle.brand?.name ?? '—'} {vehicle.model?.name ? `· ${vehicle.model.name}` : ''} · {vehicle.year}
        </div>
        <div className="mt-3 text-2xl font-extrabold text-white md:text-3xl">
          {formatPrice(vehicle.price)}
        </div>
        <div className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-bold text-slate-900 transition group-hover:bg-amber-400 group-hover:text-slate-900">
          Hemen Teklif Ver →
        </div>
      </div>
    </Link>
  );
}
