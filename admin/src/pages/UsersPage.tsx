import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Wallet, Search, Phone, MapPin, Calendar, Ban, User as UserIcon,
  Plus, Minus, AlertCircle, RefreshCw, Save, Check,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate, formatPrice } from '../lib/utils';
import DataTable, { type DataTableColumn } from '../components/DataTable';

interface ProfileRow {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  avatar_url: string | null;
  role: 'user' | 'dealer' | 'admin';
  wallet_balance: number;
  created_at: string;
  updated_at: string;
}

const walletSchema = z.object({
  direction: z.enum(['add', 'subtract']),
  amount: z.number({ message: 'Tutar zorunludur' }).positive('Tutar 0’dan büyük olmalıdır'),
  description: z.string().min(3, 'Açıklama en az 3 karakter olmalıdır'),
});

type WalletForm = z.infer<typeof walletSchema>;

const ROLE_LABELS: Record<ProfileRow['role'], string> = {
  user: 'Kullanıcı',
  dealer: 'Bayi',
  admin: 'Admin',
};

const ROLE_BADGE: Record<ProfileRow['role'], string> = {
  user: 'bg-slate-100 text-slate-700',
  dealer: 'bg-sky-100 text-sky-700',
  admin: 'bg-amber-100 text-amber-700',
};

