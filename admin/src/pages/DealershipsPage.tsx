import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check, X, Pause, Play, Eye, Search, Building2, MapPin,
  Phone, Mail, Hash, Calendar, FileText, RefreshCw, AlertCircle, ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, formatPrice } from '../lib/utils';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import ConfirmDialog from '../components/ConfirmDialog';
import type { DealershipStatus } from '../lib/types';

interface DealershipRow {
  id: string;
  owner_id: string;
  name: string;
  tax_number: string | null;
  city: string;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  description: string | null;
  status: DealershipStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
  owner?: { id: string; full_name: string | null; email: string | null; phone: string | null } | null;
}

interface DealershipVehicle {
  id: string;
  title: string;
  status: string;
  price: number;
  city: string;
  created_at: string;
  brand?: { name: string } | null;
  model?: { name: string } | null;
  images?: { url: string }[] | null;
}

const STATUS_LABELS: Record<DealershipStatus, string> = {
  pending: 'Onay Bekliyor',
  active: 'Aktif',
  suspended: 'Askıda',
  rejected: 'Reddedildi',
};

const STATUS_BADGE: Record<DealershipStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-emerald-100 text-emerald-700',
  suspended: 'bg-orange-100 text-orange-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function DealershipsPage() {
  const { hasPermission, admin } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DealershipStatus>('all');
  const [detailRow, setDetailRow] = useState<DealershipRow | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<DealershipRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = hasPermission('dealerships', 'view');
  const canEdit = hasPermission('dealerships', 'edit');
  const canApprove = hasPermission('dealerships', 'approve');

  const dealershipsQuery = useQuery({
    queryKey: ['dealerships'],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dealerships')
        .select(`
          id, owner_id, name, tax_number, city, district, address, phone, email,
          logo_url, description, status, approved_at, approved_by, created_at, updated_at,
          owner:profiles!dealerships_owner_id_fkey(id, full_name, email, phone)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => {
        const owner = Array.isArray(d.owner) ? d.owner[0] : d.owner;
        return { ...d, owner: owner ?? null } as DealershipRow;
      });
    },
  });

  const vehiclesQuery = useQuery({
    queryKey: ['dealership-vehicles', detailRow?.id],
    enabled: !!detailRow,
    queryFn: async () => {
      if (!detailRow) return [];
      const { data, error } = await supabase
        .from('vehicles')
        .select(`
          id, title, status, price, city, created_at,
          brand:vehicle_brands(name),
          model:vehicle_models(name),
          images:vehicle_images(url)
        `)
        .eq('dealership_id', detailRow.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []).map((v: any) => ({
        ...v,
        brand: Array.isArray(v.brand) ? v.brand[0] : v.brand,
        model: Array.isArray(v.model) ? v.model[0] : v.model,
        images: Array.isArray(v.images) ? v.images : [],
      })) as DealershipVehicle[];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ row, status }: { row: DealershipRow; status: DealershipStatus }) => {
      const payload: Record<string, unknown> = { status };
      if (status === 'active') {
        payload.approved_at = new Date().toISOString();
        payload.approved_by = admin?.id ?? null;
      }
      const { error } = await supabase.from('dealerships').update(payload).eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['dealerships'] });
      if (detailRow?.id === vars.row.id) setDetailRow({ ...detailRow, status: vars.status });
    },
    onError: (e: any) => setError(e?.message || 'Güncellenemedi'),
  });

  const filtered = useMemo(() => {
    const list = dealershipsQuery.data ?? [];
    return list.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q) ||
        (r.owner?.full_name ?? '').toLowerCase().includes(q) ||
        (r.tax_number ?? '').toLowerCase().includes(q)
      );
    });
  }, [dealershipsQuery.data, statusFilter, search]);

  const stats = useMemo(() => {
    const list = dealershipsQuery.data ?? [];
    return {
      total: list.length,
      pending: list.filter((r) => r.status === 'pending').length,
      active: list.filter((r) => r.status === 'active').length,
      suspended: list.filter((r) => r.status === 'suspended').length,
    };
  }, [dealershipsQuery.data]);

  const columns: DataTableColumn<DealershipRow>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Bayi Adı',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              {row.logo_url ? (
                <img src={row.logo_url} alt={row.name} className="h-9 w-9 rounded-lg object-cover" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 truncate">{row.name}</div>
              <div className="text-xs text-slate-500 truncate">
                {row.owner?.full_name || '—'}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'tax_number',
        header: 'Vergi No',
        width: 'w-32',
        render: (row) => <span className="text-slate-600 text-xs font-mono">{row.tax_number || '—'}</span>,
      },
      {
        key: 'city',
        header: 'İl / İlçe',
        sortable: true,
        width: 'w-48',
        render: (row) => (
          <div>
            <div className="text-slate-700 text-sm">{row.city}</div>
            <div className="text-xs text-slate-500">{row.district || '—'}</div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: 'Telefon',
        width: 'w-36',
        render: (row) => <span className="text-slate-600 text-xs">{row.phone || '—'}</span>,
      },
      {
        key: 'status',
        header: 'Durum',
        width: 'w-32',
        render: (row) => (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_BADGE[row.status])}>
            {STATUS_LABELS[row.status]}
          </span>
        ),
      },
      {
        key: 'id',
        header: 'İşlemler',
        align: 'right',
        width: 'w-80',
        render: (row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => setDetailRow(row)}
              className="btn-secondary text-xs"
              title="Detay"
            >
              <Eye className="h-3.5 w-3.5" /> Detay
            </button>
            {row.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => updateStatus.mutate({ row, status: 'active' })}
                  disabled={!canApprove || updateStatus.isPending}
                  className="btn-secondary text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50"
                >
                  <Check className="h-3.5 w-3.5" /> Onayla
                </button>
                <button
                  type="button"
                  onClick={() => updateStatus.mutate({ row, status: 'rejected' })}
                  disabled={!canApprove || updateStatus.isPending}
                  className="btn-secondary text-xs text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Reddet
                </button>
              </>
            )}
            {row.status === 'active' && (
              <button
                type="button"
                onClick={() => setSuspendTarget(row)}
                disabled={!canEdit || updateStatus.isPending}
                className="btn-secondary text-xs text-orange-600 hover:bg-orange-50 hover:border-orange-300 disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5" /> Askıya Al
              </button>
            )}
            {row.status === 'suspended' && (
              <button
                type="button"
                onClick={() => updateStatus.mutate({ row, status: 'active' })}
                disabled={!canEdit || updateStatus.isPending}
                className="btn-secondary text-xs text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5" /> Aktifleştir
              </button>
            )}
            {row.status === 'rejected' && (
              <button
                type="button"
                onClick={() => updateStatus.mutate({ row, status: 'active' })}
                disabled={!canEdit || updateStatus.isPending}
                className="btn-secondary text-xs disabled:opacity-50"
              >
                Yeniden Aktifleştir
              </button>
            )}
          </div>
        ),
      },
    ],
    [canEdit, canApprove, updateStatus, detailRow],
  );

  if (!canView) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Yetkiniz yok</h2>
        <p className="mt-1 text-sm text-slate-500">Bu sayfayı görüntülemek için dealerships alanında yetki gerekir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bayilikler</h1>
          <p className="text-sm text-slate-500 mt-1">Bayi başvurularını yönetin ve aktif/pasif durumlarını güncelleyin.</p>
        </div>
        <button
          type="button"
          onClick={() => dealershipsQuery.refetch()}
          className="btn-secondary self-start"
        >
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Toplam Bayi</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-amber-600">Onay Bekleyen</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{stats.pending}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-emerald-600">Aktif</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{stats.active}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-orange-600">Askıda</div>
          <div className="text-2xl font-extrabold text-orange-700 mt-1">{stats.suspended}</div>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Bayi adı, il, sahibi, vergi no…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | DealershipStatus)}
          className="input max-w-xs"
        >
          <option value="all">Tüm Durumlar</option>
          <option value="pending">Onay Bekliyor</option>
          <option value="active">Aktif</option>
          <option value="suspended">Askıda</option>
          <option value="rejected">Reddedildi</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        isLoading={dealershipsQuery.isLoading}
        emptyMessage="Bu filtrelerle eşleşen bayi yok"
      />

      {/* Detay Drawer */}
      {detailRow && (
        <div className="fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-sm" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setDetailRow(null);
        }}>
          <div className="ml-auto h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-start gap-3">
              <div className="h-12 w-12 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                {detailRow.logo_url ? (
                  <img src={detailRow.logo_url} alt={detailRow.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <Building2 className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate">{detailRow.name}</h2>
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_BADGE[detailRow.status])}>
                    {STATUS_LABELS[detailRow.status]}
                  </span>
                  {detailRow.tax_number && (
                    <span className="text-xs text-slate-500 font-mono">VKN: {detailRow.tax_number}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setDetailRow(null)}
                className="p-1.5 rounded text-slate-400 hover:bg-slate-100"
                title="Kapat"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">İletişim & Adres</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <div className="font-medium text-slate-800">{detailRow.city}{detailRow.district ? ` / ${detailRow.district}` : ''}</div>
                      {detailRow.address && <div className="text-xs text-slate-500">{detailRow.address}</div>}
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Phone className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="text-slate-700">{detailRow.phone || '—'}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Mail className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="text-slate-700 break-all">{detailRow.email || '—'}</div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Hash className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    <div className="text-slate-700 font-mono text-xs">{detailRow.tax_number || '—'}</div>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-3">Sahibi</h3>
                <div className="card p-3 text-sm">
                  <div className="font-medium text-slate-800">{detailRow.owner?.full_name || '—'}</div>
                  <div className="text-xs text-slate-500">{detailRow.owner?.email || '—'}</div>
                  {detailRow.owner?.phone && <div className="text-xs text-slate-500">{detailRow.owner.phone}</div>}
                </div>
              </section>

              {detailRow.description && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Açıklama</h3>
                  <p className="text-sm text-slate-600 whitespace-pre-line">{detailRow.description}</p>
                </section>
              )}

              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">Tarihler</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 mt-0.5" />
                    <div>
                      <div className="text-xs text-slate-500">Kayıt</div>
                      <div className="text-slate-700">{formatDate(detailRow.created_at)}</div>
                    </div>
                  </div>
                  {detailRow.approved_at && (
                    <div className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                      <div>
                        <div className="text-xs text-slate-500">Onay</div>
                        <div className="text-slate-700">{formatDate(detailRow.approved_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Bayi İlanları ({vehiclesQuery.data?.length ?? 0})
                  </h3>
                </div>
                {vehiclesQuery.isLoading ? (
                  <div className="text-sm text-slate-500">Yükleniyor…</div>
                ) : (vehiclesQuery.data ?? []).length === 0 ? (
                  <div className="card p-4 text-center text-sm text-slate-500">
                    <FileText className="h-6 w-6 mx-auto text-slate-300" />
                    <div className="mt-1">Bu bayinin henüz ilanı yok.</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehiclesQuery.data!.map((v) => {
                      const img = v.images?.[0]?.url;
                      return (
                        <div key={v.id} className="card p-3 flex items-center gap-3">
                          <div className="h-12 w-16 rounded bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-xs text-slate-400">
                            {img ? <img src={img} className="h-full w-full object-cover" alt="" /> : 'IMG'}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-slate-800 truncate text-sm">{v.title}</div>
                            <div className="text-xs text-slate-500">
                              {v.brand?.name ?? '—'} {v.model?.name ?? ''} · {v.city}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-800">{formatPrice(v.price)}</div>
                            <span className={cn('inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold', v.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                              {v.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>

            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              {detailRow.status === 'pending' && (
                <>
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate({ row: detailRow, status: 'rejected' })}
                    disabled={!canApprove}
                    className="btn-secondary text-red-600 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" /> Reddet
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus.mutate({ row: detailRow, status: 'active' })}
                    disabled={!canApprove}
                    className="btn-primary disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" /> Onayla
                  </button>
                </>
              )}
              {detailRow.status === 'active' && (
                <button
                  type="button"
                  onClick={() => updateStatus.mutate({ row: detailRow, status: 'suspended' })}
                  disabled={!canEdit}
                  className="btn-secondary text-orange-600 disabled:opacity-50"
                >
                  <Pause className="h-4 w-4" /> Askıya Al
                </button>
              )}
              {(detailRow.status === 'suspended' || detailRow.status === 'rejected') && (
                <button
                  type="button"
                  onClick={() => updateStatus.mutate({ row: detailRow, status: 'active' })}
                  disabled={!canEdit}
                  className="btn-primary disabled:opacity-50"
                >
                  <Play className="h-4 w-4" /> Aktifleştir
                </button>
              )}
              <a
                href={`mailto:${detailRow.email || ''}`}
                className="btn-secondary"
                title="E-posta"
              >
                <ExternalLink className="h-4 w-4" /> İletişim
              </a>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!suspendTarget}
        title="Bayiyi Askıya Al"
        message={
          suspendTarget
            ? `${suspendTarget.name} adlı bayiyi askıya almak istediğinize emin misiniz? Bayi bu sürede yayın yapamaz.`
            : ''
        }
        confirmText="Evet, Askıya Al"
        loading={updateStatus.isPending}
        onClose={() => setSuspendTarget(null)}
        onConfirm={() => {
          if (suspendTarget) {
            updateStatus.mutate({ row: suspendTarget, status: 'suspended' });
            setSuspendTarget(null);
          }
        }}
      />
    </div>
  );
}
