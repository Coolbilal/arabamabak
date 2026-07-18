import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle, CheckCircle2, Clock, RefreshCw, Search } from 'lucide-react';
import { cn, formatPrice } from '../lib/utils';

type LogRow = {
  id: string;
  listing_id: string | null;
  profile_id: string;
  plaka_no: string;
  vergi_no: string | null;
  ilan_no: string | null;
  status_code: number | null;
  error_code: string | null;
  error_message: string | null;
  is_success: boolean;
  queried_at: string;
  duration_ms: number | null;
  attempt_number: number;
  is_retry: boolean;
};

export default function EidsLogsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 30;

  const logsQ = useQuery({
    queryKey: ['eids-logs', page],
    queryFn: async () => {
      let q = supabase
        .from('eids_query_logs')
        .select('*')
        .order('queried_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as LogRow[];
    },
    refetchInterval: 10_000, // 10 saniyede bir yenile
  });

  const filtered = (logsQ.data ?? []).filter((r) => {
    if (search && !`${r.plaka_no} ${r.ilan_no ?? ''} ${r.error_message ?? ''}`.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    if (statusFilter === 'success' && !r.is_success) return false;
    if (statusFilter === 'failed' && (r.is_success || !r.status_code || r.status_code === 0)) return false;
    if (statusFilter === 'pending' && r.status_code !== 0) return false;
    return true;
  });

  // İstatistikler
  const stats = {
    total: logsQ.data?.length ?? 0,
    success: (logsQ.data ?? []).filter((r) => r.is_success).length,
    failed: (logsQ.data ?? []).filter((r) => !r.is_success && r.status_code && r.status_code !== 0).length,
    pending: (logsQ.data ?? []).filter((r) => r.status_code === 0).length,
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-slate-800">EİDS Sorgu Logları</h1>
        <button
          onClick={() => logsQ.refetch()}
          className="ml-auto inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700"
        >
          <RefreshCw className={cn('h-4 w-4', logsQ.isFetching && 'animate-spin')} /> Yenile
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-4">
        Ticaret Bakanlığı EİDS API'sine atılan tüm sorgular. Sistem yoğunluğu ve hata yönetimi için 10 saniyede bir yenilenir.
      </p>

      {/* İstatistikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard label="Toplam" value={stats.total} color="slate" />
        <StatCard label="Başarılı" value={stats.success} color="emerald" />
        <StatCard label="Başarısız" value={stats.failed} color="red" />
        <StatCard label="Beklemede" value={stats.pending} color="amber" />
      </div>

      {/* Filtreler */}
      <div className="card p-3 mb-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Plaka, ilan no veya hata mesajı ara…"
            className="input pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border bg-slate-50 p-0.5">
          {(['all', 'success', 'failed', 'pending'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition',
                statusFilter === f
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f === 'all' && 'Tümü'}
              {f === 'success' && 'Başarılı'}
              {f === 'failed' && 'Başarısız'}
              {f === 'pending' && 'Beklemede'}
            </button>
          ))}
        </div>
      </div>

      {/* Tablo */}
      <div className="card overflow-hidden">
        {logsQ.isLoading ? (
          <div className="p-8 text-center text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Yükleniyor…
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Log bulunamadı</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Tarih</th>
                  <th className="px-3 py-2 text-left font-medium">Plaka</th>
                  <th className="px-3 py-2 text-left font-medium">İlan No</th>
                  <th className="px-3 py-2 text-left font-medium">Durum</th>
                  <th className="px-3 py-2 text-left font-medium">Hata</th>
                  <th className="px-3 py-2 text-left font-medium">Deneme</th>
                  <th className="px-3 py-2 text-left font-medium">Süre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs text-slate-600 whitespace-nowrap">
                      {new Date(r.queried_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-3 py-2 font-mono font-semibold">{r.plaka_no}</td>
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{r.ilan_no ?? '—'}</td>
                    <td className="px-3 py-2">
                      {r.status_code === 0 ? (
                        <Badge color="amber" icon={<Clock className="h-3 w-3" />}>Beklemede</Badge>
                      ) : r.is_success ? (
                        <Badge color="emerald" icon={<CheckCircle2 className="h-3 w-3" />}>{r.status_code}</Badge>
                      ) : (
                        <Badge color="red" icon={<AlertCircle className="h-3 w-3" />}>{r.status_code ?? 'Hata'}</Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs max-w-[280px] truncate">
                      {r.error_code && <span className="font-mono text-red-600 mr-1">{r.error_code}</span>}
                      <span className="text-slate-600">{r.error_message ?? '—'}</span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {r.is_retry && <span className="text-amber-600">#{r.attempt_number}</span>}
                      {!r.is_retry && <span className="text-slate-500">#{r.attempt_number}</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500">
                      {r.duration_ms ? `${r.duration_ms}ms` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div>Sayfa {page + 1}</div>
        <div className="flex gap-1">
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Önceki
          </button>
          <button
            disabled={filtered.length < PAGE_SIZE}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded border disabled:opacity-50"
          >
            Sonraki
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: 'slate' | 'emerald' | 'red' | 'amber' }) {
  const colors = {
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={cn('rounded-lg border p-3', colors[color])}>
      <div className="text-xs font-medium opacity-80">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Badge({ children, color, icon }: { children: React.ReactNode; color: 'emerald' | 'red' | 'amber'; icon?: React.ReactNode }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border', colors[color])}>
      {icon}
      {children}
    </span>
  );
}
