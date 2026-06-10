import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Gavel, Search, Loader2, AlertCircle, RefreshCw, Eye, Check, XCircle,
  Trash2, ImageOff, Inbox, CheckCircle2, Calendar,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, formatPrice, cn } from '../lib/utils';
import type { VehicleImage, ListingStatus, Auction } from '../lib/types';
import { ListingReviewModal, type ReviewRow } from '../components/ListingReviewModal';
import { ErrorBoundary } from '../components/ErrorBoundary';

interface AppRow {
  id: string;                       // vehicle id
  title: string;
  brand_id: string;
  model_id: string | null;
  year: number;
  km: number;
  price: number;
  status: ListingStatus;
  listing_type: 'free' | 'auction' | 'premium_auction';
  fuel: string;
  transmission: string;
  body: string;
  color: string;
  damage_record: boolean;
  damage_detail: string | null;
  description: string | null;
  exchange_accepted: boolean;
  city: string;
  district: string | null;
  view_count: number;
  favorite_count: number;
  created_at: string;
  is_premium: boolean;
  engine_power_kw: number | null;
  engine_size_id: string | null;
  rejection_reason: string | null;
  seller_id: string;
  brand?: { name: string; logo_url: string | null } | null;
  model?: { name: string } | null;
  engine_size?: { displacement: string } | null;
  images?: VehicleImage[];
  seller?: { full_name: string | null; email: string | null; phone: string | null } | null;
  auction?: (Auction & { slot?: any }) | null;
}

const LISTING_TYPE_LABELS: Record<string, string> = {
  free: 'Ücretsiz', auction: 'Açık Arttırma', premium_auction: 'Premium',
};
const LISTING_TYPE_CLASS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-700',
  auction: 'bg-sky-100 text-sky-700',
  premium_auction: 'bg-amber-100 text-amber-700',
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
  expired: 'bg-slate-200 text-slate-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-600',
};

