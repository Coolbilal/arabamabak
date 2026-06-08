import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { jsPDF } from 'jspdf';
import {
  Wallet, Plus, Minus, X, Loader, FileText, AlertCircle,
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatDate, formatPrice } from '../lib/utils';
import type { Transaction, TxStatus, TxType } from '../lib/types';

const TX_LABELS: Record<TxType, string> = {
  deposit: 'Para Yükleme',
  withdraw: 'Para Çekme',
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

const STATUS_STYLES: Record<TxStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  completed: 'bg-emerald-100 text-emerald-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-700',
};

const depositSchema = z.object({
  amount: z.number().positive('Tutar pozitif olmalı').max(100000, 'Maks 100.000 ₺'),
  card_number: z
    .string()
    .transform((s) => s.replace(/\s+/g, ''))
    .refine((s) => /^\d{16}$/.test(s), '16 haneli kart numarası girin'),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, 'AA/YY formatında girin'),
  cvv: z.string().regex(/^\d{3,4}$/, '3-4 haneli CVV'),
  card_name: z.string().min(2, 'Kart üzerindeki adı girin').max(60),
});

type DepositValues = z.infer<typeof depositSchema>;

const withdrawSchema = z.object({
  iban: z
    .string()
    .transform((s) => s.replace(/\s+/g, '').toUpperCase())
    .refine((s) => /^TR\d{24}$/.test(s), 'Geçerli bir TR IBAN girin (26 karakter, TR ile başlayan)'),
  amount: z.number().positive('Tutar pozitif olmalı'),
});

type WithdrawValues = z.infer<typeof withdrawSchema>;

