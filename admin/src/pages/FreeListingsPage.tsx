import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ListChecks, Search, Filter, X, Loader2, AlertCircle, Check,
  XCircle, Ban, RefreshCw, ImageOff, Heart, Eye,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, cn } from '../lib/utils';
import type { Vehicle, ListingStatus, VehicleImage } from '../lib/types';

type FreeRow = Vehicle & {
  brand?: { name: string } | null;
  model?: { name: string } | null;
  images?: VehicleImage[];
  seller?: { full_name: string | null; email: string | null } | null;
};

const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Taslak', pending: 'Onay Bekliyor', active: 'Yayında',
  sold: 'Satıldı',
  sold_pending_confirmation: 'Onay Bekliyor (Satıcı)', expired: 'Süresi Doldu', rejected: 'Reddedildi', cancelled: 'İptal',
};
const STATUS_CLASS: Record<ListingStatus, string> = {
  draft: 'bg-slate-100 text-slate-700',
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  sold: 'bg-blue-100 text-blue-700',
  sold_pending_confirmation: 'bg-purple-100 text-purple-700',
  expired: 'bg-slate-200 text-slate-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export default function FreeListingsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ row: FreeRow; action: 'reject' | 'cancel' } | null>(null);

  const canApprove = hasPermission('free_listings', 'approve');
  const canEdit = hasPermission('free_listings', 'edit');

  // ---- Listings ----
  const listingsQ = useQuery({
    queryKey: ['free-listings', statusFilter, cityFilter, brandFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('vehicles')
        .select('*, vehicle_brands!vehicles_brand_id_fkey(name), vehicle_models(name), profiles:seller_id(full_name,email)')
        .eq('listing_type', 'free')
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as ListingStatus);
      if (cityFilter !== 'all') q = q.eq('city', cityFilter);
      if (brandFilter !== 'all') q = q.eq('brand_id', brandFilter);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as FreeRow[];
      // Her satır için ilk görseli ayrıca çek (sade görsel önizleme için)
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: imgs } = await supabase
          .from('vehicle_images')
          .select('id,vehicle_id,url,sort_order,created_at')
          .in('vehicle_id', ids)
          .order('sort_order', { ascending: true });
        const byVehicle: Record<string, VehicleImage[]> = {};
        ((imgs ?? []) as VehicleImage[]).forEach((img) => {
          if (!byVehicle[img.vehicle_id]) byVehicle[img.vehicle_id] = [];
          byVehicle[img.vehicle_id].push(img);
        });
        rows.forEach((r) => { r.images = byVehicle[r.id] || []; });
      }
      return rows;
    },
  });

  // ---- Brands (filtre) ----
  const brandsQ = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands').select('id,name').eq('is_active', true).order('name');
      if (error) throw error;
      return data ?? [];
    },
  });

  // Şehir listesi (distinct, basit)
  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    ((listingsQ.data ?? []) as FreeRow[]).forEach((r) => { if (r.city) set.add(r.city); });
    return Array.from(set).sort();
  }, [listingsQ.data]);

  const filtered = useMemo(() => {
    const rows = (listingsQ.data ?? []) as FreeRow[];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      (r.title || '').toLowerCase().includes(s) ||
      (r.brand?.name || '').toLowerCase().includes(s) ||
      (r.model?.name || '').toLowerCase().includes(s)
    );
  }, [listingsQ.data, search]);

  // ---- Mutations ----
  const setStatusM = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ListingStatus }) => {
      const { error } = await supabase
        .from('vehicles').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['free-listings'] });
      const labels: Record<string, string> = {
        active: 'İlan onaylandı ve yayına alındı.',
        rejected: 'İlan reddedildi.',
        cancelled: 'İlan yayından kaldırıldı.',
      };
      setActionMsg({ kind: 'ok', text: labels[vars.status] || 'İşlem tamamlandı.' });
      setConfirmAction(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => {
      setActionMsg({ kind: 'err', text: e?.message || 'İşlem başarısız.' });
    },
  });

  function clearFilters() {
    setStatusFilter('all');
    setCityFilter('all');
    setBrandFilter('all');
    setSearch('');
  }

  function handleApprove(row: FreeRow) {
    if (!canApprove) return;
    setStatusM.mutate({ id: row.id, status: 'active' });
  }
  function handleReject(row: FreeRow) {
    if (!canApprove) return;
    setStatusM.mutate({ id: row.id, status: 'rejected' });
  }
  function handleCancel(row: FreeRow) {
    if (!canEdit) return;
    setStatusM.mutate({ id: row.id, status: 'cancelled' });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ListChecks className="h-6 w-6 text-sky-600" /> Ücretsiz İlanlar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Onay bekleyenleri incele, reddet veya yayına al. Yayındaki ilanları kaldır.
          </p>
        </div>
        <button onClick={() => listingsQ.refetch()} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg p-3 text-sm',
          actionMsg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {actionMsg.kind === 'ok' ? <Check className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {actionMsg.text}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-slate-500" />
          <span className="text-sm font-semibold text-slate-700">Filtreler</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text" placeholder="Ara..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="input pl-9"
            />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Onay Bekliyor</option>
            <option value="active">Yayında</option>
            <option value="rejected">Reddedildi</option>
            <option value="cancelled">İptal</option>
            <option value="sold">Satıldı</option>
            <option value="expired">Süresi Doldu</option>
          </select>
          <select className="input" value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}>
            <option value="all">Tüm Şehirler</option>
            {cityOptions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input" value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)}>
            <option value="all">Tüm Markalar</option>
            {(brandsQ.data ?? []).map((b: any) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
        {(statusFilter !== 'all' || cityFilter !== 'all' || brandFilter !== 'all' || search) && (
          <button onClick={clearFilters} className="mt-3 text-xs text-sky-600 hover:underline inline-flex items-center gap-1">
            <X className="h-3 w-3" /> Filtreleri temizle
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {listingsQ.isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
          </div>
        ) : listingsQ.isError ? (
          <div className="p-6 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="h-4 w-4" /> İlanlar yüklenemedi.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-20">Görsel</th>
                  <th className="text-left px-4 py-3 font-medium">Başlık</th>
                  <th className="text-left px-4 py-3 font-medium">Marka / Model</th>
                  <th className="text-right px-4 py-3 font-medium">Fiyat</th>
                  <th className="text-left px-4 py-3 font-medium">Şehir</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-right px-4 py-3 font-medium">İstatistik</th>
                  <th className="text-right px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const thumb = row.images?.[0]?.url;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2">
                        {thumb ? (
                          <img src={thumb} alt="" className="h-12 w-16 object-cover rounded border border-slate-200" />
                        ) : (
                          <div className="h-12 w-16 rounded border border-dashed border-slate-300 flex items-center justify-center text-slate-300">
                            <ImageOff className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800 line-clamp-1">{row.title}</div>
                        <div className="text-xs text-slate-400">{row.year} • {row.km.toLocaleString('tr-TR')} km</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {row.brand?.name || '—'} {row.model?.name && `/ ${row.model.name}`}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatPrice(row.price)}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{row.city}</td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_CLASS[row.status])}>
                          {STATUS_LABELS[row.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-slate-500">
                        <div className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {row.view_count}</div>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <div className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {row.favorite_count}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {row.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(row)}
                                disabled={!canApprove || setStatusM.isPending}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Check className="h-3.5 w-3.5" /> Onayla
                              </button>
                              <button
                                onClick={() => setConfirmAction({ row, action: 'reject' })}
                                disabled={!canApprove || setStatusM.isPending}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reddet
                              </button>
                            </>
                          )}
                          {row.status === 'active' && (
                            <button
                              onClick={() => setConfirmAction({ row, action: 'cancel' })}
                              disabled={!canEdit || setStatusM.isPending}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Ban className="h-3.5 w-3.5" /> Kaldır
                            </button>
                          )}
                          {row.status === 'rejected' && canEdit && (
                            <button
                              onClick={() => handleApprove(row)}
                              disabled={setStatusM.isPending}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                            >
                              <Check className="h-3.5 w-3.5" /> Onayla
                            </button>
                          )}
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

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                {confirmAction.action === 'reject' ? 'İlanı Reddet' : 'İlanı Yayından Kaldır'}
              </h3>
              <button onClick={() => setConfirmAction(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-sm text-slate-600">
                <strong>{confirmAction.row.title}</strong> ilanı
                {confirmAction.action === 'reject' ? ' reddedilecek' : ' yayından kaldırılacak'}. Onaylıyor musunuz?
              </p>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)} className="btn-secondary">Vazgeç</button>
              <button
                onClick={() => {
                  if (confirmAction.action === 'reject') handleReject(confirmAction.row);
                  else handleCancel(confirmAction.row);
                }}
                disabled={setStatusM.isPending}
                className="btn-danger"
              >
                {setStatusM.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : confirmAction.action === 'reject' ? 'Reddet' : 'Yayından Kaldır'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
