import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, MapPin, Gauge, Calendar, Car as CarIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatKm, formatPrice } from '../lib/utils';
import type { VehicleWithRelations } from '../lib/types';

interface Props {
  vehicle: VehicleWithRelations;
  className?: string;
}

export default function VehicleCard({ vehicle, className }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [imgError, setImgError] = useState(false);

  const cover = vehicle.images?.[0]?.url;

  // Kullanıcının bu ilanı favorileyip favorilemediğini kontrol et
  const favQuery = useQuery({
    queryKey: ['favorite', vehicle.id, user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', user.id)
        .eq('vehicle_id', vehicle.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Giriş yapmalısınız');
      const existing = favQuery.data;
      if (existing) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('vehicle_id', vehicle.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, vehicle_id: vehicle.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorite', vehicle.id, user?.id] });
      qc.invalidateQueries({ queryKey: ['favorites'] });
    },
    onError: (err: Error) => {
      alert(err.message || 'Favori işlemi başarısız');
    },
  });

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate('/giris');
      return;
    }
    toggleFav.mutate();
  };

  const isFav = !!favQuery.data;
  const year = vehicle.year;

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md',
        className,
      )}
    >
      <Link to={`/ilan/${vehicle.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {cover && !imgError ? (
            <img
              src={cover}
              alt={vehicle.title}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <CarIcon className="h-16 w-16" />
            </div>
          )}

          {vehicle.is_premium && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-amber-600 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow">
              ★ Premium
            </span>
          )}

          {vehicle.listing_type !== 'free' && (
            <span className="absolute right-3 top-3 badge bg-brand-600 text-white">
              {vehicle.listing_type === 'premium_auction' ? 'Premium Arttırma' : 'Açık Arttırma'}
            </span>
          )}
        </div>
      </Link>

      <button
        type="button"
        onClick={handleFavClick}
        disabled={toggleFav.isPending}
        aria-label={isFav ? 'Favoriden kaldır' : 'Favoriye ekle'}
        className={cn(
          'absolute right-3 bottom-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur transition hover:scale-110',
          isFav ? 'text-brand-600' : 'text-slate-500 hover:text-brand-600',
        )}
      >
        <Heart className={cn('h-4 w-4', isFav && 'fill-current')} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <div className="text-lg font-extrabold text-slate-900">{formatPrice(vehicle.price)}</div>
        <h3 className="mt-1 line-clamp-2 text-sm font-semibold text-slate-800 min-h-[2.5rem]">
          {vehicle.title}
        </h3>
        <div className="mt-1 text-xs text-slate-500">
          {vehicle.brand?.name ?? '—'} {vehicle.model?.name ? `· ${vehicle.model.name}` : ''}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-slate-400" />
            <span>{year}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <span>{formatKm(vehicle.km)}</span>
          </div>
          <div className="col-span-2 flex items-center gap-1.5 truncate">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span className="truncate">
              {vehicle.city}
              {vehicle.district ? ` / ${vehicle.district}` : ''}
            </span>
          </div>
        </div>

        <Link
          to={`/ilan/${vehicle.id}`}
          className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          Detay Gör
        </Link>
      </div>
    </div>
  );
}
