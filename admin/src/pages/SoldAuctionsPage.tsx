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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((row) => {
            const v = row.vehicle;
            const thumb = v?.images?.[0]?.url;
            return (
              <div key={row.id} className="card overflow-hidden border-2 border-emerald-200">
                <div className="relative aspect-video bg-slate-100">
                  {thumb ? (
                    <img src={thumb} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <ImageOff className="h-8 w-8" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> SATILDI
                  </div>
                  {v?.is_premium && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-amber-400 text-amber-900 text-xs font-semibold">
                      Premium
                    </div>
                  )}
                  <SoldStamp variant="full" />
                </div>

                <div className="p-3 space-y-2">
                  <div className="font-bold text-slate-800 line-clamp-1">{v?.title}</div>
                  <div className="text-xs text-slate-500">
                    {v?.brand?.name} {v?.model?.name} • {v?.year}
                  </div>

                  <div className="border-t border-slate-100 pt-2">
                    <div className="text-[10px] text-slate-500 uppercase">Satış Fiyatı (Son Teklif)</div>
                    <div className="text-2xl font-extrabold text-emerald-600">
                      {formatPrice(row.final_price ?? row.current_price)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-slate-500">Toplam Teklif</div>
                      <div className="font-bold text-slate-800">{row.total_bids}</div>
                    </div>
                    <div>
                      <div className="text-slate-500">Bitiş</div>
                      <div className="font-bold text-slate-800">{formatDate(row.ended_at)}</div>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <Award className="h-3 w-3" /> Kazanan: {row.winner_id ? 'Belirlendi' : '—'}
                  </div>
                </div>

                <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-end gap-1">
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
                      onClick={() => setConfirmDelete(row)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Sil
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
