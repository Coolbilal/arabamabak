import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Car as CarIcon, Edit, ExternalLink, Eye, Heart, Loader, ListChecks, Save, Trash2, X, EyeOff,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatNumber, formatPrice } from '../lib/utils';
import type { ListingStatus, VehicleWithRelations } from '../lib/types';

const STATUS_STYLES: Record<ListingStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  sold: 'bg-blue-100 text-blue-800',
  sold_pending_confirmation: 'bg-purple-100 text-purple-800',
  expired: 'bg-orange-100 text-orange-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-200 text-slate-700',
};

const editSchema = z.object({
  title: z.string().min(3, 'Başlık en az 3 karakter').max(120),
  price: z.number().positive('Fiyat pozitif olmalı'),
});

type EditValues = z.infer<typeof editSchema>;

export default function MyListingsPage() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/giris" replace />;

  const qc = useQueryClient();
  const [editing, setEditing] = useState<VehicleWithRelations | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<VehicleWithRelations | null>(null);

  const listQuery = useQuery({
    queryKey: ['my-listings', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select('*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*)')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VehicleWithRelations[];
    },
  });

  const deactivate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-listings', user.id] });
    },
    onError: (err: Error) => alert(err.message || 'İşlem başarısız'),
  });

  const reactivate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('vehicles')
        .update({ status: 'active' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-listings', user.id] });
    },
    onError: (err: Error) => alert(err.message || 'İşlem başarısız'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      // 1) Önce bağlı resimleri storage'dan temizle
      const { data: imgs } = await supabase
        .from('vehicle_images').select('url').eq('vehicle_id', id);
      if (imgs && imgs.length > 0) {
        for (const img of imgs) {
          // URL → path dönüşümü
          try {
            const url = new URL(img.url);
            const pathParts = url.pathname.split('/storage/v1/object/public/');
            if (pathParts[1]) {
              const [bucket, ...rest] = pathParts[1].split('/');
              const filePath = rest.join('/');
              await supabase.storage.from(bucket).remove([filePath]);
            }
          } catch (e) {
            // URL parse hatası → yoksay
          }
        }
      }
      // 2) Vehicle'ı sil (vehicle_images, auctions, bids, favorites cascade ile silinir)
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-listings', user.id] });
      qc.invalidateQueries({ queryKey: ['home'] });
      qc.invalidateQueries({ queryKey: ['category'] });
      qc.invalidateQueries({ queryKey: ['public-auctions'] });
      setConfirmDelete(null);
    },
    onError: (err: Error) => alert(err.message || 'Silinemedi. Yetkiniz olmayabilir veya ilişkili kayıtlar mevcut.'),
  });

  const items = listQuery.data ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ListChecks className="h-6 w-6 text-brand-600" />
          <h1 className="text-2xl font-extrabold text-slate-900">İlanlarım</h1>
          <span className="badge bg-slate-100 text-slate-700">{items.length}</span>
        </div>
        <Link to="/ilan-ver" className="btn-primary">
          Yeni İlan Ver
        </Link>
      </div>

      <div className="card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
            <Loader className="h-5 w-5 animate-spin" /> Yükleniyor...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
              <CarIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Henüz ilanınız yok</h2>
            <p className="text-sm text-slate-500">İlk ilanınızı oluşturarak başlayın.</p>
            <Link to="/ilan-ver" className="btn-primary">İlan Ver</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">İlan</th>
                  <th className="px-4 py-3 text-left">Marka / Model</th>
                  <th className="px-4 py-3 text-right">Fiyat</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-right">Görüntülenme</th>
                  <th className="px-4 py-3 text-right">Favori</th>
                  <th className="px-4 py-3 text-right">Aksiyonlar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((v) => {
                  const cover = v.images?.[0]?.url;
                  return (
                    <tr key={v.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-slate-100">
                            {cover ? (
                              <img src={cover} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-300">
                                <CarIcon className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="line-clamp-1 font-semibold text-slate-900">{v.title}</div>
                            <div className="text-xs text-slate-500">
                              {v.year} · {formatNumber(v.km)} km
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {v.brand?.name ?? '—'} {v.model?.name ? `· ${v.model.name}` : ''}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums text-slate-900">
                        {formatPrice(v.price)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', STATUS_STYLES[v.status])}>
                          {labelFor(v.status)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          {formatNumber(v.view_count)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-slate-700 tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5 text-slate-400" />
                          {formatNumber(v.favorite_count)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <a
                            href={`/ilan/${v.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                            title="Görüntüle"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => setEditing(v)}
                            className="rounded-md p-1.5 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                            title="Düzenle"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {v.status === 'active' ? (
                            <button
                              type="button"
                              onClick={() => deactivate.mutate(v.id)}
                              className="rounded-md p-1.5 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700"
                              title="Yayından Kaldır"
                            >
                              <EyeOff className="h-4 w-4" />
                            </button>
                          ) : v.status === 'cancelled' || v.status === 'expired' ? (
                            <button
                              type="button"
                              onClick={() => reactivate.mutate(v.id)}
                              className="rounded-md p-1.5 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                              title="Yayına Al"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(v)}
                            className="rounded-md p-1.5 text-slate-500 transition hover:bg-red-50 hover:text-red-700"
                            title="Sil"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <EditModal
          vehicle={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ['my-listings', user.id] });
          }}
        />
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          vehicle={confirmDelete}
          onCancel={() => setConfirmDelete(null)}
          onConfirm={() => remove.mutate(confirmDelete.id)}
          pending={remove.isPending}
        />
      )}
    </div>
  );
}

function labelFor(s: ListingStatus): string {
  const map: Record<ListingStatus, string> = {
    draft: 'Taslak',
    pending: 'Onay Bekliyor',
    active: 'Yayında',
    sold: 'Satıldı',
    sold_pending_confirmation: 'Onay Bekliyor (Satıcı)',
    expired: 'Süresi Doldu',
    rejected: 'Reddedildi',
    cancelled: 'İptal',
  };
  return map[s] ?? s;
}

function EditModal({
  vehicle, onClose, onSaved,
}: { vehicle: VehicleWithRelations; onClose: () => void; onSaved: () => void }) {
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: vehicle.title, price: vehicle.price },
  });

  const save = useMutation({
    mutationFn: async (vals: EditValues) => {
      const { error } = await supabase
        .from('vehicles')
        .update({ title: vals.title.trim(), price: vals.price })
        .eq('id', vehicle.id);
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError: (err: Error) => alert(err.message || 'Kayıt başarısız'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div className="card w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-bold text-slate-900">İlanı Düzenle</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Başlık *</label>
            <input className={cn('input', errors.title && 'border-red-400')} {...register('title')} />
            {errors.title && <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>}
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Fiyat (₺) *</label>
            <input type="number" step="0.01" className={cn('input', errors.price && 'border-red-400')} {...register('price', { valueAsNumber: true })} />
            {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
            <button type="submit" disabled={save.isPending} className="btn-primary">
              {save.isPending ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  vehicle, onCancel, onConfirm, pending,
}: { vehicle: VehicleWithRelations; onCancel: () => void; onConfirm: () => void; pending: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in" onClick={onCancel}>
      <div className="card w-full max-w-sm overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-5">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <h3 className="text-base font-bold text-slate-900">İlanı silmek istediğinizden emin misiniz?</h3>
          <p className="mt-1 text-sm text-slate-500">
            <b>{vehicle.title}</b> ilanı kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={onCancel} className="btn-secondary">Vazgeç</button>
            <button type="button" onClick={onConfirm} disabled={pending} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:opacity-50">
              {pending ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Evet, Sil
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
