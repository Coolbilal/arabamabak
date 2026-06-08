import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Clock, Search, Loader2, AlertCircle, Calendar, ImageOff,
  CalendarClock, Eye, RefreshCw, Trash2, CheckCircle2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, cn } from '../lib/utils';
import { Countdown } from '../components/Countdown';
import {
  useAuctionsByStatus,
  useTickLifecycle,
  type AuctionFilterRow,
} from '../components/AuctionFilters';
import { ListingReviewModal, type ReviewRow } from '../components/ListingReviewModal';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function IncomingAuctionsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [reviewing, setReviewing] = useState<ReviewRow | null>(null);
  const [slotFor, setSlotFor] = useState<AuctionFilterRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AuctionFilterRow | null>(null);

  const canEdit = hasPermission('auctions', 'edit');
  const incomingQ = useAuctionsByStatus(['scheduled']);
  const tick = useTickLifecycle();

  const filtered = useMemo(() => {
    const rows = incomingQ.data ?? [];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      (r.vehicle?.title || '').toLowerCase().includes(s) ||
      (r.vehicle?.brand?.name || '').toLowerCase().includes(s),
    );
  }, [incomingQ.data, search]);

  // Auto-tick (pg_cron yoksa) - her 60 saniyede bir tetikle
  // Not: client-side auto tick, prod'da pg_cron veya edge function önerilir
  useEffect(() => {
    const id = setInterval(() => { tick.mutate(); }, 60_000);
    return () => clearInterval(id);
  }, []);

  const deleteM = useMutation({
    mutationFn: async (row: AuctionFilterRow) => {
      if (!row.vehicle?.id) throw new Error('İlan ID yok');
      const { error } = await supabase.from('vehicles').delete().eq('id', row.vehicle.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auctions-by-status'] });
      setActionMsg({ kind: 'ok', text: 'İlan kalıcı olarak silindi.' });
      setConfirmDelete(null);
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'Silinemedi.' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="h-6 w-6 text-sky-600" /> Açık Arttırmaya Çıkacak Araçlar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Onaylanmış + slot atanmış ilanlar. Slot saati geldiğinde otomatik olarak "Devam Eden"e geçer.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => incomingQ.refetch()}
            className="btn-secondary"
          >
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
          <button
            onClick={() => tick.mutate()}
            disabled={tick.isPending}
            className="btn-secondary"
            title="Cron yoksa manuel tetikle"
          >
            <Clock className="h-4 w-4" /> {tick.isPending ? 'Kontrol…' : 'Kontrol Et'}
          </button>
        </div>
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

      <div className="card p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="İlan ara..."
            value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9"
          />
        </div>
        <div className="mt-2 text-xs text-slate-500">
          ℹ Süre dolduğunda "Devam Eden" sayfasına otomatik geçer.
        </div>
      </div>

      <div className="card overflow-hidden">
        {incomingQ.isLoading ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">Bekleyen ilan yok.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-20">Görsel</th>
                  <th className="text-left px-4 py-3 font-medium">İlan</th>
                  <th className="text-left px-4 py-3 font-medium">Slot</th>
                  <th className="text-left px-4 py-3 font-medium">Mezat Başlangıcına</th>
                  <th className="text-right px-4 py-3 font-medium">Açılış Fiyatı</th>
                  <th className="text-right px-4 py-3 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const v = row.vehicle;
                  const thumb = v?.images?.[0]?.url;
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
                        <div className="font-semibold text-slate-800 line-clamp-1">{v?.title}</div>
                        <div className="text-xs text-slate-500">
                          {v?.brand?.name} {v?.model?.name} • {v?.year}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {row.slot ? (
                          <div>
                            <div className="font-medium text-slate-700">
                              <Calendar className="inline h-3 w-3 mr-1" />
                              {row.slot.slot_date}
                            </div>
                            <div className="text-slate-500">
                              {String(row.slot.start_time).slice(0, 5)} - {String(row.slot.end_time).slice(0, 5)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">atanmamış</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.start_at ? (
                          <Countdown target={row.start_at} prefix="Kalan" />
                        ) : (
                          <span className="text-xs text-amber-600 italic flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Slot atanmamış
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700">
                        {formatPrice(row.opening_price)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (v) setReviewing({
                                ...v,
                                brand: v.brand ?? null,
                                model: v.model ?? null,
                                engine_size: v.engine_size ?? null,
                                images: v.images ?? [],
                                seller: v.seller ?? null,
                                auction: row,
                              } as unknown as ReviewRow);
                            }}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
                          >
                            <Eye className="h-3.5 w-3.5" /> İncele
                          </button>
                          <button
                            onClick={() => setSlotFor(row)}
                            disabled={!canEdit}
                            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-40"
                          >
                            <CalendarClock className="h-3.5 w-3.5" /> Slot
                          </button>
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
            onApprove={() => {}}
            onReject={() => {}}
            approving={false}
            showAuctionInfo
          />
        </ErrorBoundary>
      )}

      {slotFor && (
        <SlotReassignModal
          auction={slotFor}
          onClose={() => setSlotFor(null)}
          onAssigned={() => { setSlotFor(null); incomingQ.refetch(); }}
        />
      )}

      {confirmDelete && (
        <DeleteConfirmInline
          title={confirmDelete.vehicle?.title || '—'}
          onClose={() => setConfirmDelete(null)}
          onConfirm={() => deleteM.mutate(confirmDelete)}
          busy={deleteM.isPending}
        />
      )}
    </div>
  );
}

function SlotReassignModal({
  auction, onClose, onAssigned,
}: {
  auction: AuctionFilterRow;
  onClose: () => void;
  onAssigned: () => void;
}) {
  const slotsQ = useQuery({
    queryKey: ['auction-slots-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_slots').select('*').eq('is_active', true)
        .order('slot_date', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const assign = useMutation({
    mutationFn: async (slotId: string | null) => {
      const slot = slotId ? (slotsQ.data ?? []).find((s: any) => s.id === slotId) as any : null;
      const startAt = slot
        ? new Date(`${slot.slot_date}T${slot.start_time}`).toISOString()
        : null;
      const { error } = await supabase.from('auctions').update({
        slot_id: slotId,
        start_at: startAt ?? auction.start_at,
        end_at: startAt
          ? new Date(new Date(startAt).getTime() + (auction.duration_minutes || 30) * 60_000).toISOString()
          : auction.end_at,
      }).eq('id', auction.id);
      if (error) throw error;
    },
    onSuccess: onAssigned,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-600" /> Slot Değiştir
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <AlertCircle className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5 space-y-2 overflow-y-auto flex-1">
          <p className="text-sm text-slate-600">
            <strong>{auction.vehicle?.title}</strong> için yeni bir slot seçin.
          </p>
          {auction.slot_id && (
            <button
              onClick={() => assign.mutate(null)}
              className="w-full text-left rounded-md border border-red-200 bg-red-50 p-3 hover:bg-red-100 text-sm"
            >
              Slot atamasını kaldır
            </button>
          )}
          {(slotsQ.data ?? []).map((s: any) => (
            <button
              key={s.id}
              onClick={() => assign.mutate(s.id)}
              disabled={assign.isPending}
              className={cn(
                'w-full text-left rounded-md border p-3 hover:bg-sky-50 hover:border-sky-300 disabled:opacity-50',
                s.id === auction.slot_id ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200',
              )}
            >
              <div className="text-sm font-semibold text-slate-800">
                {s.slot_date} • {String(s.start_time).slice(0, 5)}-{String(s.end_time).slice(0, 5)}
              </div>
              <div className="text-xs text-slate-500">Maks {s.max_items} araç</div>
            </button>
          ))}
          {slotsQ.isLoading && <Loader2 className="h-4 w-4 animate-spin mx-auto" />}
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Kapat</button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmInline({
  title, onClose, onConfirm, busy,
}: {
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
        <p className="text-sm text-slate-600 mb-3">
          "<strong>{title}</strong>" ilanı veritabanından silinecek. Bu geri alınamaz.
        </p>
        <input
          className="input w-full" placeholder='Onay için "SİL" yazın'
          value={text} onChange={(e) => setText(e.target.value)}
        />
        <div className="flex justify-end gap-2 mt-3">
          <button onClick={onClose} className="btn-secondary">Vazgeç</button>
          <button
            onClick={onConfirm}
            disabled={text !== 'SİL' || busy}
            className="btn-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sil'}
          </button>
        </div>
      </div>
    </div>
  );
}
