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
import AuctionsTable from '../components/AuctionsTable';

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
        <AuctionsTable
          rows={filtered}
          loading={liveQ.isLoading}
          variant="live"
          onView={(r) => {
            const v = r.vehicle;
            if (v) setReviewing({
              ...v,
              brand: v.brand ?? null,
              model: v.model ?? null,
              engine_size: v.engine_size ?? null,
              images: v.images ?? [],
              seller: v.seller ?? null,
              auction: r,
            } as unknown as ReviewRow);
          }}
          onCancel={canEdit ? (r) => cancelM.mutate(r) : undefined}
        />
      )

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
