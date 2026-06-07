import { Link, Navigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import VehicleCard from '../components/VehicleCard';
import type { VehicleWithRelations } from '../lib/types';

interface FavRow {
  vehicle_id: string;
  created_at: string;
  vehicles: VehicleWithRelations | null;
}

export default function FavoritesPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/giris" replace />;

  const qc = useQueryClient();

  const favQuery = useQuery({
    queryKey: ['favorites', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('vehicle_id, created_at, vehicles(*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FavRow[];
    },
  });

  const removeFav = useMutation({
    mutationFn: async (vehicleId: string) => {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('vehicle_id', vehicleId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['favorites', user.id] });
    },
    onError: (err: Error) => alert(err.message || 'İşlem başarısız'),
  });

  const items = (favQuery.data ?? [])
    .map((row) => row.vehicles)
    .filter((v): v is VehicleWithRelations => !!v);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center gap-2">
        <Heart className="h-6 w-6 fill-current text-brand-600" />
        <h1 className="text-2xl font-extrabold text-slate-900">Favorilerim</h1>
        <span className="badge bg-slate-100 text-slate-700">{items.length}</span>
      </div>

      {favQuery.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-20 text-slate-500">
          <Loader className="h-5 w-5 animate-spin" /> Yükleniyor...
        </div>
      ) : items.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-50">
            <Heart className="h-8 w-8 text-brand-600" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Henüz favori ilanınız yok</h2>
          <p className="max-w-md text-sm text-slate-500">
            Araç detay sayfasındaki kalp ikonuna tıklayarak favorilere ekleyebilirsiniz.
          </p>
          <Link to="/" className="btn-primary mt-2">
            İlanlara Göz At
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((v) => (
            <div key={v.id} className="relative">
              <VehicleCard vehicle={v} />
              <button
                type="button"
                onClick={() => removeFav.mutate(v.id)}
                disabled={removeFav.isPending}
                className="absolute right-3 top-3 z-20 inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-brand-700 shadow transition hover:bg-rose-50"
              >
                <Heart className="h-3.5 w-3.5 fill-current" />
                Favoriden Kaldır
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
