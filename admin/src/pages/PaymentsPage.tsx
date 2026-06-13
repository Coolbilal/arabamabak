import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { supabaseAdmin } from '../lib/supabaseAdmin';
import { cn, formatDateTime } from '../lib/utils';
import {
  AlertCircle, ChevronDown, ChevronRight, Loader2, Upload, Wallet,
  CheckCircle2, Building2, Car, Download,
} from 'lucide-react';
import type { PaymentRecord } from '../lib/types';

interface PaymentRow extends PaymentRecord {
  expert_valet?: { full_name: string; user_id: string } | null;
  expertise_dealership?: { name: string; user_id: string } | null;
  expertise_request?: { id: string; plate: string; city: string } | null;
  paid_by_profile?: { full_name: string } | null;
}

type RecipientFilter = 'all' | 'valet' | 'franchise';
type StatusFilter = 'all' | 'pending' | 'paid';

export default function PaymentsPage() {
  const { admin } = useAuth();
  const [recipientFilter, setRecipientFilter] = useState<RecipientFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number | 'all'>(new Date().getMonth() + 1);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    let query = supabase
      .from('payment_records')
      .select(`
        id, recipient_type, recipient_id, expertise_request_id, amount, iban,
        period_year, period_month, status, paid_at, paid_by, receipt_url, notes,
        created_at, updated_at,
        expert_valet:expert_valets!recipient_id(full_name, user_id),
        expertise_dealership:expertise_dealerships!recipient_id(name, user_id),
        expertise_request:expertise_requests!expertise_request_id(id, plate, city),
        paid_by_profile:profiles!paid_by(full_name)
      `)
      .eq('period_year', year)
      .is('deleted_at', null)
      .order('status', { ascending: true })
      .order('created_at', { ascending: false });

    if (month !== 'all') {
      query = query.eq('period_month', month);
    }
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    if (recipientFilter !== 'all') {
      query = query.eq('recipient_type', recipientFilter);
    }

    const { data, error } = await query;
    if (error) { setError('Ödemeler yüklenemedi: ' + error.message); setLoading(false); return; }
    setRows((data || []) as unknown as PaymentRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [recipientFilter, statusFilter, year, month]);

  async function handleMarkPaid(payment: PaymentRow) {
    if (!confirm(`${payment.amount} TL ödeme yapıldı olarak işaretlensin mi?\n\nDekontu yüklemeyi unutmayın!`)) return;
    if (!payment.receipt_url) {
      if (!confirm('Dekont yüklenmemiş! Yine de ödeme yapıldı işaretleyeyim mi?')) return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabaseAdmin
        .from('payment_records')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          paid_by: admin?.user_id,
        })
        .eq('id', payment.id);
      if (error) throw error;
      alert('✅ Ödeme yapıldı olarak işaretlendi.');
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUploadReceipt() {
    if (!selectedPayment || !receiptFile) {
      alert('Dosya seçiniz.');
      return;
    }
    setActionLoading(true);
    try {
      // Storage'a yükle
      const fileExt = receiptFile.name.split('.').pop();
      const fileName = `${selectedPayment.id}-${Date.now()}.${fileExt}`;
      const filePath = `payment-receipts/${fileName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('site-assets')
        .upload(filePath, receiptFile, {
          contentType: receiptFile.type,
          upsert: false,
        });
      if (uploadError) throw new Error('Dekont yüklenemedi: ' + uploadError.message);

      const { data: publicUrl } = supabaseAdmin.storage
        .from('site-assets')
        .getPublicUrl(filePath);

      // DB güncelle
      const { error: updateError } = await supabaseAdmin
        .from('payment_records')
        .update({ receipt_url: publicUrl.publicUrl })
        .eq('id', selectedPayment.id);
      if (updateError) throw updateError;

      alert('✅ Dekont yüklendi.');
      setUploadModalOpen(false);
      setSelectedPayment(null);
      setReceiptFile(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setActionLoading(false);
    }
  }

  const months = [
    'Tümü', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];

  const totalPending = rows.filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount), 0);
  const totalPaid = rows.filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Wallet className="h-7 w-7 text-brand-600" />
          Hakediş ve Ödemeler
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Vale ve ekspertiz bayilerinin hakedişleri. Manuel ödeme (banka EFT) + dekont yükleme.
        </p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-xs text-slate-500 font-semibold uppercase">Toplam Bekleyen</div>
          <div className="mt-2 text-2xl font-extrabold text-amber-600">{totalPending.toLocaleString('tr-TR')} ₺</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 font-semibold uppercase">Toplam Ödenmiş (Bu Ay)</div>
          <div className="mt-2 text-2xl font-extrabold text-emerald-600">{totalPaid.toLocaleString('tr-TR')} ₺</div>
        </div>
        <div className="card p-5">
          <div className="text-xs text-slate-500 font-semibold uppercase">Toplam Kayıt</div>
          <div className="mt-2 text-2xl font-extrabold text-slate-700">{rows.length}</div>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
        </div>
      )}

      <div className="card overflow-hidden">
        {/* Filtreler */}
        <div className="p-4 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Tip</label>
            <select className="input mt-1" value={recipientFilter} onChange={(e) => setRecipientFilter(e.target.value as RecipientFilter)}>
              <option value="all">Tümü</option>
              <option value="valet">Vale</option>
              <option value="franchise">Bayi</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Durum</label>
            <select className="input mt-1" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}>
              <option value="all">Tümü</option>
              <option value="pending">Bekleyen</option>
              <option value="paid">Ödenmiş</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Yıl</label>
            <select className="input mt-1" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[year - 1, year, year + 1].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Ay</label>
            <select className="input mt-1" value={month} onChange={(e) => setMonth(e.target.value === 'all' ? 'all' : Number(e.target.value))}>
              {months.map((m, i) => (
                <option key={i} value={i === 0 ? 'all' : i}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Liste */}
        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="px-4 py-12 text-center text-slate-500">
              <Loader2 className="inline h-5 w-5 animate-spin mr-2" /> Yükleniyor…
            </div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-slate-500">
              Kayıt bulunamadı
            </div>
          ) : (
            rows.map((row) => (
              <div key={row.id} className="bg-white">
                <div
                  onClick={() => setExpandedRow(expandedRow === row.id ? null : row.id)}
                  className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3"
                >
                  {expandedRow === row.id ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  {row.recipient_type === 'valet' ? <Car className="h-4 w-4 text-slate-500" /> : <Building2 className="h-4 w-4 text-slate-500" />}
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">
                      {row.recipient_type === 'valet'
                        ? (row.expert_valet?.full_name || 'Vale #' + row.recipient_id.slice(0, 8))
                        : (row.expertise_dealership?.name || 'Bayi #' + row.recipient_id.slice(0, 8))}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.expertise_request?.plate && `Plaka: ${row.expertise_request.plate}`}
                      {' • '}
                      {months[row.period_month]} {row.period_year}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">{Number(row.amount).toLocaleString('tr-TR')} ₺</div>
                    <span className={cn(
                      'badge text-xs',
                      row.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                    )}>
                      {row.status === 'paid' ? '✅ Ödendi' : '⏳ Beklemede'}
                    </span>
                  </div>
                </div>

                {expandedRow === row.id && (
                  <div className="px-4 py-4 bg-slate-50 border-t border-slate-200 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-xs text-slate-500">Alıcı</div>
                        <div className="font-medium">
                          {row.recipient_type === 'valet' ? 'Vale' : 'Bayi'}: {row.recipient_type === 'valet' ? row.expert_valet?.full_name : row.expertise_dealership?.name}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">İlgili İş</div>
                        <div className="font-medium">
                          {row.expertise_request?.plate ? `${row.expertise_request.plate} - ${row.expertise_request.city || '-'}` : '-'}
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-xs text-slate-500">IBAN</div>
                        <div className="font-mono text-sm bg-white rounded px-2 py-1 mt-1">{row.iban || '(IBAN girilmemiş)'}</div>
                      </div>
                      {row.paid_at && (
                        <div className="col-span-2">
                          <div className="text-xs text-slate-500">Ödeme Bilgisi</div>
                          <div className="text-sm">
                            {formatDateTime(row.paid_at)} • {row.paid_by_profile?.full_name || 'Admin'}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      {row.status === 'pending' && (
                        <>
                          <button
                            onClick={() => { setSelectedPayment(row); setUploadModalOpen(true); }}
                            className="btn-secondary text-xs"
                          >
                            <Upload className="h-3.5 w-3.5" /> {row.receipt_url ? 'Dekontu Değiştir' : 'Dekont Yükle'}
                          </button>
                          <button
                            onClick={() => handleMarkPaid(row)}
                            className="btn-primary text-xs"
                            disabled={actionLoading}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" /> Ödeme Yapıldı İşaretle
                          </button>
                        </>
                      )}
                      {row.receipt_url && (
                        <a
                          href={row.receipt_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost text-xs"
                        >
                          <Download className="h-3.5 w-3.5" /> Dekontu Gör
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Dekont Yükleme Modal */}
      {uploadModalOpen && selectedPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setUploadModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-900">Dekont Yükle</h3>
            <p className="text-sm text-slate-500 mt-1">Banka EFT dekontu (PDF, JPG, PNG). Max 5MB.</p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="mt-4 block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
            />
            {receiptFile && (
              <div className="mt-2 text-sm text-slate-700">📎 {receiptFile.name}</div>
            )}
            <div className="mt-4 flex gap-2 justify-end">
              <button onClick={() => { setUploadModalOpen(false); setSelectedPayment(null); setReceiptFile(null); }} className="btn-ghost">İptal</button>
              <button onClick={handleUploadReceipt} className="btn-primary" disabled={actionLoading || !receiptFile}>
                {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Yükle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
