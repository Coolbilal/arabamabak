import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreditCard, Wallet, Building2, Edit3, Save, X, AlertCircle,
  Loader2, Eye, EyeOff, RefreshCw, Key, Hash,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  type: 'wallet' | 'card' | 'bank';
  is_active: boolean;
  is_default: boolean;
  sort_order: number;
  icon: string;
  fee_percent: number;
  fee_fixed: number;
  description: string | null;
  config: Record<string, any>;
}

const ICON_MAP: Record<string, any> = {
  Wallet, CreditCard, Building2, Bank: Building2,
};

function IconByName({ name, className }: { name: string; className?: string }) {
  const I = ICON_MAP[name] ?? CreditCard;
  return <I className={className} />;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  wallet: { label: 'Cüzdan', color: 'bg-emerald-100 text-emerald-700' },
  card:   { label: 'Kart', color: 'bg-blue-100 text-blue-700' },
  bank:   { label: 'Banka', color: 'bg-amber-100 text-amber-700' },
};

export default function PaymentMethodsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const canEdit = hasPermission('site_settings', 'edit');

  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentMethod[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('payment_methods').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      // Önce diğerlerinin default'unu kaldır
      await supabase.from('payment_methods').update({ is_default: false }).neq('id', id);
      const { error } = await supabase.from('payment_methods').update({ is_default: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-methods'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ödeme Yöntemleri</h1>
          <p className="text-sm text-slate-500">
            Kullanıcılara sunulan ödeme yöntemlerini yönet. Cüzdan, kredi kartı (iyzico/PayTR/sanal POS) ve banka havalesi.
          </p>
        </div>
        <button
          onClick={() => methods.refetch()}
          className="btn-secondary"
        >
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {!canEdit && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Yetkiniz yok — sadece görüntüleyebilirsiniz.</span>
          </div>
        </div>
      )}

      {methods.isLoading && (
        <div className="card p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {methods.data?.map((m) => {
          const t = TYPE_LABELS[m.type] ?? TYPE_LABELS.card;
          return (
            <div key={m.id} className={cn('card p-5 space-y-3', !m.is_active && 'opacity-60')}>
              <div className="flex items-start justify-between">
                <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', t.color)}>
                  <IconByName name={m.icon} className="h-5 w-5" />
                </div>
                <div className="flex items-center gap-1">
                  {m.is_default && (
                    <span className="badge bg-emerald-100 text-emerald-700">Varsayılan</span>
                  )}
                  <span className={cn('badge', t.color)}>{t.label}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900">{m.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">Kod: {m.code}</p>
                {m.description && (
                  <p className="text-sm text-slate-600 mt-2">{m.description}</p>
                )}
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div>Komisyon: <strong>%{m.fee_percent}</strong> + <strong>{m.fee_fixed} TL</strong></div>
                {m.type === 'card' && m.config?.sandbox !== undefined && (
                  <div>Mod: <strong className={m.config.sandbox ? 'text-amber-600' : 'text-emerald-600'}>
                    {m.config.sandbox ? 'SANDBOX (Test)' : 'PRODUCTION (Canlı)'}
                  </strong></div>
                )}
                {m.type === 'bank' && m.config?.iban && (
                  <div className="font-mono text-[10px] truncate">IBAN: {m.config.iban}</div>
                )}
              </div>

              {canEdit && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setEditing(m)}
                    className="btn-secondary text-xs"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Düzenle
                  </button>
                  <button
                    onClick={() => toggleActive.mutate({ id: m.id, is_active: !m.is_active })}
                    className={cn('text-xs px-3 py-1.5 rounded-md font-medium border',
                      m.is_active
                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    )}
                  >
                    {m.is_active ? 'Devre Dışı' : 'Etkinleştir'}
                  </button>
                  {!m.is_default && m.is_active && (
                    <button
                      onClick={() => setDefault.mutate(m.id)}
                      className="text-xs px-3 py-1.5 rounded-md font-medium border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                    >
                      Varsayılan Yap
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {methods.data?.length === 0 && !methods.isLoading && (
        <div className="card p-8 text-center text-slate-500">
          Henüz ödeme yöntemi tanımlı değil. SQL seed'ini çalıştırın.
        </div>
      )}

      {editing && (
        <PaymentMethodEditModal
          method={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); qc.invalidateQueries({ queryKey: ['payment-methods'] }); }}
          showSecrets={showSecrets}
          setShowSecrets={setShowSecrets}
        />
      )}
    </div>
  );
}

function PaymentMethodEditModal({
  method,
  onClose,
  onSaved,
  showSecrets,
  setShowSecrets,
}: {
  method: PaymentMethod;
  onClose: () => void;
  onSaved: () => void;
  showSecrets: Record<string, boolean>;
  setShowSecrets: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const [name, setName] = useState(method.name);
  const [description, setDescription] = useState(method.description ?? '');
  const [feePercent, setFeePercent] = useState(String(method.fee_percent));
  const [feeFixed, setFeeFixed] = useState(String(method.fee_fixed));
  const [isActive, setIsActive] = useState(method.is_active);
  const [config, setConfig] = useState<Record<string, any>>(method.config ?? {});
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description: description || null,
        fee_percent: Number(feePercent) || 0,
        fee_fixed: Number(feeFixed) || 0,
        is_active: isActive,
        config,
      };
      const { error } = await supabase.from('payment_methods').update(payload).eq('id', method.id);
      if (error) throw error;
    },
    onSuccess: onSaved,
    onError: (e: any) => setError(e?.message || 'Kaydedilemedi'),
  });

  const setCfg = (k: string, v: any) => setConfig((c) => ({ ...c, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <IconByName name={method.icon} className="h-5 w-5" />
            {method.name} — Düzenle
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3 flex items-center gap-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div>
            <label className="label">Görünen Ad</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Açıklama (kullanıcıya)</label>
            <textarea className="input" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Komisyon (%)</label>
              <input type="number" step="0.01" min="0" className="input" value={feePercent} onChange={(e) => setFeePercent(e.target.value)} />
            </div>
            <div>
              <label className="label">Komisyon sabit (TL)</label>
              <input type="number" step="0.01" min="0" className="input" value={feeFixed} onChange={(e) => setFeeFixed(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span>Aktif (kullanıcılara göster)</span>
          </label>

          {/* Provider-specific config */}
          {method.type === 'card' && (
            <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Key className="h-4 w-4" /> Sanal POS / Ödeme Sağlayıcı Ayarları
              </h3>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!config.sandbox}
                  onChange={(e) => setCfg('sandbox', e.target.checked)}
                />
                <span>Sandbox / Test modu (canlıda kapat)</span>
              </label>
              <div>
                <label className="label flex items-center gap-1"><Key className="h-3 w-3" /> API Key</label>
                <div className="flex gap-2">
                  <input
                    type={showSecrets[method.id] ? 'text' : 'password'}
                    className="input flex-1 font-mono text-xs"
                    value={config.api_key ?? ''}
                    onChange={(e) => setCfg('api_key', e.target.value)}
                    placeholder="api-xxxxxxxx"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecrets((s) => ({ ...s, [method.id]: !s[method.id] }))}
                    className="btn-secondary shrink-0"
                  >
                    {showSecrets[method.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="label flex items-center gap-1"><Key className="h-3 w-3" /> Secret Key</label>
                <input
                  type="password"
                  className="input font-mono text-xs"
                  value={config.secret_key ?? ''}
                  onChange={(e) => setCfg('secret_key', e.target.value)}
                  placeholder="sk-xxxxxxxx"
                />
              </div>
              <div>
                <label className="label flex items-center gap-1"><Hash className="h-3 w-3" /> Merchant / Mağaza ID</label>
                <input
                  className="input"
                  value={config.merchant_id ?? ''}
                  onChange={(e) => setCfg('merchant_id', e.target.value)}
                  placeholder="12345"
                />
              </div>
              <p className="text-xs text-slate-500">
                Bilgiler Supabase'de şifresiz saklanır. Production'da Supabase Vault veya environment variable kullan.
              </p>
            </div>
          )}

          {method.type === 'bank' && (
            <div className="space-y-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Banka Havalesi Bilgileri
              </h3>
              <div>
                <label className="label">Banka Adı</label>
                <input className="input" value={config.bank_name ?? ''} onChange={(e) => setCfg('bank_name', e.target.value)} placeholder="Ziraat Bankası" />
              </div>
              <div>
                <label className="label">Hesap Sahibi</label>
                <input className="input" value={config.account_holder ?? ''} onChange={(e) => setCfg('account_holder', e.target.value)} placeholder="arabamabak A.Ş." />
              </div>
              <div>
                <label className="label">IBAN (TR ile, 26 hane)</label>
                <input className="input font-mono text-xs" value={config.iban ?? ''} onChange={(e) => setCfg('iban', e.target.value)} placeholder="TR00 0000 0000 0000 0000 0000 00" maxLength={32} />
              </div>
              <div>
                <label className="label">Şube Kodu</label>
                <input className="input" value={config.branch_code ?? ''} onChange={(e) => setCfg('branch_code', e.target.value)} placeholder="1234" />
              </div>
            </div>
          )}

          {method.type === 'wallet' && (
            <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
              <p>Cüzdan yöntemi için ek ayar gerekmez. Kullanıcının <code>profiles.wallet_balance</code> alanı kullanılır.</p>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2">
          <button onClick={onClose} className="btn-secondary">İptal</button>
          <button
            onClick={() => save.mutate()}
            disabled={save.isPending}
            className="btn-primary"
          >
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
