import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardCheck, Search, X, Loader2, AlertCircle, Check, XCircle, RefreshCw,
  ImageOff, Eye,
  Tag, Gavel,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate, cn } from '../lib/utils';
import type { ListingStatus, VehicleImage } from '../lib/types';
import {
  ListingReviewModal,
  STATUS_LABELS, STATUS_CLASS, LISTING_TYPE_LABELS, LISTING_TYPE_CLASS,
  type ReviewRow as PendingRow,
} from '../components/ListingReviewModal';
import { ErrorBoundary } from '../components/ErrorBoundary';

const STATUS_LABELS_LOCAL = STATUS_LABELS; // re-export
const STATUS_CLASS_LOCAL = STATUS_CLASS;
const LISTING_TYPE_LABELS_LOCAL = LISTING_TYPE_LABELS;
const LISTING_TYPE_CLASS_LOCAL = LISTING_TYPE_CLASS;
void STATUS_LABELS_LOCAL; void STATUS_CLASS_LOCAL; void LISTING_TYPE_LABELS_LOCAL; void LISTING_TYPE_CLASS_LOCAL;

export default function PendingListingsPage() {
  const { hasPermission, user } = useAuth();
  const qc = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<PendingRow | null>(null);
  const [rejecting, setRejecting] = useState<PendingRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const canApprove = hasPermission('free_listings', 'approve') || hasPermission('auctions', 'approve');

  // ---- Pending + other statuses ----
  const listingsQ = useQuery({
    queryKey: ['pending-listings', statusFilter, typeFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('vehicles')
        .select(`*, 
          vehicle_brands!vehicles_brand_id_fkey(name, logo_url), 
          vehicle_models(name), 
          engine_sizes(displacement),
          profiles:seller_id(full_name, email, phone),
          auctions(id, status, opening_price, current_price, slot_id, start_at, end_at)
        `)
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter as ListingStatus);
      if (typeFilter !== 'all') q = q.eq('listing_type', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as PendingRow[];
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

  const filtered = useMemo(() => {
    const rows = listingsQ.data ?? [];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      (r.title || '').toLowerCase().includes(s) ||
      (r.brand?.name || '').toLowerCase().includes(s) ||
      (r.model?.name || '').toLowerCase().includes(s) ||
      (r.seller?.email || '').toLowerCase().includes(s)
    );
  }, [listingsQ.data, search]);

  // ---- Approve ----
  const approveM = useMutation({
    mutationFn: async (row: PendingRow) => {
      // FK: vehicles.approved_by → admin_users.id (auth.users.id değil!)
      const { data: adminRow, error: aErr } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();
      if (aErr) throw aErr;
      const now = new Date().toISOString();
      const updates: any = {
        status: 'active' as ListingStatus,
        approved_at: now,
        approved_by: adminRow?.id ?? null,
        published_at: now,
      };
      if (row.rejection_reason) updates.rejection_reason = null;
      const { error: vErr } = await supabase.from('vehicles').update(updates).eq('id', row.id);
      if (vErr) throw vErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-listings'] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
      qc.invalidateQueries({ queryKey: ['free-listings'] });
      setActionMsg({ kind: 'ok', text: 'İlan onaylandı ve yayına alındı.' });
      setReviewing(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Onaylanamadı.' }),
  });

  // ---- Reject ----
  const rejectM = useMutation({
    mutationFn: async ({ row, reason }: { row: PendingRow; reason: string }) => {
      // FK: vehicles.rejected_by → admin_users.id
      const { data: adminRow, error: aErr } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();
      if (aErr) throw aErr;
      const now = new Date().toISOString();
      const { error: vErr } = await supabase.from('vehicles').update({
        status: 'rejected' as ListingStatus,
        rejection_reason: reason,
        rejected_at: now,
        rejected_by: adminRow?.id ?? null,
      }).eq('id', row.id);
      if (vErr) throw vErr;

      // İlan reddedildiyse, varsa auction'ı da iptal et
      if (row.auction?.id) {
        const { error: aErr2 } = await supabase.from('auctions').update({ status: 'cancelled' }).eq('id', row.auction.id);
        if (aErr2) throw aErr2;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pending-listings'] });
      qc.invalidateQueries({ queryKey: ['auctions'] });
      qc.invalidateQueries({ queryKey: ['free-listings'] });
      setActionMsg({ kind: 'ok', text: 'İlan reddedildi.' });
      setRejecting(null);
      setRejectReason('');
      setReviewing(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Reddedilemedi.' }),
  });

  // Stats
  const stats = useMemo(() => {
    const rows = (listingsQ.data ?? []) as PendingRow[];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      auctionPending: rows.filter((r) => r.status === 'pending' && r.listing_type !== 'free').length,
    };
  }, [listingsQ.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-sky-600" /> İlan Onay Merkezi
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tüm bekleyen ilanları incele, onayla veya reddet. Açık arttırma ilanları onay sonrası slot ataması bekler.
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

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <div className="text-xs text-slate-500">Toplam Sonuç</div>
          <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
        </div>
        <div className="card p-3 bg-amber-50 border-amber-200">
          <div className="text-xs text-amber-700">Onay Bekliyor</div>
          <div className="text-2xl font-bold text-amber-800">{stats.pending}</div>
        </div>
        <div className="card p-3 bg-sky-50 border-sky-200">
          <div className="text-xs text-sky-700">Açık Arttırma (Bekleyen)</div>
          <div className="text-2xl font-bold text-sky-800">{stats.auctionPending}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text" placeholder="Başlık, marka, model veya e-posta..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9"
            />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Onay Bekliyor</option>
            <option value="active">Yayında</option>
            <option value="rejected">Reddedildi</option>
            <option value="cancelled">İptal</option>
            <option value="sold">Satıldı</option>
          </select>
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Tüm Yayın Tipleri</option>
            <option value="free">Ücretsiz</option>
            <option value="auction">Açık Arttırma</option>
            <option value="premium_auction">Premium Açık Arttırma</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {listingsQ.isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Kayıt bulunamadı.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-20">Görsel</th>
                  <th className="text-left px-4 py-3 font-medium">İlan</th>
                  <th className="text-left px-4 py-3 font-medium">Tür</th>
                  <th className="text-right px-4 py-3 font-medium">Fiyat</th>
                  <th className="text-left px-4 py-3 font-medium">Satıcı</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-left px-4 py-3 font-medium">Tarih</th>
                  <th className="text-right px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const thumb = row.images?.[0]?.url;
                  const isAuction = row.listing_type !== 'free';
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
                        <div className="text-xs text-slate-500">
                          {row.brand?.name} {row.model?.name} • {row.year} • {row.km.toLocaleString('tr-TR')} km
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          LISTING_TYPE_CLASS[row.listing_type] || 'bg-slate-100 text-slate-700')}>
                          {isAuction ? <Gavel className="h-3 w-3" /> : <Tag className="h-3 w-3" />}
                          {LISTING_TYPE_LABELS[row.listing_type] || row.listing_type}
                        </span>
                        {isAuction && row.auction && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Açılış: {formatPrice(row.auction.opening_price)}
                            {row.auction.slot_id ? ' • Slot ✓' : ' • Slot ✗'}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-800 whitespace-nowrap">
                        {formatPrice(row.price)}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-slate-700 font-medium">{row.seller?.full_name || '—'}</div>
                        <div className="text-slate-400">{row.seller?.email || ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold', STATUS_CLASS[row.status])}>
                          {STATUS_LABELS[row.status]}
                        </span>
                        {row.status === 'rejected' && row.rejection_reason && (
                          <div className="text-[10px] text-red-600 mt-0.5 line-clamp-1 italic" title={row.rejection_reason}>
                            "{row.rejection_reason}"
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(row.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          <button
                            onClick={() => setReviewing(row)}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                            title="Detayları İncele"
                          >
                            <Eye className="h-3.5 w-3.5" /> İncele
                          </button>
                          {row.status === 'pending' && (
                            <>
                              <button
                                onClick={() => approveM.mutate(row)}
                                disabled={!canApprove || approveM.isPending}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Onayla ve Yayınla"
                              >
                                <Check className="h-3.5 w-3.5" /> Onayla
                              </button>
                              <button
                                onClick={() => { setRejecting(row); setRejectReason(''); }}
                                disabled={!canApprove || rejectM.isPending}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                                title="Reddet"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reddet
                              </button>
                            </>
                          )}
                          {row.status === 'rejected' && canApprove && (
                            <button
                              onClick={() => approveM.mutate(row)}
                              disabled={approveM.isPending}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                              title="Tekrar Onayla"
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

      {/* Review modal */}
      {reviewing && (
        <ErrorBoundary>
          <ListingReviewModal
            row={reviewing}
            onClose={() => setReviewing(null)}
            onApprove={() => approveM.mutate(reviewing)}
            onReject={() => { setRejecting(reviewing); setRejectReason(''); }}
            approving={approveM.isPending}
          />
        </ErrorBoundary>
      )}

      {/* Reject modal */}
      {rejecting && (
        <RejectModal
          row={rejecting}
          reason={rejectReason}
          setReason={setRejectReason}
          onClose={() => { setRejecting(null); setRejectReason(''); }}
          onConfirm={() => rejectM.mutate({ row: rejecting, reason: rejectReason.trim() || 'Sebep belirtilmedi' })}
          busy={rejectM.isPending}
        />
      )}
    </div>
  );
}

/* ============== Reject Modal (with reason) ============== */
function RejectModal({
  row, reason, setReason, onClose, onConfirm, busy,
}: {
  row: PendingRow;
  reason: string;
  setReason: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" /> İlanı Reddet
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
            <div className="font-semibold text-red-800">{row.title}</div>
            <div className="text-red-700 text-xs mt-1">
              {row.brand?.name} {row.model?.name} • {row.year}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Red Sebebi <span className="text-red-500">*</span>
            </label>
            <textarea
              className="input w-full"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Fotoğraflar yetersiz, fiyat gerçekçi değil, açıklama eksik, vs."
              maxLength={500}
            />
            <div className="text-xs text-slate-400 mt-1 text-right">{reason.length} / 500</div>
            <div className="text-xs text-slate-500 mt-1">
              Bu mesaj satıcıya iletilecek. Detay verin ki satıcı düzeltebilsin.
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button
            onClick={onConfirm}
            disabled={!reason.trim() || busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Reddet
          </button>
        </div>
      </div>
    </div>
  );
}
