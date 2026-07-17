import { useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  Eye, Ban, Trash2, ImageOff, ArrowUpDown, ChevronLeft, ChevronRight, Hammer, Clock,
} from 'lucide-react';
import { formatPrice, cn } from '../lib/utils';
import type { AuctionFilterRow } from './AuctionFilters';

type Column = {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render: (row: AuctionFilterRow) => React.ReactNode;
};

type Props = {
  rows: AuctionFilterRow[];
  loading?: boolean;
  showThumb?: boolean;
  onView?: (row: AuctionFilterRow) => void;
  onCancel?: (row: AuctionFilterRow) => void;
  onDelete?: (row: AuctionFilterRow) => void;
  variant?: 'live' | 'sold';
  enableRealtime?: boolean;
};

const PAGE_SIZE = 20;

// Türkçe geri sayım formatı
function fmtCountdown(target: string | null | undefined): { txt: string; urgent: boolean; ended: boolean } {
  if (!target) return { txt: '—', urgent: false, ended: false };
  const ms = new Date(target).getTime() - Date.now();
  if (ms <= 0) return { txt: 'Bitti', urgent: true, ended: true };
  const total = Math.floor(ms / 1000);
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const txt = d > 0
    ? `${d}g ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    : `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return { txt, urgent: total < 60, ended: false };
}

function LiveCountdown({ target }: { target: string | null | undefined }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const { txt, urgent, ended } = fmtCountdown(target);
  return (
    <span className={cn(
      'inline-flex items-center gap-1 font-mono text-xs font-semibold tabular-nums',
      ended && 'text-slate-400',
      urgent && !ended && 'text-red-600 animate-pulse',
      !urgent && !ended && 'text-amber-600',
    )}>
      <Clock className="h-3 w-3" />
      {txt}
    </span>
  );
}

