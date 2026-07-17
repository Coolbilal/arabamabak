import { useMemo, useState } from 'react';
import {
  Eye, Ban, Trash2, ImageOff, ArrowUpDown, ChevronLeft, ChevronRight, Hammer,
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
  // Görsel kolonu (küçük thumb)
  showThumb?: boolean;
  // Satır başına aksiyonlar
  onView?: (row: AuctionFilterRow) => void;
  onCancel?: (row: AuctionFilterRow) => void;
  onDelete?: (row: AuctionFilterRow) => void;
  // Satır kapatma durumu (kırmızı çerçeve vs)
  variant?: 'live' | 'sold';
};

const PAGE_SIZE = 20;

export default function AuctionsTable({
  rows, loading, showThumb = true, onView, onCancel, onDelete, variant = 'live',
}: Props) {
  const [page, setPage] = useState(0);
  const [sortKey, setSortKey] = useState<string>('live_ends_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Sıralama
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      let av: any;
      let bv: any;
      switch (sortKey) {
        case 'listing_no': av = a.vehicle?.listing_no ?? ''; bv = b.vehicle?.listing_no ?? ''; break;
        case 'title': av = a.vehicle?.title ?? ''; bv = b.vehicle?.title ?? ''; break;
        case 'brand': av = a.vehicle?.brand?.name ?? ''; bv = b.vehicle?.brand?.name ?? ''; break;
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

  // Pagination
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

  const isLive = variant === 'live';

  const cols: Column[] = [
    ...(showThumb
      ? [{
          key: 'thumb',
          label: '',
          className: 'w-16',
          render: (r: AuctionFilterRow) => {
            const t = r.vehicle?.images?.[0]?.url;
            return (
              <div className="w-12 h-9 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                {t ? <img src={t} alt="" className="w-full h-full object-cover" /> : <ImageOff className="h-4 w-4 text-slate-300" />}
              </div>
            );
          },
        }]
      : []),
    { key: 'listing_no', label: 'İlan No', sortable: true, className: 'whitespace-nowrap', render: (r) => <span className="text-xs font-mono text-slate-600">{r.vehicle?.listing_no ?? '—'}</span> },
    { key: 'title', label: 'Başlık', sortable: true, className: 'max-w-[200px]', render: (r) => <span className="font-semibold text-slate-800 line-clamp-1">{r.vehicle?.title ?? '—'}</span> },
    { key: 'brand', label: 'Marka/Model', sortable: true, className: 'whitespace-nowrap', render: (r) => <span className="text-sm text-slate-700">{r.vehicle?.brand?.name ?? '—'} {r.vehicle?.model?.name ?? ''}</span> },
    { key: 'year', label: 'Yıl', sortable: true, className: 'w-16 text-center', render: (r) => <span className="text-sm">{r.vehicle?.year ?? '—'}</span> },
    { key: 'km', label: 'KM', sortable: true, className: 'w-24 text-right', render: (r) => <span className="text-sm tabular-nums">{(r.vehicle?.km ?? 0).toLocaleString('tr-TR')}</span> },
    { key: 'opening_price', label: 'Açılış', sortable: true, className: 'w-28 text-right', render: (r) => <span className="text-sm tabular-nums text-slate-600">{formatPrice(r.opening_price)}</span> },
    isLive
      ? { key: 'current_price', label: 'Son Fiyat', sortable: true, className: 'w-32 text-right', render: (r) => <span className="text-base font-bold text-red-600 tabular-nums">{formatPrice(r.current_price)}</span> }
      : { key: 'final_price', label: 'Satış Fiyatı', sortable: true, className: 'w-32 text-right', render: (r) => <span className="text-base font-bold text-emerald-600 tabular-nums">{formatPrice(r.final_price ?? r.current_price)}</span> },
    { key: 'total_bids', label: 'Teklif', sortable: true, className: 'w-16 text-center', render: (r) => <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-700"><Hammer className="h-3 w-3" />{r.total_bids ?? 0}</span> },
    isLive
      ? { key: 'live_ends_at', label: 'Bitiş', sortable: true, className: 'w-32 whitespace-nowrap', render: (r) => <span className="text-xs text-slate-600">{r.live_ends_at ? new Date(r.live_ends_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</span> }
      : { key: 'ended_at', label: 'Bitiş', sortable: true, className: 'w-32 whitespace-nowrap', render: (r) => <span className="text-xs text-slate-600">{r.ended_at ? new Date(r.ended_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</span> },
    {
      key: 'actions', label: '', className: 'w-32 text-right',
      render: (r) => (
        <div className="flex items-center justify-end gap-1">
          {onView && (
            <button onClick={() => onView(r)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50">
              <Eye className="h-3.5 w-3.5" /> İncele
            </button>
          )}
          {isLive && onCancel && (
            <button onClick={() => onCancel(r)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
              <Ban className="h-3.5 w-3.5" /> İptal
            </button>
          )}
          {!isLive && onDelete && (
            <button onClick={() => onDelete(r)} className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
              <Trash2 className="h-3.5 w-3.5" /> Sil
            </button>
          )}
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="card p-10 text-center text-slate-400 text-sm">Yükleniyor…</div>
    );
  }

  if (rows.length === 0) {
    return null; // parent'ta boş state gösterilir
  }

  return (
    <div className="space-y-3">
      <div className="card overflow-hidden border-2 border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={cn(
              'text-xs uppercase tracking-wide',
              isLive ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700',
            )}>
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    className={cn('px-3 py-2 text-left font-semibold', c.className)}
                  >
                    {c.sortable ? (
                      <button
                        onClick={() => toggleSort(c.key)}
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {c.label}
                        <ArrowUpDown className={cn('h-3 w-3', sortKey === c.key && 'text-slate-900')} />
                      </button>
                    ) : c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-slate-100 hover:bg-slate-50 transition',
                    isLive && 'border-l-4 border-l-red-400',
                    !isLive && 'border-l-4 border-l-emerald-400',
                  )}
                >
                  {cols.map((c) => (
                    <td key={c.key} className={cn('px-3 py-2', c.className)}>
                      {c.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination + sayım */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <div>
          Toplam <strong>{sorted.length}</strong> ilan • Sayfa <strong>{page + 1}</strong> / {totalPages}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Önceki
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50 disabled:opacity-40"
          >
            Sonraki <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