export default function WalletPage() {
  const { user, profile, refreshProfile } = useAuth();
  if (!user) return <Navigate to="/giris" replace />;

  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const qc = useQueryClient();

  const txQuery = useQuery({
    queryKey: ['wallet-tx', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Transaction[];
    },
  });

  const deposit = useMutation({
    mutationFn: async (vals: DepositValues) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      // 1) transaction kaydı (completed)
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'deposit',
          amount: vals.amount,
          status: 'completed',
          payment_method: 'credit_card',
          description: `Kredi kartı ile bakiye yükleme`,
          completed_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      if (txErr) throw txErr;
      // 2) bakiye artır (atomic)
      const { error: rpcErr } = await supabase.rpc('increment_balance', {
        uid: user.id,
        delta: vals.amount,
      });
      if (rpcErr) {
        // fallback: select + update
        const cur = profile?.wallet_balance ?? 0;
        const { error: updErr } = await supabase
          .from('profiles')
          .update({ wallet_balance: cur + vals.amount })
          .eq('id', user.id);
        if (updErr) throw updErr;
      }
      return tx;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-tx'] });
      refreshProfile();
      setShowDeposit(false);
    },
    onError: (err: Error) => alert(err.message || 'Yükleme başarısız'),
  });

  const withdraw = useMutation({
    mutationFn: async (vals: WithdrawValues) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      const balance = profile?.wallet_balance ?? 0;
      if (vals.amount > balance) throw new Error('Yetersiz bakiye');
      // 1) transaction kaydı (pending)
      const { error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'withdraw',
          amount: vals.amount,
          status: 'pending',
          payment_method: 'bank_transfer',
          reference_id: vals.iban,
          description: `IBAN ${vals.iban.slice(0, 4)}****${vals.iban.slice(-4)} adresine çekim talebi`,
        });
      if (txErr) throw txErr;
      // 2) bakiyeyi düş
      const { error: updErr } = await supabase
        .from('profiles')
        .update({ wallet_balance: balance - vals.amount })
        .eq('id', user.id);
      if (updErr) throw updErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wallet-tx'] });
      refreshProfile();
      setShowWithdraw(false);
    },
    onError: (err: Error) => alert(err.message || 'Çekim başarısız'),
  });

  const downloadReceipt = (tx: Transaction) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    doc.setFont('helvetica');
    const W = doc.internal.pageSize.getWidth();

    doc.setFillColor(220, 38, 38);
    doc.rect(0, 0, W, 70, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text('arabamabak - Dekont', 40, 42);

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(11);
    let y = 110;
    const line = (k: string, v: string) => {
      doc.setFont('helvetica', 'bold');
      doc.text(k + ':', 40, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(v), 200, y);
      y += 22;
    };

    line('Islem No', tx.id);
    line('Tarih', formatDate(tx.created_at));
    line('Kullanici', profile?.full_name ?? user.email ?? '-');
    line('E-posta', user.email ?? '-');
    line('Islem Tipi', TX_LABELS[tx.type] ?? tx.type);
    line('Tutar', formatPrice(tx.amount));
    line('Durum', STATUS_LABELS[tx.status] ?? tx.status);
    if (tx.reference_id) line('Referans', tx.reference_id);
    if (tx.description) line('Aciklama', tx.description);
    if (tx.payment_method) line('Odeme Yontemi', tx.payment_method);
    if (tx.completed_at) line('Tamamlanma', formatDate(tx.completed_at));

    y += 30;
    doc.setDrawColor(226, 232, 240);
    doc.line(40, y, W - 40, y);
    y += 24;
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Bu belge arabamabak tarafindan otomatik uretilmistir.', 40, y);
    doc.text(`Olusturma: ${new Date().toLocaleString('tr-TR')}`, 40, y + 14);

    doc.save(`dekont-${tx.id.slice(0, 8)}.pdf`);
  };

  const txs = txQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Cüzdanım</h1>

      <div className="card mb-6 overflow-hidden">
        <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 p-8 text-white">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
            <Wallet className="h-4 w-4" /> Mevcut Bakiye
          </div>
          <div className="mt-2 text-5xl font-extrabold tracking-tight">
            {formatPrice(profile?.wallet_balance ?? 0)}
          </div>
          <p className="mt-1 text-sm text-white/80">
            Bu bakiyeyi açık arttırma, ilan ve ekspertiz ödemelerinde kullanabilirsiniz.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowDeposit(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-amber-50"
            >
              <Plus className="h-4 w-4" /> Para Yükle
            </button>
            <button
              type="button"
              onClick={() => setShowWithdraw(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              <Minus className="h-4 w-4" /> Para Çek
            </button>
          </div>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-bold text-slate-900">İşlem Geçmişi</h2>
        </div>
        {txQuery.isLoading ? (
          <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
            <Loader className="h-5 w-5 animate-spin" /> Yükleniyor...
          </div>
        ) : txs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-500">
            <FileText className="h-10 w-10 text-slate-300" />
            <p>Henüz işleminiz bulunmuyor.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Tarih</th>
                  <th className="px-4 py-3 text-left">İşlem</th>
                  <th className="px-4 py-3 text-right">Tutar</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-right">Dekont</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.map((tx) => {
                  const positive = tx.type === 'deposit' || tx.type === 'refund';
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                        {formatDate(tx.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-slate-800">
                          {positive ? (
                            <ArrowDownCircle className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <ArrowUpCircle className="h-4 w-4 text-rose-600" />
                          )}
                          <span className="font-medium">{TX_LABELS[tx.type] ?? tx.type}</span>
                        </div>
                        {tx.description && (
                          <div className="text-xs text-slate-500">{tx.description}</div>
                        )}
                      </td>
                      <td
                        className={cn(
                          'whitespace-nowrap px-4 py-3 text-right font-bold tabular-nums',
                          positive ? 'text-emerald-700' : 'text-rose-700',
                        )}
                      >
                        {positive ? '+' : '-'}
                        {formatPrice(tx.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('badge', STATUS_STYLES[tx.status])}>
                          {tx.status === 'completed' ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <Clock className="mr-1 h-3 w-3" />
                          )}
                          {STATUS_LABELS[tx.status] ?? tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => downloadReceipt(tx)}
                          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <FileText className="h-3.5 w-3.5" /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showDeposit && (
        <Modal onClose={() => setShowDeposit(false)} title="Para Yükle">
          <DepositForm onSubmit={(v) => deposit.mutate(v)} pending={deposit.isPending} />
        </Modal>
      )}

      {showWithdraw && (
        <Modal onClose={() => setShowWithdraw(false)} title="Para Çek">
          <WithdrawForm
            onSubmit={(v) => withdraw.mutate(v)}
            pending={withdraw.isPending}
            balance={profile?.wallet_balance ?? 0}
          />
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 animate-fade-in" onClick={onClose}>
      <div
        className="card w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function DepositForm({ onSubmit, pending }: { onSubmit: (v: DepositValues) => void; pending: boolean }) {
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<DepositValues>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 500, card_number: '', expiry: '', cvv: '', card_name: '' },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Tutar (₺) *</label>
        <input
          type="number"
          step="0.01"
          className={cn('input', errors.amount && 'border-red-400')}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Kart Numarası *</label>
        <input
          className={cn('input font-mono', errors.card_number && 'border-red-400')}
          placeholder="0000 0000 0000 0000"
          maxLength={19}
          {...register('card_number')}
        />
        {errors.card_number && <p className="mt-1 text-xs text-red-600">{errors.card_number.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">Son Kullanma *</label>
          <input
            className={cn('input font-mono', errors.expiry && 'border-red-400')}
            placeholder="AA/YY"
            maxLength={5}
            {...register('expiry')}
          />
          {errors.expiry && <p className="mt-1 text-xs text-red-600">{errors.expiry.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-700">CVV *</label>
          <input
            type="password"
            className={cn('input font-mono', errors.cvv && 'border-red-400')}
            placeholder="000"
            maxLength={4}
            {...register('cvv')}
          />
          {errors.cvv && <p className="mt-1 text-xs text-red-600">{errors.cvv.message}</p>}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Kart Üzerindeki Ad *</label>
        <input
          className={cn('input', errors.card_name && 'border-red-400')}
          placeholder="AD SOYAD"
          {...register('card_name')}
        />
        {errors.card_name && <p className="mt-1 text-xs text-red-600">{errors.card_name.message}</p>}
      </div>

      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          Bu demo bir ödeme akışıdır. Gerçek kart bilgisi girmeyin. Bakiye yalnızca test amaçlı yüklenir.
        </span>
      </div>

      <button type="submit" disabled={pending} className="btn-primary w-full justify-center">
        {pending ? <Loader className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
        Yükle
      </button>
    </form>
  );
}

function WithdrawForm({
  onSubmit, pending, balance,
}: { onSubmit: (v: WithdrawValues) => void; pending: boolean; balance: number }) {
  const {
    register, handleSubmit, formState: { errors },
  } = useForm<WithdrawValues>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: { iban: '', amount: 100 },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        Kullanılabilir Bakiye: <span className="font-bold">{formatPrice(balance)}</span>
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">IBAN *</label>
        <input
          className={cn('input font-mono', errors.iban && 'border-red-400')}
          placeholder="TR00 0000 0000 0000 0000 0000 00"
          maxLength={32}
          {...register('iban')}
        />
        {errors.iban && <p className="mt-1 text-xs text-red-600">{errors.iban.message}</p>}
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-700">Tutar (₺) *</label>
        <input
          type="number"
          step="0.01"
          max={balance}
          className={cn('input', errors.amount && 'border-red-400')}
          {...register('amount', { valueAsNumber: true })}
        />
        {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
      </div>
      <div className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-800">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>Çekim talepleri admin onayından sonra IBAN'ınıza aktarılır.</span>
      </div>
      <button type="submit" disabled={pending} className="btn-primary w-full justify-center">
        {pending ? <Loader className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
        Çekim Talebi Oluştur
      </button>
    </form>
  );
}