export default function AuctionsTable({
  rows, loading, showThumb = true, onView, onCancel, onDelete, variant = 'live', enableRealtime,
}: Props) {
  const qc = useQueryClient();

  // Realtime: bids INSERT veya auctions UPDATE olunca invalidQueries
  useEffect(() => {
    if (!enableRealtime || variant !== 'live') return;
    const channel = supabase
      .channel('admin-auctions-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        () => { qc.invalidateQueries({ queryKey: ['auctions-by-status'] }); },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions' },
        () => { qc.invalidateQueries({ queryKey: ['auctions-by-status'] }); },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enableRealtime, variant, qc]);

  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string>('live_ends_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Sıralama — Marka/Model fallback: brand.name ?? model.name ?? ''
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sortKey) {
        case 'listing_no': av = a.vehicle?.listing_no ?? ''; bv = b.vehicle?.listing_no ?? ''; break;
        case 'title': av = a.vehicle?.title ?? ''; bv = b.vehicle?.title ?? ''; break;
        case 'brand':
          av = (a.vehicle as any)?.brand?.name ?? (a.vehicle as any)?.model?.name ?? a.vehicle?.title ?? '';
          bv = (b.vehicle as any)?.brand?.name ?? (b.vehicle as any)?.model?.name ?? b.vehicle?.title ?? '';
          break;
        case 'year': av = a.vehicle?.year ?? 0; bv = b.vehicle?.year ?? 0; break;
        case 'km': av = a.vehicle?.km ?? 0; bv = b.vehicle?.km ?? 0; break;
        case 'opening_price': av = Number(a.opening_price); bv = Number(b.opening_price); break;
        case 'current_price': av = Number(a.current_price); bv = Number(b.current_price); break;
        case 'final_price': av = Number(a.final_price ?? a.current_price); bv = Number(b.final_price ?? b.current_price); break;
        case 'total_bids': av = a.total_bids ?? 0; bv = b.total_bids ?? 0; break;
        case 'live_ends_at': av = a.live_ends_at ?? ''; bv = b.live_ends_at ?? ''; break;
        case 'ended_at': av = a.ended_at ?? ''; bv = b.ended_at ?? ''; break;
        default: av = ''; bv = '';
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageStart = page * PAGE_SIZE;
  const pageRows = sorted.slice(pageStart, pageStart + PAGE_SIZE);

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function thumbOf(row: AuctionFilterRow): string | null {
    const imgs = (row.vehicle?.images ?? []) as Array<{ url?: string }>;
    return imgs[0]?.url ?? null;
  }

  const columns: Column[] = useMemo(() => {
    const cols: Column[] = [];
    if (showThumb) {
      cols.push({
        key: 'thumb', label: '', className: 'w-16',
        render: (r) => {
          const url = thumbOf(r);
          return url ? (
            <img src={url} alt="" className="h-10 w-14 rounded object-cover" />
          ) : (
            <div className="flex h-10 w-14 items-center justify-center rounded bg-slate-100 text-slate-400">
              <ImageOff className="h-4 w-4" />
            </div>
          );
        },
      });
    }
    cols.push(
      { key: 'listing_no', label: 'İlan No', sortable: true, render: (r) => <span className="font-mono text-xs">{r.vehicle?.listing_no ?? '—'}</span> },
      { key: 'title', label: 'Başlık', sortable: true, render: (r) => <span className="truncate max-w-[180px] inline-block">{r.vehicle?.title ?? '—'}</span> },
      {
        key: 'brand', label: 'Marka/Model', sortable: true,
        render: (r) => {
          const brand = (r.vehicle as any)?.brand?.name;
          const model = (r.vehicle as any)?.model?.name;
          const txt = [brand, model].filter(Boolean).join(' ') || '—';
          return <span className="truncate max-w-[160px] inline-block">{txt}</span>;
        },
      },
      { key: 'year', label: 'Yıl', sortable: true, render: (r) => r.vehicle?.year ?? '—' },
      { key: 'km', label: 'KM', sortable: true, render: (r) => (r.vehicle?.km ?? 0).toLocaleString('tr-TR') },
      {
        key: variant === 'sold' ? 'ended_at' : 'current_price',
        label: variant === 'sold' ? 'Bitiş' : 'Son Teklif',
        sortable: true,
        className: variant === 'live' ? 'font-bold text-red-600' : '',
        render: (r) => {
          if (variant === 'live') {
            return (
              <span className="inline-flex flex-col">
                <span className="text-xs text-slate-500 line-through">{formatPrice(r.opening_price)}</span>
                <span className="text-red-600 font-bold">{formatPrice(r.current_price)}</span>
              </span>
            );
          }
          return r.ended_at ? new Date(r.ended_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
        },
      },
      {
        key: variant === 'live' ? 'live_ends_at' : 'ended_at',
        label: variant === 'live' ? 'Kronometre' : 'Bitiş Saati',
        sortable: variant !== 'live',
        render: (r) => {
          if (variant === 'live') {
            return <LiveCountdown target={r.live_ends_at ?? r.end_at} />;
          }
          return r.ended_at ? new Date(r.ended_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—';
        },
      },
      {
        key: 'total_bids', label: variant === 'live' ? 'Teklif' : 'Teklifler', sortable: true,
        render: (r) => (
          <span className="inline-flex items-center gap-1 text-slate-700">
            <Hammer className="h-3 w-3" />
            {r.total_bids ?? 0}
          </span>
        ),
      },
      {
        key: 'actions', label: 'İşlemler', className: 'text-right',
        render: (r) => (
          <div className="flex items-center justify-end gap-1">
            {onView && (
              <button
                type="button"
                onClick={() => onView(r)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                <Eye className="h-3.5 w-3.5" /> İncele
              </button>
            )}
            {variant === 'live' && onCancel && (
              <button
                type="button"
                onClick={() => onCancel(r)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-amber-700 hover:bg-amber-50"
              >
                <Ban className="h-3.5 w-3.5" /> İptal
              </button>
            )}
            {variant === 'sold' && onDelete && (
              <button
                type="button"
                onClick={() => onDelete(r)}
                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Sil
              </button>
            )}
          </div>
        ),
      },
    );
    return cols;
  }, [showThumb, variant, onView, onCancel, onDelete]);

  return (
    <div className={cn(
      'overflow-hidden rounded-lg border bg-white',
      variant === 'live' ? 'border-red-200' : 'border-emerald-200',
    )}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className={cn(
            'text-xs uppercase',
            variant === 'live' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
          )}>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    'px-3 py-2 text-left font-medium',
                    c.className,
                  )}
                >
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:underline"
                    >
                      {c.label}
                      <ArrowUpDown className="h-3 w-3" />
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">Yükleniyor…</td>
              </tr>
            )}
            {!loading && pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-3 py-8 text-center text-slate-500">Kayıt bulunamadı</td>
              </tr>
            )}
            {!loading && pageRows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-3 py-2 align-middle', c.className)}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div>Toplam {rows.length} ilan • Sayfa {page + 1} / {totalPages}</div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 disabled:opacity-50"
            >
              <ChevronLeft className="h-3 w-3" /> Önceki
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              className="inline-flex items-center gap-1 rounded border px-2 py-1 disabled:opacity-50"
            >
              Sonraki <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