export default function AuctionApplicationsPage() {
  const { hasPermission, user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<ReviewRow | null>(null);
  const [rejecting, setRejecting] = useState<AppRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<AppRow | null>(null);
  const [approveSlotFor, setApproveSlotFor] = useState<AppRow | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const canApprove = hasPermission('auctions', 'approve') || hasPermission('free_listings', 'approve');
  const canEdit = hasPermission('auctions', 'edit');

  // ---- İlanları vehicles tablosundan çek (auction henüz oluşmamış olabilir) ----
  const appsQ = useQuery({
    queryKey: ['auction-applications', statusFilter, typeFilter, search],
    queryFn: async () => {
      let q = supabase
        .from('vehicles')
        .select(`
          id, title, brand_id, model_id, year, km, price, status, listing_type,
          fuel, transmission, body, color, damage_record, damage_detail, description,
          exchange_accepted, city, district, view_count, favorite_count, created_at,
          is_premium, engine_power_kw, engine_size_id, rejection_reason, seller_id,
          vehicle_brands!vehicles_brand_id_fkey(name, logo_url),
          vehicle_models(name),
          engine_sizes(displacement),
          profiles:seller_id(full_name, email, phone),
          auctions(id, status, opening_price, current_price, slot_id, start_at, end_at, duration_minutes, live_started_at, live_ends_at, ended_at, final_price, winner_id,
            slot:auction_slots(slot_date, start_time, end_time)
          )
        `)
        .in('listing_type', ['auction', 'premium_auction'])
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') q = q.eq('status', statusFilter as ListingStatus);
      if (typeFilter !== 'all') q = q.eq('listing_type', typeFilter);

      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as unknown as AppRow[];

      // images ayrıca çek
      const ids = rows.map((r) => r.id);
      if (ids.length > 0) {
        const { data: imgs } = await supabase
          .from('vehicle_images')
          .select('id, vehicle_id, url, sort_order, created_at')
          .in('vehicle_id', ids)
          .order('sort_order', { ascending: true });
        const byV: Record<string, VehicleImage[]> = {};
        ((imgs ?? []) as VehicleImage[]).forEach((img) => {
          if (!byV[img.vehicle_id]) byV[img.vehicle_id] = [];
          byV[img.vehicle_id].push(img);
        });
        rows.forEach((r) => { r.images = byV[r.id] || []; });
      }
      return rows;
    },
  });

  const filtered = useMemo(() => {
    const rows = appsQ.data ?? [];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      (r.title || '').toLowerCase().includes(s) ||
      (r.brand?.name || '').toLowerCase().includes(s) ||
      (r.seller?.email || '').toLowerCase().includes(s),
    );
  }, [appsQ.data, search]);

  function toReviewRow(r: AppRow): ReviewRow | null {
    return {
      ...r,
      brand: r.brand ?? null,
      model: r.model ?? null,
      engine_size: r.engine_size ?? null,
      images: r.images ?? [],
      seller: r.seller ?? null,
      auction: (r.auction && Array.isArray(r.auction) && (r.auction as any[]).length > 0)
        ? (r.auction as any[])[0]
        : (r.auction as any) ?? null,
    } as unknown as ReviewRow;
  }

  // ---- Onay + Slot seçimi ----
  const approveM = useMutation({
    mutationFn: async ({ row, slotId }: { row: AppRow; slotId: string | null }) => {
      const { data: adminRow, error: aErr } = await supabase
        .from('admin_users')
        .select('id')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .maybeSingle();
      if (aErr) throw aErr;
      const now = new Date().toISOString();

      // 1) vehicle onayla
      const { error: vErr } = await supabase.from('vehicles').update({
        status: 'active' as ListingStatus,
        approved_at: now,
        approved_by: adminRow?.id ?? null,
        published_at: now,
        rejection_reason: null,
      }).eq('id', row.id);
      if (vErr) throw vErr;

      // 2) Auction oluştur (varsa güncelle)
      const existingAuction = Array.isArray(row.auction) ? (row.auction as any[])[0] : row.auction;
      const { data: settings } = await supabase
        .from('site_settings')
        .select('auction_default_duration_minutes')
        .eq('id', 1)
        .maybeSingle();
      const durationMinutes = Number(settings?.auction_default_duration_minutes ?? 30);
      const opening = Number(row.price) || 0;

      // Slot bilgilerini çek
      let startAt: string | null = null;
      let endAt: string | null = null;
      if (slotId) {
        const { data: slot } = await supabase
          .from('auction_slots')
          .select('slot_date, start_time, end_time')
          .eq('id', slotId)
          .maybeSingle();
        if (slot) {
          startAt = new Date(`${slot.slot_date}T${slot.start_time}`).toISOString();
          endAt = new Date(new Date(startAt).getTime() + durationMinutes * 60_000).toISOString();
        }
      }

      if (existingAuction?.id) {
        // Mevcut auction'ı güncelle (slot atanmamış ise)
        const update: any = {};
        if (slotId) {
          update.slot_id = slotId;
          update.start_at = startAt;
          update.end_at = endAt;
          update.duration_minutes = durationMinutes;
        }
        if (Object.keys(update).length > 0) {
          const { error } = await supabase.from('auctions').update(update).eq('id', existingAuction.id);
          if (error) throw error;
        }
      } else {
        // Yeni auction oluştur
        const { error: aInsErr } = await supabase.from('auctions').insert({
          vehicle_id: row.id,
          opening_price: opening,
          current_price: opening,
          bid_increment: 100,
          slot_id: slotId,
          start_at: startAt,
          end_at: endAt,
          duration_minutes: durationMinutes,
          status: 'scheduled',
        });
        if (aInsErr) throw aInsErr;
      }
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['auction-applications'] });
      qc.invalidateQueries({ queryKey: ['auctions-by-status'] });
      qc.invalidateQueries({ queryKey: ['public-auctions'] });
      setActionMsg({
        kind: 'ok',
        text: vars.slotId
          ? 'İlan onaylandı ve slot atandı. "Çıkacaklar" listesine geçti.'
          : 'İlan onaylandı. "Çıkacaklar" sayfasından slot atayın.',
      });
      setReviewing(null);
      setApproveSlotFor(null);
      setTimeout(() => setActionMsg(null), 4000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Onaylanamadı.' }),
  });

  // ---- Red ----
  const rejectM = useMutation({
    mutationFn: async ({ row, reason }: { row: AppRow; reason: string }) => {
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
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction-applications'] });
      setActionMsg({ kind: 'ok', text: 'İlan reddedildi.' });
      setRejecting(null);
      setRejectReason('');
      setReviewing(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Reddedilemedi.' }),
  });

  // ---- Sil ----
  const deleteM = useMutation({
    mutationFn: async (row: AppRow) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auction-applications'] });
      qc.invalidateQueries({ queryKey: ['auctions-by-status'] });
      setActionMsg({ kind: 'ok', text: 'İlan silindi.' });
      setConfirmDelete(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Silinemedi.' }),
  });

  // stats
  const stats = useMemo(() => {
    const rows = appsQ.data ?? [];
    return {
      total: rows.length,
      pending: rows.filter((r) => r.status === 'pending').length,
      active: rows.filter((r) => r.status === 'active').length,
    };
  }, [appsQ.data]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Inbox className="h-6 w-6 text-sky-600" /> Açık Arttırma Başvuruları
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Web'den gelen açık arttırma ilanları. Onayla → "Çıkacaklar" listesinden slot ata.
          </p>
        </div>
        <button onClick={() => appsQ.refetch()} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg p-3 text-sm',
          actionMsg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {actionMsg.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {actionMsg.text}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3"><div className="text-xs text-slate-500">Toplam</div><div className="text-2xl font-bold text-slate-800">{stats.total}</div></div>
        <div className="card p-3 bg-amber-50 border-amber-200"><div className="text-xs text-amber-700">Onay Bekliyor</div><div className="text-2xl font-bold text-amber-800">{stats.pending}</div></div>
        <div className="card p-3 bg-emerald-50 border-emerald-200"><div className="text-xs text-emerald-700">Yayında (slot atanmamış)</div><div className="text-2xl font-bold text-emerald-800">{stats.active}</div></div>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="İlan, marka, e-posta ara..."
              value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9" />
          </div>
          <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tüm Durumlar</option>
            <option value="pending">Onay Bekliyor</option>
            <option value="active">Yayında</option>
            <option value="rejected">Reddedildi</option>
            <option value="cancelled">İptal</option>
          </select>
          <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="all">Tüm Tipler</option>
            <option value="auction">Açık Arttırma</option>
            <option value="premium_auction">Premium Açık Arttırma</option>
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        {appsQ.isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Inbox className="h-8 w-8 mx-auto text-slate-300 mb-2" />
            Başvuru bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-20">Görsel</th>
                  <th className="text-left px-4 py-3 font-medium">İlan</th>
                  <th className="text-left px-4 py-3 font-medium">Tip</th>
                  <th className="text-right px-4 py-3 font-medium">Açılış Fiyatı</th>
                  <th className="text-left px-4 py-3 font-medium">Satıcı</th>
                  <th className="text-left px-4 py-3 font-medium">Durum</th>
                  <th className="text-left px-4 py-3 font-medium">Tarih</th>
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
                        <div className="text-xs text-slate-500">
                          {row.brand?.name} {row.model?.name} • {row.year} • {row.km.toLocaleString('tr-TR')} km
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold',
                          LISTING_TYPE_CLASS[row.listing_type])}>
                          <Gavel className="h-3 w-3" />
                          {LISTING_TYPE_LABELS[row.listing_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
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
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            onClick={() => setReviewing(toReviewRow(row))}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                            title="Detayları İncele"
                          >
                            <Eye className="h-3.5 w-3.5" /> İncele
                          </button>
                          {row.status === 'pending' && (
                            <>
                              <button
                                onClick={() => setApproveSlotFor(row)}
                                disabled={!canApprove || approveM.isPending}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                              >
                                <Check className="h-3.5 w-3.5" /> Onayla
                              </button>
                              <button
                                onClick={() => { setRejecting(row); setRejectReason(''); }}
                                disabled={!canApprove || rejectM.isPending}
                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-40"
                              >
                                <XCircle className="h-3.5 w-3.5" /> Reddet
                              </button>
                            </>
                          )}
                          {row.status === 'rejected' && canApprove && (
                            <button
                              onClick={() => setApproveSlotFor(row)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                            >
                              <Check className="h-3.5 w-3.5" /> Onayla
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => setConfirmDelete(row)}
                              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Sil
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

      {reviewing && (
        <ErrorBoundary>
          <ListingReviewModal
            row={reviewing}
            onClose={() => setReviewing(null)}
            onApprove={() => {
              const original = filtered.find((r) => r.id === reviewing.id);
              if (original) setApproveSlotFor(original);
            }}
            onReject={() => {
              const original = filtered.find((r) => r.id === reviewing.id);
              setRejecting(original ?? null);
              setRejectReason('');
            }}
            approving={approveM.isPending}
          />
        </ErrorBoundary>
      )}

      {approveSlotFor && (
        <ApproveWithSlotModal
          row={approveSlotFor}
          onClose={() => setApproveSlotFor(null)}
          onConfirm={(slotId) => approveM.mutate({ row: approveSlotFor, slotId })}
          busy={approveM.isPending}
        />
      )}

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

      {confirmDelete && (
        <DeleteConfirmModal
          title={confirmDelete.title}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteM.mutate(confirmDelete)}
          busy={deleteM.isPending}
        />
      )}
    </div>
  );
}

function ApproveWithSlotModal({
  row, onClose, onConfirm, busy,
}: {
  row: AppRow;
  onClose: () => void;
  onConfirm: (slotId: string | null) => void;
  busy: boolean;
}) {
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  // Aktif ve gelecekteki slotları getir
  const slotsQ = useQuery({
    queryKey: ['auction-slots-pickable'],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('auction_slots')
        .select('*')
        .eq('is_active', true)
        .gte('slot_date', today)
        .order('slot_date', { ascending: true })
        .order('start_time', { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  // Seçilen slotta kaç araç var?
  const slotCounts = useQuery({
    queryKey: ['auction-slot-counts', slotsQ.data?.map((s: any) => s.id).join(',')],
    enabled: !!slotsQ.data,
    queryFn: async () => {
      const ids = (slotsQ.data ?? []).map((s: any) => s.id);
      if (ids.length === 0) return {} as Record<string, number>;
      const { data } = await supabase
        .from('auctions')
        .select('slot_id')
        .in('slot_id', ids)
        .neq('status', 'cancelled');
      const counts: Record<string, number> = {};
      ((data ?? []) as any[]).forEach((a) => {
        if (a.slot_id) counts[a.slot_id] = (counts[a.slot_id] || 0) + 1;
      });
      return counts;
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Check className="h-5 w-5 text-emerald-600" /> Onayla & Slot Seç
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* İlan özeti */}
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 flex items-center gap-3">
            {row.images?.[0]?.url ? (
              <img src={row.images[0].url} alt="" className="h-14 w-20 object-cover rounded" />
            ) : (
              <div className="h-14 w-20 rounded bg-slate-200 flex items-center justify-center">
                <ImageOff className="h-5 w-5 text-slate-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-slate-800 line-clamp-1">{row.title}</div>
              <div className="text-xs text-slate-500">{row.brand?.name} {row.model?.name} • {row.year} • {formatPrice(row.price)}</div>
            </div>
          </div>

          <p className="text-sm text-slate-600">
            İlanı onaylamak için bir slot seçin. Slot saatinde mezat otomatik başlar.
          </p>

          {/* Slot listesi */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-700">Mevcut Slotlar</h4>
            {slotsQ.isLoading ? (
              <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto" /></div>
            ) : (slotsQ.data ?? []).length === 0 ? (
              <div className="text-sm text-amber-600 p-3 rounded-md bg-amber-50 border border-amber-200">
                ⚠ Aktif slot yok. Önce "Açık Arttırma Slotları" sayfasından slot tanımlayın.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {(slotsQ.data ?? []).map((s: any) => {
                  const used = slotCounts.data?.[s.id] ?? 0;
                  const full = used >= s.max_items;
                  return (
                    <button
                      key={s.id}
                      onClick={() => !full && setSelectedSlot(s.id)}
                      disabled={full}
                      className={cn(
                        'w-full text-left rounded-md border p-3 transition',
                        full && 'opacity-50 cursor-not-allowed',
                        selectedSlot === s.id
                          ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                          : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            <Calendar className="inline h-3.5 w-3.5 mr-1" />
                            {s.slot_date} • {String(s.start_time).slice(0, 5)} - {String(s.end_time).slice(0, 5)}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            Maks {s.max_items} araç • Kullanılan: {used}
                            {full && <span className="text-red-600 font-semibold ml-1">— DOLU</span>}
                          </div>
                        </div>
                        {selectedSlot === s.id && <Check className="h-5 w-5 text-emerald-600" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-md bg-blue-50 border border-blue-100 p-3 text-xs text-blue-800">
            ℹ Slot seçmeden de onaylayabilirsiniz — ilan "Çıkacaklar" sayfasında slot atanmamış olarak görünür, sonra slot atayabilirsiniz.
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-2">
          <button
            onClick={() => onConfirm(null)}
            disabled={busy}
            className="btn-secondary"
          >
            Slotsuz Onayla
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-secondary">İptal</button>
            <button
              onClick={() => onConfirm(selectedSlot)}
              disabled={!selectedSlot || busy}
              className="btn-primary"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Onayla & Slot Atandı
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ row, reason, setReason, onClose, onConfirm, busy }: {
  row: AppRow;
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
            <XCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm">
            <div className="font-semibold text-red-800">{row.title}</div>
            <div className="text-red-700 text-xs mt-1">{row.brand?.name} {row.model?.name} • {row.year}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Red Sebebi <span className="text-red-500">*</span></label>
            <textarea className="input w-full" rows={4} value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Örn: Fotoğraflar yetersiz, vs." maxLength={500} />
            <div className="text-xs text-slate-400 mt-1 text-right">{reason.length} / 500</div>
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

function DeleteConfirmModal({ title, onClose, onConfirm, busy }: {
  title: string;
  onClose: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-5">
        <h3 className="font-bold text-red-700 mb-2">⚠ Kalıcı Silme</h3>
        <p className="text-sm text-slate-600 mb-3">"<strong>{title}</strong>" silinecek. Bu geri alınamaz.</p>
        <input className="input w-full" placeholder='Onay için "SİL"' value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="btn-secondary">Vazgeç</button>
          <button onClick={onConfirm} disabled={text !== 'SİL' || busy}
            className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
