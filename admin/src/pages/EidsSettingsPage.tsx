import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Save, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';

type EidsSettings = {
  id: string;
  firma_kod: string;
  firma_email: string;
  basic_auth_username: string;
  basic_auth_password: string;
  api_url: string;
  get_kullanici_kodu_url: string | null;
  max_retry_count: number;
  retry_delay_seconds: number;
  retry_backoff_multiplier: number;
  max_queries_per_minute_per_user: number;
  max_queries_per_hour_per_ip: number;
  allowed_ips: string[];
  is_active: boolean;
  test_mode: boolean;
};

export default function EidsSettingsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Partial<EidsSettings>>({});
  const [ips, setIps] = useState('');
  const [saved, setSaved] = useState(false);

  const settingsQ = useQuery({
    queryKey: ['eids-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('eids_settings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as EidsSettings | null;
    },
  });

  useEffect(() => {
    if (settingsQ.data) {
      setForm(settingsQ.data);
      setIps((settingsQ.data.allowed_ips ?? []).join('\n'));
    }
  }, [settingsQ.data]);

  const saveM = useMutation({
    mutationFn: async (payload: Partial<EidsSettings>) => {
      const allowed_ips = ips.split('\n').map((s) => s.trim()).filter(Boolean);
      const { data: { user } } = await supabase.auth.getUser();
      const body = { ...payload, allowed_ips, updated_by: user?.id };
      if (settingsQ.data?.id) {
        const { error } = await supabase
          .from('eids_settings')
          .update(body)
          .eq('id', settingsQ.data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('eids_settings').insert(body);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['eids-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    saveM.mutate(form);
  }

  if (settingsQ.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yükleniyor…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-2xl font-bold text-slate-800">EİDS Yapılandırma</h1>
        <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700 font-semibold">
          Ticaret Bakanlığı
        </span>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Elektronik İlan Doğrulama Sistemi (EİDS) entegrasyonu için firma ayarları.
        Basic Auth bilgilerinizi <code className="bg-slate-100 px-1 rounded">eids@ticaret.gov.tr</code> adresinden alabilirsiniz.
      </p>

      {saveM.error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{(saveM.error as Error).message}</span>
        </div>
      )}

      {saved && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>Ayarlar kaydedildi.</span>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        {/* Firma Bilgileri */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">Firma Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Firma Kodu (Guid) *">
              <input
                type="text"
                required
                placeholder="00000000-0000-0000-0000-000000000000"
                className="input font-mono text-sm"
                value={form.firma_kod ?? ''}
                onChange={(e) => setForm({ ...form, firma_kod: e.target.value })}
              />
            </Field>
            <Field label="Firma E-posta *">
              <input
                type="email"
                required
                placeholder="bilgi@arabamabak.com"
                className="input"
                value={form.firma_email ?? ''}
                onChange={(e) => setForm({ ...form, firma_email: e.target.value })}
              />
            </Field>
          </div>
        </section>

        {/* API Ayarları */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">API Ayarları</h2>
          <div className="space-y-4">
            <Field label="EidsAracApi URL">
              <input
                type="url"
                className="input font-mono text-sm"
                value={form.api_url ?? 'https://ws.gtb.gov.tr:8443/EidsAracApi'}
                onChange={(e) => setForm({ ...form, api_url: e.target.value })}
              />
            </Field>
            <Field label="GetKullaniciKodu URL (e-Devlet popup dönüş adresi)">
              <input
                type="url"
                placeholder="https://edevlet.arabamabak.com/callback"
                className="input"
                value={form.get_kullanici_kodu_url ?? ''}
                onChange={(e) => setForm({ ...form, get_kullanici_kodu_url: e.target.value })}
              />
            </Field>
          </div>
        </section>

        {/* Basic Auth */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">Basic Auth</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Username *">
              <input
                type="text"
                required
                className="input"
                value={form.basic_auth_username ?? ''}
                onChange={(e) => setForm({ ...form, basic_auth_username: e.target.value })}
              />
            </Field>
            <Field label="Password *">
              <input
                type="password"
                required
                className="input"
                value={form.basic_auth_password ?? ''}
                onChange={(e) => setForm({ ...form, basic_auth_password: e.target.value })}
              />
            </Field>
          </div>
        </section>

        {/* Retry Ayarları */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">Retry (Yeniden Deneme) Ayarları</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Maks. Deneme Sayısı">
              <input
                type="number"
                min={1}
                max={10}
                className="input"
                value={form.max_retry_count ?? 5}
                onChange={(e) => setForm({ ...form, max_retry_count: Number(e.target.value) })}
              />
            </Field>
            <Field label="İlk Bekleme (sn)">
              <input
                type="number"
                min={10}
                className="input"
                value={form.retry_delay_seconds ?? 60}
                onChange={(e) => setForm({ ...form, retry_delay_seconds: Number(e.target.value) })}
              />
            </Field>
            <Field label="Çarpan (exponential backoff)">
              <input
                type="number"
                step="0.1"
                min={1}
                className="input"
                value={form.retry_backoff_multiplier ?? 3}
                onChange={(e) => setForm({ ...form, retry_backoff_multiplier: Number(e.target.value) })}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-500 mt-2 flex items-start gap-1">
            <Info className="h-3.5 w-3.5 mt-0.5" />
            Varsayılan: 1dk → 3dk → 9dk → 27dk → 81dk (toplam ~2 saat)
          </p>
        </section>

        {/* Rate Limiting */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">Rate Limiting</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Kullanıcı başına dakikada max sorgu">
              <input
                type="number"
                min={1}
                className="input"
                value={form.max_queries_per_minute_per_user ?? 3}
                onChange={(e) => setForm({ ...form, max_queries_per_minute_per_user: Number(e.target.value) })}
              />
            </Field>
            <Field label="IP başına saatte max sorgu">
              <input
                type="number"
                min={1}
                className="input"
                value={form.max_queries_per_hour_per_ip ?? 60}
                onChange={(e) => setForm({ ...form, max_queries_per_hour_per_ip: Number(e.target.value) })}
              />
            </Field>
          </div>
        </section>

        {/* IP Whitelist */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">İzin Verilen IP Adresleri</h2>
          <Field label="Her satıra bir IP adresi (Vercel IP'leri)">
            <textarea
              rows={4}
              className="input font-mono text-sm"
              placeholder="76.76.21.21&#10;76.76.21.22"
              value={ips}
              onChange={(e) => setIps(e.target.value)}
            />
          </Field>
        </section>

        {/* Durum */}
        <section className="card p-5">
          <h2 className="font-bold text-slate-700 mb-4">Çalışma Modu</h2>
          <div className="space-y-3">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.test_mode ?? false}
                onChange={(e) => setForm({ ...form, test_mode: e.target.checked })}
              />
              <div>
                <div className="font-medium text-slate-700">Test Modu</div>
                <div className="text-xs text-slate-500">
                  Gerçek Bakanlık API'si yerine sahte response döner. Sadece geliştirme için.
                </div>
              </div>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={form.is_active ?? false}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <div>
                <div className="font-medium text-slate-700">Aktif</div>
                <div className="text-xs text-slate-500">
                  Production'da bu aktif olmalı. Test modunda pasif bırakın.
                </div>
              </div>
            </label>
          </div>
        </section>

        <div className="flex items-center gap-3 sticky bottom-0 bg-white py-3 -mx-6 px-6 border-t">
          <button
            type="submit"
            disabled={saveM.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {saveM.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
          <span className="text-xs text-slate-500">
            Son güncelleme: {settingsQ.data ? new Date(settingsQ.data.id ? (settingsQ.data as any).updated_at : '').toLocaleString('tr-TR') : '—'}
          </span>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
