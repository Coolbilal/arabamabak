import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Car as CarIcon, MapPin, Gauge } from 'lucide-react';
import CountdownTimer from './CountdownTimer';
import { cn, formatKm, formatPrice } from '../lib/utils';
import { TRANSMISSION_LABELS, type VehicleWithRelations } from '../lib/types';

interface Props {
  auction: VehicleWithRelations;
  className?: string;
}

export default function AuctionCard({ auction, className }: Props) {
  const [imgError, setImgError] = useState(false);
  const a = auction.auction;
  const cover = auction.images?.[0]?.url;

  const live = a?.status === 'live';
  const scheduled = a?.status === 'scheduled';

  return (
    <div
      className={cn(
        'group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md',
        className,
      )}
    >
      <Link to={`/ilan/${auction.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {cover && !imgError ? (
            <img
              src={cover}
              alt={auction.title}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <CarIcon className="h-16 w-16" />
            </div>
          )}

          {auction.is_premium && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
              ★ Premium
            </span>
          )}

          {live && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md bg-red-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              CANLI
            </span>
          )}
          {scheduled && (
            <span className="absolute right-3 top-3 inline-flex items-center rounded-md bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md">
              YAKINDA
            </span>
          )}
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 text-sm font-semibold text-slate-800 min-h-[2.5rem]">
          {auction.title}
        </h3>
        <div className="mt-1 text-xs text-slate-500">
          {auction.brand?.name ?? '—'} {auction.model?.name ? `· ${auction.model.name}` : ''}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatKm(auction.km)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">⚙</span>
            <span>{TRANSMISSION_LABELS[auction.transmission]}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{auction.city}</span>
          </div>
        </div>

        {a && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg bg-slate-50 p-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Açılış Fiyatı</span>
              <span className="font-semibold text-slate-700">{formatPrice(a.opening_price)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Son Teklif</span>
              <span className="font-bold text-brand-600">{formatPrice(a.current_price)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Kalan Süre</span>
              <CountdownTimer target={a.end_at ?? undefined} glow={live} size="sm" format="auto" showMs />
            </div>
          </div>
        )}

        <Link
          to={`/ilan/${auction.id}`}
          className={cn(
            'mt-4 inline-flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold text-white transition',
            live ? 'bg-brand-600 hover:bg-brand-700' : 'bg-slate-900 hover:bg-slate-800',
          )}
        >
          {live ? 'Teklif Ver' : 'Arttırmayı Görüntüle'}
        </Link>
      </div>
    </div>
  );
}
