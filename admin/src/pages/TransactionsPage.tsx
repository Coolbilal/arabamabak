import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, Filter, FileText, ExternalLink, User as UserIcon,
  AlertCircle, RefreshCw, X, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, formatPrice } from '../lib/utils';
import DataTable, { type DataTableColumn } from '../components/DataTable';
import type { TxStatus, TxType } from '../lib/types';

interface TransactionRow {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  status: TxStatus;
  payment_method: string | null;
  reference_id: string | null;
  description: string | null;
  related_vehicle_id: string | null;
  related_auction_id: string | null;
  receipt_url: string | null;
  created_at: string;
  completed_at: string | null;
  user?: { id: string; full_name: string | null; email: string | null } | null;
}

const TYPE_LABELS: Record<TxType, string> = {
  deposit: 'Yükleme',
  withdraw: 'Çekim',
  payment: 'Ödeme',
  refund: 'İade',
  auction_payment: 'Açık Arttırma Ödemesi',
  premium_payment: 'Premium Ödeme',
  expertise_payment: 'Ekspertiz Ödemesi',
};

const STATUS_LABELS: Record<TxStatus, string> = {
  pending: 'Bekliyor',
  completed: 'Tamamlandı',
  failed: 'Başarısız',
  cancelled: 'İptal',
};

const STATUS_BADGE: Record<TxStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

const ALL_TYPES: TxType[] = ['deposit', 'withdraw', 'payment', 'refund', 'auction_payment', 'premium_payment', 'expertise_payment'];
const ALL_STATUSES: TxStatus[] = ['pending', 'completed', 'failed', 'cancelled'];

function isPdf(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.pdf(\?|$)/i.test(url);
}

