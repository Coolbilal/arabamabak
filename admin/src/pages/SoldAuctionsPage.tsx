import { useMemo, useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, Search, Loader2, AlertCircle, ImageOff,
  Eye, RefreshCw, Trash2, Trophy, Award,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate, cn } from '../lib/utils';
import {
  useAuctionsByStatus,
  type AuctionFilterRow,
} from '../components/AuctionFilters';
import { ListingReviewModal, type ReviewRow } from '../components/ListingReviewModal';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { SoldStamp } from '../components/SoldStamp';
import AuctionsTable from '../components/AuctionsTable';

export default function SoldAuctionsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<ReviewRow | null>(null);
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<AuctionFilterRow | null>(null);
  const canEdit = hasPermission('auctions', 'edit');

  const soldQ = useAuctionsByStatus(['ended']);
  // 24 saatten eski olanları filtrele
  const filtered = useMemo(() => {
    const rows = soldQ.data ?? [];
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = rows.filter((r) => (r.ended_at ?? '') >= cutoff);
    if (!search) return recent;
    const s = search.toLowerCase();
    return recent.filter((r) =>
      (r.vehicle?.title || '').toLowerCase().includes(s) ||
      (r.vehicle?.brand?.name || '').toLowerCase().includes(s),
    );
  }, [soldQ.data, search]);

  // 24 saatlik cleanup
  useEffect(() => {
    const id = setInterval(() => { soldQ.refetch(); }, 60_000);
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
      setActionMsg({ kind: 'ok', text: 'İlan silindi.' });
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
            <Trophy className="h-6 w-6 text-emerald-600" /> Satılan Araçlar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tamamlanan mezatlar (24 saat boyunca görünür). Sonra arşivlenir.
          </p>
        </div>
        <button onClick={() => soldQ.refetch()} className="btn-secondary">
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

      <div className="card p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="İlan ara..."
            value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9"
          />
        </div>
      </div>

      {soldQ.isLoading ? (
        <div className="card p-10 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 text-sm">
          <Trophy className="h-10 w-10 mx-auto text-slate-300 mb-2" />
          Henüz satılan araç yok.
        </div>
      ) : (
        <AuctionsTable
          rows={filtered}
          loading={soldQ.isLoading}
          variant="sold"
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
          onDelete={canEdit ? (r) => { setConfirmDelete(r); } : undefined}
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

function DeleteConfirmInline({
  title, onClose, onConfirm, busy,
}: { title: string; onClose: () => void; onConfirm: () => void; busy: boolean }) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl p-5">
        <h3 className="font-bold text-red-700 mb-2">⚠ Sil</h3>
        <p className="text-sm text-slate-600 mb-3">"<strong>{title}</strong>" silinecek.</p>
        <input className="input w-full" placeholder='Onay için "SİL"' value={text} onChange={(e) => setText(e.target.value)} />
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
