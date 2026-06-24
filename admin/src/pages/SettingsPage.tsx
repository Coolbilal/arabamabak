import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Settings, Save, Loader2, AlertCircle, CheckCircle2, Upload, Palette,
  Mail, Phone, Wallet, Image as ImageIcon, Code2, RefreshCw,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatPrice } from '../lib/utils';
import type { SiteSettings } from '../lib/types';

const settingsSchema = z.object({
  site_name: z.string().min(2, 'Site adı en az 2 karakter olmalıdır'),
  logo_url: z.string().optional().nullable(),
  logo_size: z.enum(['sm', 'md', 'lg', 'xl', 'xxl']).default('md'),
  favicon_url: z.string().optional().nullable(),
  primary_color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Geçerli bir hex renk kodu girin'),
  secondary_color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Geçerli bir hex renk kodu girin'),
  accent_color: z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Geçerli bir hex renk kodu girin'),
  header_html: z.string().optional().nullable(),
  footer_html: z.string().optional().nullable(),
  contact_email: z.string().email('Geçerli bir e-posta adresi girin').optional().or(z.literal('')),
  contact_phone: z.string().optional().or(z.literal('')),
  auction_listing_fee: z.coerce.number().min(0, 'Geçerli bir tutar girin'),
  premium_auction_fee: z.coerce.number().min(0, 'Geçerli bir tutar girin'),
  expertise_fee: z.coerce.number().min(0, 'Geçerli bir tutar girin'),
  auction_default_duration_minutes: z.coerce.number().min(1, 'En az 1 dakika').max(1440, 'En fazla 1440 dakika'),
  auction_countdown_refresh_ms: z.coerce.number().min(10).max(1000).default(50),
  max_bid_increase_percent: z.coerce.number().min(0.1, 'En az %0.1').max(100, 'En fazla %100').default(2),
});
type SettingsForm = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [actionMsg, setActionMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);

  const canEdit = hasPermission('site_settings', 'edit');

  // ---- Settings fetch ----
  const settingsQ = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as SiteSettings | null;
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema) as any,
    defaultValues: {
      site_name: 'arabamabak',
      logo_url: '',
      favicon_url: '',
      primary_color: '#dc2626',
      secondary_color: '#1f2937',
      accent_color: '#f59e0b',
      header_html: '',
      footer_html: '',
      contact_email: '',
      contact_phone: '',
      auction_listing_fee: 250,
      premium_auction_fee: 750,
      expertise_fee: 1500,
      auction_default_duration_minutes: 30,
      auction_countdown_refresh_ms: 50,
      max_bid_increase_percent: 2,
    },
  });

  useEffect(() => {
    if (settingsQ.data) {
      reset({
        site_name: settingsQ.data.site_name || 'arabamabak',
        logo_url: settingsQ.data.logo_url || '',
        logo_size: (settingsQ.data.logo_size as 'sm' | 'md' | 'lg' | 'xl' | 'xxl') || 'md',
        favicon_url: settingsQ.data.favicon_url || '',
        primary_color: settingsQ.data.primary_color || '#dc2626',
        secondary_color: settingsQ.data.secondary_color || '#1f2937',
        accent_color: settingsQ.data.accent_color || '#f59e0b',
        header_html: settingsQ.data.header_html || '',
        footer_html: settingsQ.data.footer_html || '',
        contact_email: settingsQ.data.contact_email || '',
        contact_phone: settingsQ.data.contact_phone || '',
        auction_listing_fee: Number(settingsQ.data.auction_listing_fee ?? 250),
        premium_auction_fee: Number(settingsQ.data.premium_auction_fee ?? 750),
        auction_default_duration_minutes: Number(settingsQ.data.auction_default_duration_minutes ?? 30),
        auction_countdown_refresh_ms: Number(settingsQ.data.auction_countdown_refresh_ms ?? 50),
        expertise_fee: Number(settingsQ.data.expertise_fee ?? 1500),
        max_bid_increase_percent: Number(settingsQ.data.max_bid_increase_percent ?? 2),
      });
    }
  }, [settingsQ.data, reset]);

  const primary = watch('primary_color');
  const secondary = watch('secondary_color');
  const accent = watch('accent_color');
  const siteName = watch('site_name');
  const logoUrl = watch('logo_url');
  const faviconUrl = watch('favicon_url');

  // ---- Update mutation ----
  const saveM = useMutation({
    mutationFn: async (values: SettingsForm) => {
      const payload = {
        site_name: values.site_name,
        logo_url: values.logo_url || null,
        logo_size: values.logo_size,
        favicon_url: values.favicon_url || null,
        primary_color: values.primary_color,
        secondary_color: values.secondary_color,
        accent_color: values.accent_color,
        header_html: values.header_html || null,
        footer_html: values.footer_html || null,
        contact_email: values.contact_email || null,
        contact_phone: values.contact_phone || null,
        auction_listing_fee: values.auction_listing_fee,
        premium_auction_fee: values.premium_auction_fee,
        expertise_fee: values.expertise_fee,
        auction_default_duration_minutes: values.auction_default_duration_minutes,
        auction_countdown_refresh_ms: values.auction_countdown_refresh_ms,
        max_bid_increase_percent: values.max_bid_increase_percent,
      };
      const { error } = await supabase
        .from('site_settings').update(payload).eq('id', 1);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['site-settings'] });
      setActionMsg({ kind: 'ok', text: 'Site ayarları kaydedildi.' });
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => {
      setActionMsg({ kind: 'err', text: e?.message || 'Kaydedilemedi.' });
    },
  });

  // ---- Asset upload ----
  const uploadAsset = useMutation({
    mutationFn: async ({ file, kind }: { file: File; kind: 'logo' | 'favicon' }) => {
      const ext = file.name.split('.').pop() || 'png';
      const path = `${kind}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('site-assets')
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('site-assets').getPublicUrl(path);
      const url = pub.publicUrl;
      const field: 'logo_url' | 'favicon_url' = kind === 'logo' ? 'logo_url' : 'favicon_url';
      const { error: dbErr } = await supabase
        .from('site_settings').update({ [field]: url }).eq('id', 1);
      if (dbErr) throw dbErr;
      return { url, field };
    },
    onSuccess: (res) => {
      setValue(res.field, res.url, { shouldDirty: true });
      qc.invalidateQueries({ queryKey: ['site-settings'] });
      setActionMsg({ kind: 'ok', text: 'Görsel yüklendi ve ayar güncellendi.' });
      setTimeout(() => setActionMsg(null), 3000);
    },
    onError: (e: any) => {
      setActionMsg({ kind: 'err', text: e?.message || 'Yükleme başarısız.' });
    },
  });

  function onSubmit(values: SettingsForm) {
    if (!canEdit) return;
    saveM.mutate(values);
  }

  if (!canEdit) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="h-10 w-10 text-amber-500 mx-auto" />
        <h2 className="mt-3 text-lg font-bold text-slate-800">Yetkiniz yok</h2>
        <p className="mt-1 text-sm text-slate-500">
          Site ayarlarını düzenlemek için <strong>site_settings</strong> alanında yetki gerekir.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-sky-600" /> Site Ayarları
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Genel görünüm, marka renkleri, iletişim bilgileri ve fiyatlandırma.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => settingsQ.refetch()}
            className="btn-secondary"
            disabled={settingsQ.isFetching}
          >
            <RefreshCw className={cn('h-4 w-4', settingsQ.isFetching && 'animate-spin')} /> Yenile
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className={cn(
          'flex items-center gap-2 rounded-lg p-3 text-sm',
          actionMsg.kind === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {actionMsg.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {actionMsg.text}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Genel */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Settings className="h-4 w-4 text-slate-500" /> Genel
          </h2>
          <div>
            <label className="label">Site Adı</label>
            <input className={cn('input', errors.site_name && 'border-red-400')} {...register('site_name')} />
            {errors.site_name && <p className="mt-1 text-xs text-red-600">{errors.site_name.message}</p>}
          </div>
        </div>

        {/* Marka görselleri */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-slate-500" /> Marka Görselleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Logo URL</label>
              <div className="flex gap-2">
                <input className="input flex-1" {...register('logo_url')} />
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadAsset.isPending}
                  className="btn-secondary shrink-0"
                >
                  <Upload className="h-4 w-4" /> Yükle
                </button>
                <input
                  ref={logoInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAsset.mutate({ file: f, kind: 'logo' });
                    e.target.value = '';
                  }}
                />
              </div>
              {logoUrl && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-center h-20">
                  <img src={logoUrl} alt="Logo" className="max-h-16 max-w-full object-contain" />
                </div>
              )}

              <div className="mt-3">
                <label className="label">Header Logo Boyutu</label>
                <div className="grid grid-cols-5 gap-2">
                  {([
                    { v: 'sm',  h: 'h-7',  label: 'Küçük',     px: 28 },
                    { v: 'md',  h: 'h-9',  label: 'Orta',      px: 36 },
                    { v: 'lg',  h: 'h-11', label: 'Büyük',     px: 44 },
                    { v: 'xl',  h: 'h-14', label: 'Çok Büyük', px: 56 },
                    { v: 'xxl', h: 'h-16', label: 'Maksimum',  px: 64 },
                  ] as const).map((opt) => {
                    const selected = watch('logo_size') === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setValue('logo_size', opt.v, { shouldDirty: true })}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 rounded-lg border-2 p-2 transition',
                          selected
                            ? 'border-brand-600 bg-brand-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        )}
                        title={`${opt.label} (${opt.px}px)`}
                      >
                        <div className={cn('w-12 rounded bg-slate-700', opt.h)} />
                        <span className={cn('text-[10px] font-semibold', selected ? 'text-brand-700' : 'text-slate-600')}>
                          {opt.label}
                        </span>
                        <span className="text-[9px] text-slate-400">{opt.px}px</span>
                      </button>
                    );
                  })}
                </div>
                <input type="hidden" {...register('logo_size')} />
                <p className="mt-2 text-xs text-slate-500">
                  Şeffaf PNG önerilir. Maksimum h-16 (64px) header alanına sığar, taşma yapmaz.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-md bg-slate-50 border border-slate-200 px-3 py-2">
                <span className="text-xs text-slate-500">Site adı (logo yüklüyse header'da gizlenir):</span>
                <span className="text-sm font-semibold text-slate-700">{settingsQ.data?.site_name || 'arabamabak'}</span>
              </div>
            </div>
            <div>
              <label className="label">Favicon URL</label>
              <div className="flex gap-2">
                <input className="input flex-1" {...register('favicon_url')} />
                <button
                  type="button"
                  onClick={() => faviconInputRef.current?.click()}
                  disabled={uploadAsset.isPending}
                  className="btn-secondary shrink-0"
                >
                  <Upload className="h-4 w-4" /> Yükle
                </button>
                <input
                  ref={faviconInputRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAsset.mutate({ file: f, kind: 'favicon' });
                    e.target.value = '';
                  }}
                />
              </div>
              {faviconUrl && (
                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-center justify-center h-20">
                  <img src={faviconUrl} alt="Favicon" className="h-10 w-10 object-contain" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Renkler */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Palette className="h-4 w-4 text-slate-500" /> Marka Renkleri
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Birincil Renk</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-10 w-12 rounded border border-slate-300 cursor-pointer" {...register('primary_color')} />
                <input className="input flex-1" {...register('primary_color')} />
              </div>
              {errors.primary_color && <p className="mt-1 text-xs text-red-600">{errors.primary_color.message}</p>}
            </div>
            <div>
              <label className="label">İkincil Renk</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-10 w-12 rounded border border-slate-300 cursor-pointer" {...register('secondary_color')} />
                <input className="input flex-1" {...register('secondary_color')} />
              </div>
              {errors.secondary_color && <p className="mt-1 text-xs text-red-600">{errors.secondary_color.message}</p>}
            </div>
            <div>
              <label className="label">Vurgu Rengi</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-10 w-12 rounded border border-slate-300 cursor-pointer" {...register('accent_color')} />
                <input className="input flex-1" {...register('accent_color')} />
              </div>
              {errors.accent_color && <p className="mt-1 text-xs text-red-600">{errors.accent_color.message}</p>}
            </div>
          </div>
          {/* Önizleme */}
          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <div
              className="px-4 py-3 text-white font-semibold flex items-center gap-2"
              style={{ background: primary }}
            >
              {logoUrl
                ? <img src={logoUrl} alt="" className="h-6 w-6 object-contain bg-white/20 rounded p-0.5" />
                : <span className="h-6 w-6 rounded bg-white/20 flex items-center justify-center text-xs">{siteName?.[0]?.toUpperCase()}</span>}
              <span>{siteName || 'arabamabak'}</span>
              <span className="ml-auto text-xs font-normal opacity-80">birincil renk önizleme</span>
            </div>
            <div className="px-4 py-3 text-white text-sm" style={{ background: secondary }}>
              İkincil renk şeridi — tipik olarak alt başlık veya footer.
            </div>
            <div className="px-4 py-3 flex items-center gap-2 text-sm">
              <span className="rounded px-2 py-0.5 text-white font-semibold" style={{ background: accent }}>
                Vurgu etiketi
              </span>
              <span className="text-slate-500">Vurgu rengi etiket / buton vurguları için.</span>
            </div>
          </div>
        </div>

        {/* HTML */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-slate-500" /> Header &amp; Footer HTML
          </h2>
          <div>
            <label className="label">Header HTML</label>
            <textarea
              rows={5}
              className="input min-h-[120px] font-mono text-xs"
              placeholder="<!-- Üst kısım HTML kodu -->"
              {...register('header_html')}
            />
          </div>
          <div>
            <label className="label">Footer HTML</label>
            <textarea
              rows={5}
              className="input min-h-[120px] font-mono text-xs"
              placeholder="<!-- Alt kısım HTML kodu -->"
              {...register('footer_html')}
            />
          </div>
        </div>

        {/* İletişim */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="h-4 w-4 text-slate-500" /> İletişim
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                <Mail className="inline h-3.5 w-3.5 mr-1" /> E-posta
              </label>
              <input type="email" className={cn('input', errors.contact_email && 'border-red-400')} {...register('contact_email')} />
              {errors.contact_email && <p className="mt-1 text-xs text-red-600">{errors.contact_email.message}</p>}
            </div>
            <div>
              <label className="label">
                <Phone className="inline h-3.5 w-3.5 mr-1" /> Telefon
              </label>
              <input className="input" {...register('contact_phone')} />
            </div>
          </div>
        </div>

        {/* Fiyatlandırma */}
        <div className="card p-5 space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-slate-500" /> Fiyatlandırma
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Açık Arttırma İlan Ücreti (₺)</label>
              <input
                type="number" step="0.01" min="0"
                className={cn('input', errors.auction_listing_fee && 'border-red-400')}
                {...register('auction_listing_fee')}
              />
              {errors.auction_listing_fee && <p className="mt-1 text-xs text-red-600">{errors.auction_listing_fee.message}</p>}
            </div>
            <div>
              <label className="label">Premium Açık Arttırma Ücreti (₺)</label>
              <input
                type="number" step="0.01" min="0"
                className={cn('input', errors.premium_auction_fee && 'border-red-400')}
                {...register('premium_auction_fee')}
              />
              {errors.premium_auction_fee && <p className="mt-1 text-xs text-red-600">{errors.premium_auction_fee.message}</p>}
            </div>
            <div>
              <label className="label">Ekspertiz Ücreti (₺)</label>
              <input
                type="number" step="0.01" min="0"
                className={cn('input', errors.expertise_fee && 'border-red-400')}
                {...register('expertise_fee')}
              />
              {errors.expertise_fee && <p className="mt-1 text-xs text-red-600">{errors.expertise_fee.message}</p>}
            </div>
            <div>
              <label className="label">Açık Arttırma Süresi (dakika)</label>
              <input
                type="number"
                min={1}
                max={1440}
                className={cn('input', errors.auction_default_duration_minutes && 'border-red-400')}
                {...register('auction_default_duration_minutes')}
              />
              {errors.auction_default_duration_minutes && <p className="mt-1 text-xs text-red-600">{errors.auction_default_duration_minutes.message}</p>}
              <p className="mt-1 text-xs text-slate-500">Slot saati geldiğinde mezatın süreceği dakika. Son teklif = satış fiyatı olur.</p>
            </div>
            <div>
              <label className="label">Min. Teklif Artış Yüzdesi (%)</label>
              <input
                type="number"
                step="0.1"
                min={0.1}
                max={100}
                className={cn('input', errors.max_bid_increase_percent && 'border-red-400')}
                {...register('max_bid_increase_percent')}
              />
              {errors.max_bid_increase_percent && <p className="mt-1 text-xs text-red-600">{errors.max_bid_increase_percent.message}</p>}
              <p className="mt-1 text-xs text-slate-500">Yeni teklif, son tekliften en az bu kadar yüzde fazla olmalı. Örn: %2 → son teklif 1000 TL ise min 1020 TL.</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Şu anki değerler:&nbsp;
            <span className="font-semibold text-slate-700">Açık Arttırma: {formatPrice(watch('auction_listing_fee'))}</span>,&nbsp;
            <span className="font-semibold text-slate-700">Premium: {formatPrice(watch('premium_auction_fee'))}</span>,&nbsp;
            <span className="font-semibold text-slate-700">Ekspertiz: {formatPrice(watch('expertise_fee'))}</span>,&nbsp;
            <span className="font-semibold text-slate-700">Mezat: {watch('auction_default_duration_minutes')} dk</span>,&nbsp;
            <span className="font-semibold text-slate-700">Min Artış: %{watch('max_bid_increase_percent')}</span>.
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 sticky bottom-0 bg-slate-100/80 backdrop-blur py-3">
          {isDirty && (
            <span className="text-xs text-amber-600">Kaydedilmemiş değişiklikler var</span>
          )}
          <button
            type="button"
            onClick={() => reset()}
            disabled={!isDirty || saveM.isPending}
            className="btn-secondary"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={!isDirty || saveM.isPending || isSubmitting}
            className="btn-primary"
          >
            {saveM.isPending || isSubmitting
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        </div>
      </form>
    </div>
  );
}