export default function TransactionsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TxType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TxStatus>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [receiptTarget, setReceiptTarget] = useState<TransactionRow | null>(null);

  const canView = hasPermission('transactions', 'view');

  // Para çekme onayı
  const approveWithdraw = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc('approve_withdrawal', {
        p_transaction_id: id,
        p_approve: approve,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-transactions'] }),
    onError: (e: Error) => alert(e.message || 'Onay başarısız'),
  });

  // Banka havalesi onayı
  const approveBankDeposit = useMutation({
    mutationFn: async ({ id, approve }: { id: string; approve: boolean }) => {
      const { data, error } = await supabase.rpc('approve_bank_deposit', {
        p_transaction_id: id,
        p_approve: approve,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-transactions'] }),
    onError: (e: Error) => alert(e.message || 'Onay başarısız'),
  });

  const transactionsQuery = useQuery({
    queryKey: ['transactions'],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          id, user_id, type, amount, status, payment_method, reference_id,
          description, related_vehicle_id, related_auction_id, receipt_url,
          created_at, completed_at,
          user:profiles!transactions_user_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []).map((d: any) => {
        const user = Array.isArray(d.user) ? d.user[0] : d.user;
        return { ...d, user: user ?? null } as TransactionRow;
      });
    },
  });

  const filtered = useMemo(() => {
    const list = transactionsQuery.data ?? [];
    return list.filter((r) => {
      if (typeFilter !== 'all' && r.type !== typeFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        if (new Date(r.created_at).getTime() < from) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 24 * 60 * 60 * 1000;
        if (new Date(r.created_at).getTime() > to) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const inUser =
          (r.user?.full_name ?? '').toLowerCase().includes(q) ||
          (r.user?.email ?? '').toLowerCase().includes(q);
        const inDescription = (r.description ?? '').toLowerCase().includes(q);
        const inRef = (r.reference_id ?? '').toLowerCase().includes(q);
        if (!inUser && !inDescription && !inRef) return false;
      }
      return true;
    });
  }, [transactionsQuery.data, typeFilter, statusFilter, search, dateFrom, dateTo]);

  const summary = useMemo(() => {
    const list = filtered;
    const total = list.reduce((acc, r) => acc + Number(r.amount), 0);
    const completed = list
      .filter((r) => r.status === 'completed')
      .reduce((acc, r) => acc + Number(r.amount), 0);
    const pending = list.filter((r) => r.status === 'pending').length;
    return { count: list.length, total, completed, pending };
  }, [filtered]);

  const columns: DataTableColumn<TransactionRow>[] = useMemo(
    () => [
      {
        key: 'created_at',
        header: 'Tarih',
        sortable: true,
        width: 'w-44',
        render: (row) => (
          <div>
            <div className="text-slate-700 text-sm">{formatDate(row.created_at)}</div>
            {row.completed_at && row.completed_at !== row.created_at && (
              <div className="text-[10px] text-slate-400">tamam: {formatDate(row.completed_at)}</div>
            )}
          </div>
        ),
      },
      {
        key: 'user',
        header: 'Kullanıcı',
        sortable: true,
        render: (row) => (
          <div className="min-w-0">
            <div className="font-medium text-slate-800 truncate">{row.user?.full_name || '—'}</div>
            <div className="text-xs text-slate-500 truncate flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              {row.user?.email || '—'}
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        header: 'Tip',
        width: 'w-44',
        render: (row) => (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
            {TYPE_LABELS[row.type]}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Tutar',
        align: 'right',
        sortable: true,
        width: 'w-32',
        render: (row) => (
          <span className={cn('font-semibold', row.status === 'completed' ? 'text-emerald-700' : 'text-slate-700')}>
            {formatPrice(row.amount)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Durum',
        width: 'w-32',
        render: (row) => (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', STATUS_BADGE[row.status])}>
            {STATUS_LABELS[row.status]}
          </span>
        ),
      },
      {
        key: 'description',
        header: 'Açıklama',
        render: (row) => (
          <div className="text-xs text-slate-600 max-w-xs">
            <div className="truncate">{row.description || '—'}</div>
            {row.payment_method && (
              <div className="text-[10px] text-slate-400 mt-0.5">{row.payment_method}</div>
            )}
          </div>
        ),
      },
      {
        key: 'id',
        header: 'Dekont',
        align: 'right',
        width: 'w-36',
        render: (row) => (
          <button
            type="button"
            disabled={!row.receipt_url}
            onClick={() => row.receipt_url && setReceiptTarget(row)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition',
              row.receipt_url
                ? 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed',
            )}
            title={row.receipt_url ? 'Dekontu görüntüle' : 'Dekont yok'}
          >
            <FileText className="h-3.5 w-3.5" /> PDF
          </button>
        ),
      },
      {
        key: 'actions',
        header: 'İşlem',
        align: 'right',
        width: 'w-48',
        render: (row) => {
          const isPending = row.status === 'pending';
          const isWithdraw = row.type === 'withdraw';
          const isBankDeposit = row.type === 'deposit' && row.payment_method === 'bank_transfer';
          if (!isPending || (!isWithdraw && !isBankDeposit)) {
            return <span className="text-xs text-slate-400">—</span>;
          }
          return (
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm(isWithdraw ? 'Çekim talebini onaylıyor musunuz? Bakiye düşülecek.' : 'Bakiye yüklemeyi onaylıyor musunuz?')) {
                    if (isWithdraw) {
                      approveWithdraw.mutate({ id: row.id, approve: true });
                    } else {
                      approveBankDeposit.mutate({ id: row.id, approve: true });
                    }
                  }
                }}
                disabled={approveWithdraw.isPending || approveBankDeposit.isPending}
                className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
              >
                <Check className="h-3.5 w-3.5" /> Onayla
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm(isWithdraw ? 'Çekim talebini reddediyor musunuz?' : 'Bakiye yüklemeyi reddediyor musunuz?')) {
                    if (isWithdraw) {
                      approveWithdraw.mutate({ id: row.id, approve: false });
                    } else {
                      approveBankDeposit.mutate({ id: row.id, approve: false });
                    }
                  }
                }}
                disabled={approveWithdraw.isPending || approveBankDeposit.isPending}
                className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition"
              >
                <X className="h-3.5 w-3.5" /> Reddet
              </button>
            </div>
          );
        },
      },
    ],
    [],
  );

  if (!canView) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Yetkiniz yok</h2>
        <p className="mt-1 text-sm text-slate-500">Bu sayfayı görüntülemek için transactions alanında yetki gerekir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">İşlem Geçmişi</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tüm kullanıcıların finansal hareketlerini izleyin, filtreleyin ve denetleyin.
          </p>
        </div>
        <button onClick={() => transactionsQuery.refetch()} className="btn-secondary self-start">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Filtrelenen İşlem</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{summary.count}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-emerald-600">Tamamlanan Tutar</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatPrice(summary.completed)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-slate-500">Toplam Tutar</div>
          <div className="text-2xl font-extrabold text-slate-700 mt-1">{formatPrice(summary.total)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-amber-600">Bekleyen</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">{summary.pending}</div>
        </div>
      </div>

      <div className="card p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="Kullanıcı, açıklama, referans…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | TxType)}
          className="input"
        >
          <option value="all">Tüm Tipler</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>{TYPE_LABELS[t]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TxStatus)}
          className="input"
        >
          <option value="all">Tüm Durumlar</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="input"
            title="Başlangıç tarihi"
          />
          <span className="text-slate-400">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="input"
            title="Bitiş tarihi"
          />
        </div>
        {(typeFilter !== 'all' || statusFilter !== 'all' || dateFrom || dateTo || search) && (
          <div className="lg:col-span-5 flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                setTypeFilter('all');
                setStatusFilter('all');
                setDateFrom('');
                setDateTo('');
                setSearch('');
              }}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              <Filter className="h-3 w-3 inline" /> Filtreleri temizle
            </button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        isLoading={transactionsQuery.isLoading}
        emptyMessage="Bu filtrelerle eşleşen işlem yok"
        pageSize={30}
      />

      {receiptTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setReceiptTarget(null);
          }}
        >
          <div className="relative w-full max-w-4xl h-[80vh] rounded-xl bg-white shadow-2xl border border-slate-200 flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  Dekont — {receiptTarget.user?.full_name || receiptTarget.user?.email}
                </h2>
                <p className="text-xs text-slate-500">
                  {TYPE_LABELS[receiptTarget.type]} · {formatPrice(receiptTarget.amount)} · {formatDate(receiptTarget.created_at)}
                </p>
              </div>
              <a
                href={receiptTarget.receipt_url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="btn-secondary text-xs"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Yeni sekme
              </a>
              <button onClick={() => setReceiptTarget(null)} className="p-1.5 rounded text-slate-400 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 bg-slate-100">
              {receiptTarget.receipt_url && isPdf(receiptTarget.receipt_url) ? (
                <iframe
                  src={receiptTarget.receipt_url}
                  className="w-full h-full"
                  title="Dekont"
                />
              ) : receiptTarget.receipt_url ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <img
                    src={receiptTarget.receipt_url}
                    alt="Dekont"
                    className="max-w-full max-h-full rounded shadow"
                  />
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  Bu işlem için dekont yüklenmemiş.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
