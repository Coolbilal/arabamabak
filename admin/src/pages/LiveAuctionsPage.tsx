import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Play, Search, Loader2, AlertCircle, Gavel, ImageOff,
  Eye, RefreshCw, Ban, CheckCircle2, Hammer,
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

export default function LiveAuctionsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<ReviewRow | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const tick = useTickLifecycle();
  const liveQ = useAuctionsByStatus(['live']);

  const canEdit = hasPermission('auctions', 'edit');

  // periyodik tetikleme (pg_cron yoksa)
  useEffect(() => {
    const id = setInterval(() => { tick.mutate(); }, 30_000);
    return () => clearInterval(id);
  }, []);

  const filtered = useMemo(() => {
    const rows = liveQ.data ?? [];
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      (r.vehicle?.title || '').toLowerCase().includes(s) ||
      (r.vehicle?.brand?.name || '').toLowerCase().includes(s),
    );
  }, [liveQ.data, search]);

  const cancelM = useMutation({
    mutationFn: async (row: AuctionFilterRow) => {
      const { error: aErr } = await supabase.from('auctions')
        .update({ status: 'cancelled' }).eq('id', row.id);
      if (aErr) throw aErr;
      if (row.vehicle?.id) {
        await supabase.from('vehicles').update({ status: 'cancelled' }).eq('id', row.vehicle.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auctions-by-status'] });
      setActionMsg({ kind: 'ok', text: 'Mezat iptal edildi.' });
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => setActionMsg({ kind: 'err', text: e?.message || 'İptal edilemedi.' }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Play className="h-6 w-6 text-red-600" /> Devam Eden Açık Arttırmalar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Canlı mezatlar. Süre dolunca son teklif satış fiyatı olur.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => liveQ.refetch()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
          <button
            onClick={() => tick.mutate()}
            disabled={tick.isPending}
            className="btn-secondary"
            title="Süresi dolmuş olanları bitir"
          >
            <CheckCircle2 className="h-4 w-4" /> {tick.isPending ? 'Kontrol…' : 'Süreleri Kontrol Et'}
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
          ⚡ Salise (1/100 sn) hassasiyetinde geri sayım.
        </div>
      </div>

      {liveQ.isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          <Gavel className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          Şu anda devam eden mezat yok.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((row) => {
            const v = row.vehicle;
            const thumb = v?.images?.[0]?.url;
            return (
              <div key={row.id} className="card overflow-hidden border-2 border-red-200">
                <div className="flex items-center justify-between bg-red-50 px-4 py-2 border-b border-red-200">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm font-bold text-red-700">CANLI</span>
                    <span className="text-xs text-slate-500">ID: {row.id.slice(0, 8)}</span>
                  </div>
                  <span className="text-xs text-slate-500">{row.duration_minutes} dk sürdü</span>
                </div>

                <div className="flex">
                  <div className="w-40 h-32 bg-slate-100 shrink-0">
                    {thumb ? (
                      <img src={thumb} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-slate-300">
                        <ImageOff className="h-6 w-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 space-y-1">
                    <div className="font-bold text-slate-800 line-clamp-1">{v?.title}</div>
                    <div className="text-xs text-slate-500">
                      {v?.brand?.name} {v?.model?.name} • {v?.year}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Hammer className="h-3 w-3" /> {row.total_bids} teklif
                    </div>
                    <div className="text-sm font-bold text-red-600">{formatPrice(row.current_price)}</div>
                  </div>
                </div>

                <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Mezat Bitişine Kalan</div>
                  <Countdown target={row.live_ends_at} variant="large" showCentiseconds />
                </div>

                <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-end gap-1">
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
                  {canEdit && (
                    <button
                      onClick={() => cancelM.mutate(row)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <Ban className="h-3.5 w-3.5" /> Mezatı İptal Et
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

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
    </div>
  );
}