export default function UsersPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ProfileRow['role']>('all');
  const [walletTarget, setWalletTarget] = useState<ProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canView = hasPermission('users', 'view');
  const canEdit = hasPermission('users', 'edit');

  const usersQuery = useQuery({
    queryKey: ['users'],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, city, district, avatar_url, role, wallet_balance, created_at, updated_at')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as ProfileRow[];
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WalletForm>({
    resolver: zodResolver(walletSchema),
    defaultValues: { direction: 'add', amount: 0, description: '' },
  });
  const direction = watch('direction');

  const walletMutation = useMutation({
    mutationFn: async (values: WalletForm) => {
      if (!walletTarget) throw new Error('Hedef kullanıcı seçilmedi');
      const signedAmount = values.direction === 'add' ? values.amount : -values.amount;
      const newBalance = Number(walletTarget.wallet_balance) + signedAmount;
      if (newBalance < 0) {
        throw new Error('Bakiye negatif olamaz');
      }
      // 1) transactions insert
      const txType = values.direction === 'add' ? 'deposit' : 'payment';
      const { error: txErr } = await supabase.from('transactions').insert({
        user_id: walletTarget.id,
        type: txType,
        amount: Math.abs(signedAmount),
        status: 'completed',
        description: values.description.trim(),
        payment_method: 'admin_adjustment',
        completed_at: new Date().toISOString(),
      });
      if (txErr) throw txErr;
      // 2) profiles update wallet_balance
      const { error: upErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: newBalance })
        .eq('id', walletTarget.id);
      if (upErr) throw upErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      setWalletTarget(null);
      reset({ direction: 'add', amount: 0, description: '' });
    },
    onError: (e: any) => setError(e?.message || 'Cüzdan güncellenemedi'),
  });

  const onSubmitWallet = handleSubmit((values) => walletMutation.mutate(values));

  const filtered = useMemo(() => {
    const list = usersQuery.data ?? [];
    return list.filter((r) => {
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (r.full_name ?? '').toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        (r.phone ?? '').toLowerCase().includes(q) ||
        (r.city ?? '').toLowerCase().includes(q)
      );
    });
  }, [usersQuery.data, roleFilter, search]);

  const totalBalance = useMemo(
    () => (usersQuery.data ?? []).reduce((acc, r) => acc + Number(r.wallet_balance), 0),
    [usersQuery.data],
  );

  const columns: DataTableColumn<ProfileRow>[] = useMemo(
    () => [
      {
        key: 'full_name',
        header: 'Ad Soyad',
        sortable: true,
        render: (row) => (
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">
              {row.avatar_url ? (
                <img src={row.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                (row.full_name || row.email || '?').slice(0, 1).toUpperCase()
              )}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-slate-800 truncate">{row.full_name || '—'}</div>
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <UserIcon className="h-3 w-3" />
                {row.email}
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'phone',
        header: 'Telefon',
        width: 'w-36',
        render: (row) => (
          <span className="text-slate-600 text-xs flex items-center gap-1">
            <Phone className="h-3 w-3 text-slate-400" />
            {row.phone || '—'}
          </span>
        ),
      },
      {
        key: 'city',
        header: 'Konum',
        width: 'w-40',
        render: (row) => (
          <span className="text-slate-600 text-xs flex items-center gap-1">
            <MapPin className="h-3 w-3 text-slate-400" />
            {row.city || '—'}{row.district ? ` / ${row.district}` : ''}
          </span>
        ),
      },
      {
        key: 'role',
        header: 'Rol',
        width: 'w-28',
        render: (row) => (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold', ROLE_BADGE[row.role])}>
            {ROLE_LABELS[row.role]}
          </span>
        ),
      },
      {
        key: 'wallet_balance',
        header: 'Cüzdan',
        align: 'right',
        sortable: true,
        width: 'w-36',
        render: (row) => (
          <div className="text-right">
            <div className="font-semibold text-slate-800">{formatPrice(row.wallet_balance)}</div>
            <div className="text-[10px] text-slate-400">anlık bakiye</div>
          </div>
        ),
      },
      {
        key: 'created_at',
        header: 'Kayıt',
        sortable: true,
        width: 'w-40',
        render: (row) => (
          <span className="text-xs text-slate-500 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(row.created_at)}
          </span>
        ),
      },
      {
        key: 'updated_at',
        header: 'Son Güncelleme',
        sortable: true,
        width: 'w-40',
        render: (row) => <span className="text-xs text-slate-500">{formatDate(row.updated_at)}</span>,
      },
      {
        key: 'id',
        header: 'İşlemler',
        align: 'right',
        width: 'w-72',
        render: (row) => (
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setWalletTarget(row)}
              disabled={!canEdit || row.role === 'admin'}
              className="btn-secondary text-xs disabled:opacity-40"
              title={row.role === 'admin' ? 'Admin cüzdanı düzenlenemez' : 'Cüzdan düzenle'}
            >
              <Wallet className="h-3.5 w-3.5" /> Cüzdan
            </button>
            <button
              type="button"
              disabled
              className="btn-secondary text-xs text-slate-400 cursor-not-allowed"
              title="Ban özelliği yakında eklenecek"
            >
              <Ban className="h-3.5 w-3.5" /> Yakında: Ban
            </button>
          </div>
        ),
      },
    ],
    [canEdit],
  );

  if (!canView) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Yetkiniz yok</h2>
        <p className="mt-1 text-sm text-slate-500">Bu sayfayı görüntülemek için users alanında yetki gerekir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kullanıcılar</h1>
          <p className="text-sm text-slate-500 mt-1">
            Platformdaki tüm kullanıcıları yönetin ve cüzdan işlemlerini gerçekleştirin.
          </p>
        </div>
        <button onClick={() => usersQuery.refetch()} className="btn-secondary self-start">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-4">
          <div className="text-xs text-slate-500">Toplam Kullanıcı</div>
          <div className="text-2xl font-extrabold text-slate-900 mt-1">{usersQuery.data?.length ?? 0}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-sky-600">Bayiler</div>
          <div className="text-2xl font-extrabold text-sky-700 mt-1">
            {(usersQuery.data ?? []).filter((r) => r.role === 'dealer').length}
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-emerald-600">Toplam Cüzdan Bakiyesi</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">{formatPrice(totalBalance)}</div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-amber-600">Bu Ay Yeni</div>
          <div className="text-2xl font-extrabold text-amber-700 mt-1">
            {(usersQuery.data ?? []).filter((r) => {
              const d = new Date(r.created_at);
              const now = new Date();
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            }).length}
          </div>
        </div>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            placeholder="İsim, e-posta, telefon, şehir…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as 'all' | ProfileRow['role'])}
          className="input max-w-xs"
        >
          <option value="all">Tüm Roller</option>
          <option value="user">Kullanıcı</option>
          <option value="dealer">Bayi</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(r) => r.id}
        isLoading={usersQuery.isLoading}
        emptyMessage="Bu filtreyle eşleşen kullanıcı yok"
      />

      {walletTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !walletMutation.isPending) setWalletTarget(null);
          }}
        >
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl border border-slate-200">
            <div className="p-6 border-b border-slate-200 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900 truncate">
                  Cüzdan Düzenle
                </h2>
                <p className="text-xs text-slate-500 truncate">
                  {walletTarget.full_name || walletTarget.email}
                </p>
              </div>
              <button
                onClick={() => setWalletTarget(null)}
                disabled={walletMutation.isPending}
                className="ml-auto p-1.5 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-sm">
              <div className="text-slate-500">Mevcut Bakiye</div>
              <div className="font-bold text-slate-800">{formatPrice(walletTarget.wallet_balance)}</div>
            </div>

            <form onSubmit={onSubmitWallet} className="p-6 space-y-4">
              <div>
                <label className="label">İşlem Yönü</label>
                <div className="grid grid-cols-2 gap-2">
                  <label
                    className={cn(
                      'flex items-center justify-center gap-2 cursor-pointer rounded-lg border-2 px-3 py-2 text-sm font-medium transition',
                      direction === 'add'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300',
                    )}
                  >
                    <input type="radio" value="add" className="sr-only" {...register('direction')} />
                    <Plus className="h-4 w-4" /> Bakiye Ekle
                  </label>
                  <label
                    className={cn(
                      'flex items-center justify-center gap-2 cursor-pointer rounded-lg border-2 px-3 py-2 text-sm font-medium transition',
                      direction === 'subtract'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300',
                    )}
                  >
                    <input type="radio" value="subtract" className="sr-only" {...register('direction')} />
                    <Minus className="h-4 w-4" /> Bakiye Düş
                  </label>
                </div>
              </div>

              <div>
                <label className="label">Tutar (₺)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className={cn('input', errors.amount && 'border-red-400')}
                  {...register('amount', { valueAsNumber: true })}
                />
                {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
              </div>

              <div>
                <label className="label">Açıklama</label>
                <textarea
                  rows={3}
                  placeholder="Örn: Bonus yükleme, manuel düzeltme, iade…"
                  className={cn('input min-h-[80px]', errors.description && 'border-red-400')}
                  {...register('description')}
                />
                {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
              </div>

              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                Bu işlem <b>transactions</b> tablosuna bir kayıt ekler ve <b>profiles.wallet_balance</b> değerini günceller. Geri almak için ters yönde yeni bir işlem oluşturmanız gerekir.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWalletTarget(null)}
                  disabled={walletMutation.isPending}
                  className="btn-secondary"
                >
                  Vazgeç
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || walletMutation.isPending}
                  className={cn(
                    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50',
                    direction === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700',
                  )}
                >
                  <Save className="h-4 w-4" />
                  {walletMutation.isPending ? 'Kaydediliyor…' : (<><Check className="h-4 w-4" /> Onayla</>)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
