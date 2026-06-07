import { useState, useRef } from 'react';
import { Building2, Copy, Check, Upload, Loader2, AlertCircle, X, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

interface BankTransferModalProps {
  amount: number;
  description: string;
  bankConfig: {
    bank_name?: string;
    account_holder?: string;
    iban?: string;
    branch_code?: string;
  };
  onCancel: () => void;
  onSuccess: (reference: string) => void;
}

export default function BankTransferModal({
  amount, description, bankConfig, onCancel, onSuccess,
}: BankTransferModalProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const copy = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receipt) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const path = `receipts/${user.id}/${Date.now()}-${receipt.name}`;
    const { error: upErr } = await supabase.storage.from('site-assets').upload(path, receipt);
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from('site-assets').getPublicUrl(path);
    return pub.publicUrl;
  };

  const submit = async () => {
    setError(null);
    setUploading(true);
    try {
      const url = await uploadReceipt();
    void url;
    const reference = `TRF-${Date.now()}`;
      // Transaction daha sonra parent tarafından oluşturulacak; burada sadece referans + opsiyonel receipt döndürüyoruz
      onSuccess(reference);
    } catch (e: any) {
      setError(e?.message || 'Dekont yüklenemedi');
    } finally {
      setUploading(false);
    }
  };

  const fields = [
    { label: 'Banka', value: bankConfig.bank_name ?? '-' },
    { label: 'Hesap Sahibi', value: bankConfig.account_holder ?? '-' },
    { label: 'IBAN', value: bankConfig.iban ?? '-', mono: true },
    { label: 'Şube', value: bankConfig.branch_code ?? '-' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="bg-gradient-to-r from-amber-600 to-amber-800 p-5 text-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="text-sm font-medium">Banka Havalesi / EFT</span>
            </div>
            <button onClick={onCancel} className="text-white/70 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="text-2xl font-bold">{amount.toLocaleString('tr-TR')} ₺</div>
          <div className="text-xs text-white/70 mt-0.5 truncate">{description}</div>
        </div>

        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2.5 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}

          <p className="text-sm text-slate-600">
            Aşağıdaki IBAN'a <strong>{amount.toLocaleString('tr-TR')} ₺</strong> gönderin ve dekontu yükleyin.
            Ödemeniz 1-2 saat içinde onaylanacaktır.
          </p>

          <div className="rounded-lg border border-slate-200 divide-y divide-slate-200">
            {fields.map((f) => (
              <div key={f.label} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-xs text-slate-500">{f.label}</div>
                  <div className={cn('text-sm font-medium text-slate-900', f.mono && 'font-mono text-xs')}>
                    {f.value}
                  </div>
                </div>
                {f.value && f.value !== '-' && (
                  <button
                    onClick={() => copy(f.label, f.value)}
                    className="p-1.5 rounded-md hover:bg-slate-100"
                  >
                    {copied === f.label ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">
              Dekont Yükle (opsiyonel — daha hızlı onay)
            </label>
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setReceipt(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn-secondary text-sm"
              >
                <Upload className="h-4 w-4" />
                {receipt ? receipt.name : 'Dosya Seç'}
              </button>
              {receipt && (
                <button
                  type="button"
                  onClick={() => { setReceipt(null); if (fileRef.current) fileRef.current.value = ''; }}
                  className="text-xs text-red-600 hover:underline"
                >
                  Kaldır
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-slate-200 flex gap-2">
          <button onClick={onCancel} className="btn-secondary flex-1">İptal</button>
          <button onClick={submit} disabled={uploading} className="btn-primary flex-1">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Havale Bildir
          </button>
        </div>
      </div>
    </div>
  );
}
