import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck, ExternalLink, FileText, Loader, MapPin, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatDateOnly, formatPrice } from '../lib/utils';
import { useCities } from '../lib/useLocationData';
import type { ExpertiseRequest, ExpertiseStatus, SiteSettings, VehicleBrand, VehicleModel } from '../lib/types';

const EXPERTISE_STATUS_LABELS: Record<ExpertiseStatus, string> = {
  pending: 'Beklemede',
  assigned: 'Atandı',
  in_progress: 'Devam Ediyor',
  completed: 'Tamamlandı',
  cancelled: 'İptal',
};

const STATUS_STYLES: Record<ExpertiseStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  assigned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-700',
};

const schema = z.object({
  brand_id: z.string().uuid('Geçerli bir marka seçin'),
  model_id: z.string().optional().or(z.literal('')),
  year: z.number().int().min(1950).max(new Date().getFullYear() + 1),
  km: z.number().int().min(0).max(5_000_000),
  plate: z.string().min(2, 'Plaka girin').max(20),
  city: z.string().min(2, 'Şehir seçin'),
  address: z.string().min(5, 'Adres girin').max(300),
});

type FormValues = z.infer<typeof schema>;

export default function ExpertisePage() {
  const { user, profile, refreshProfile } = useAuth();
  if (!user) return <Navigate to="/giris" replace />;

  const qc = useQueryClient();
  const cities = useCities();

  const settingsQuery = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as SiteSettings | null;
    },
  });

  const brandsQuery = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as VehicleBrand[];
    },
  });

  const modelsQuery = useQuery({
    queryKey: ['vehicle-models'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as unknown as VehicleModel[];
    },
  });

  const requestsQuery = useQuery({
    queryKey: ['expertise-requests', user.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expertise_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExpertiseRequest[];
    },
  });

  const {
    register, handleSubmit, watch, reset, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      brand_id: '',
      model_id: '',
      year: new Date().getFullYear() - 5,
      km: 0,
      plate: '',
      city: '',
      address: '',
    },
  });

  const brandId = watch('brand_id');

  const brands = brandsQuery.data ?? [];
  const allModels = modelsQuery.data ?? [];
  const filteredModels = brandId ? allModels.filter((m) => m.brand_id === brandId) : [];

  // Marka değiştiğinde modeli sıfırla
  useEffect(() => {
    reset({ ...watch(), model_id: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandId]);

  const submit = useMutation({
    mutationFn: async (vals: FormValues) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      const settings = settingsQuery.data;
      const fee = settings?.expertise_fee ?? 0;

      // 1) Bakiye kontrolü (fee > 0 ise)
      if (fee > 0) {
        const balance = profile?.wallet_balance ?? 0;
        if (balance < fee) throw new Error('Yetersiz bakiye. Lütfen cüzdanınızı yükleyin.');
        // Ödeme transaction'ı
        const { error: payErr } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            type: 'expertise_payment',
            amount: fee,
            status: 'completed',
            payment_method: 'wallet',
            description: 'Ekspertiz talebi ücreti',
            completed_at: new Date().toISOString(),
          });
        if (payErr) throw payErr;
        // Bakiyeyi düş
        const { error: balErr } = await supabase
          .from('profiles')
          .update({ wallet_balance: balance - fee })
          .eq('id', user.id);
        if (balErr) throw balErr;
      }

      // 2) Talep oluştur
      const { error: reqErr } = await supabase
        .from('expertise_requests')
        .insert({
          user_id: user.id,
          brand_id: vals.brand_id,
          model_id: vals.model_id || null,
          year: vals.year,
          km: vals.km,
          plate: vals.plate.toUpperCase(),
          city: vals.city,
          address: vals.address,
          status: 'pending',
          fee,
        });
      if (reqErr) throw reqErr;
    },
    onSuccess: async () => {
      await refreshProfile();
      qc.invalidateQueries({ queryKey: ['expertise-requests', user.id] });
      qc.invalidateQueries({ queryKey: ['wallet-tx', user.id] });
      reset({
        brand_id: '', model_id: '', year: new Date().getFullYear() - 5,
        km: 0, plate: '', city: '', address: '',
      });
      alert('Ekspertiz talebiniz oluşturuldu. Uzman ekibimiz en kısa sürede sizinle iletişime geçecek.');
    },
    onError: (err: Error) => alert(err.message || 'Talep oluşturulamadı'),
  });

  const requests = requestsQuery.data ?? [];
  const fee = settingsQuery.data?.expertise_fee ?? 0;
  const brandMap: Record<string, string> = Object.fromEntries(brands.map((b) => [b.id, b.name]));
  const modelMap: Record<string, string> = Object.fromEntries(allModels.map((m) => [m.id, m.name]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <ClipboardCheck className="h-7 w-7 text-brand-600" />
        <h1 className="text-2xl font-extrabold text-slate-900">Ekspertiz Hizmeti</h1>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <form
            onSubmit={handleSubmit((v) => submit.mutate(v))}
            className="card space-y-4 p-6"
          >
            <div>
              <h2 className="text-sm font-bold text-slate-900">Yeni Ekspertiz Talebi</h2>
              <p className="mt-1 text-xs text-slate-500">
                Aracınız için uzman ekspertiz raporu talep edin. Ücret: <b>{formatPrice(fee)}</b>
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Marka *</label>
                <select
                  className={cn('input', errors.brand_id && 'border-red-400')}
                  {...register('brand_id')}
                >
                  <option value="">Seçiniz</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
                {errors.brand_id && <p className="mt-1 text-xs text-red-600">{errors.brand_id.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Model</label>
                <select
                  className="input disabled:bg-slate-50"
                  disabled={!brandId}
                  {...register('model_id')}
                >
                  <option value="">{brandId ? 'Tümü' : 'Önce marka seçin'}</option>
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Yıl *</label>
                <input
                  type="number"
                  className={cn('input', errors.year && 'border-red-400')}
                  {...register('year', { valueAsNumber: true })}
                />
                {errors.year && <p className="mt-1 text-xs text-red-600">{errors.year.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">KM *</label>
                <input
                  type="number"
                  className={cn('input', errors.km && 'border-red-400')}
                  {...register('km', { valueAsNumber: true })}
                />
                {errors.km && <p className="mt-1 text-xs text-red-600">{errors.km.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Plaka *</label>
                <input
                  className={cn('input font-mono uppercase', errors.plate && 'border-red-400')}
                  placeholder="34 ABC 1234"
                  {...register('plate')}
                />
                {errors.plate && <p className="mt-1 text-xs text-red-600">{errors.plate.message}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Şehir *</label>
                <select
                  className={cn('input', errors.city && 'border-red-400')}
                  {...register('city')}
                >
                  <option value="">Seçiniz</option>
                  {cities.data?.map((c) => (
                    <option key={c.id} value={c.name}>{c.plate_code.toString().padStart(2, '0')} - {c.name}</option>
                  ))}
                </select>
                {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city.message}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">Adres *</label>
                <textarea
                  className={cn('input min-h-[80px] resize-y', errors.address && 'border-red-400')}
                  placeholder="Ekspertiz yapılacak adres..."
                  {...register('address')}
                />
                {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address.message}</p>}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div className="text-xs text-slate-500">
                Bakiye: <b className="text-slate-800">{formatPrice(profile?.wallet_balance ?? 0)}</b>
              </div>
              <button type="submit" disabled={submit.isPending} className="btn-primary">
                {submit.isPending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Talep Oluştur
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-bold text-slate-900">Ekspertiz Nedir?</h3>
            <ul className="mt-3 space-y-2 text-xs text-slate-600">
              <li className="flex gap-2"><span>•</span> 200+ noktada detaylı kontrol</li>
              <li className="flex gap-2"><span>•</span> Motor, şanzıman, kaporta analizi</li>
              <li className="flex gap-2"><span>•</span> Hasar geçmişi sorgusu</li>
              <li className="flex gap-2"><span>•</span> Resmi rapor ve değerleme</li>
            </ul>
          </div>
          <div className="card p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-brand-600" /> Süreç
            </h3>
            <ol className="mt-3 space-y-2 text-xs text-slate-600">
              <li><b>1.</b> Talep oluştur</li>
              <li><b>2.</b> Uzman atanır</li>
              <li><b>3.</b> Adres & tarih planlanır</li>
              <li><b>4.</b> Yerinde ekspertiz</li>
              <li><b>5.</b> Rapor yüklenir</li>
            </ol>
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-lg font-bold text-slate-900">Taleplerim</h2>
        <div className="card overflow-hidden">
          {requestsQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-slate-500">
              <Loader className="h-5 w-5 animate-spin" /> Yükleniyor...
            </div>
          ) : requests.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-slate-500">
              <FileText className="h-10 w-10 text-slate-300" />
              <p>Henüz ekspertiz talebiniz yok.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Tarih</th>
                    <th className="px-4 py-3 text-left">Araç</th>
                    <th className="px-4 py-3 text-left">Şehir</th>
                    <th className="px-4 py-3 text-left">Durum</th>
                    <th className="px-4 py-3 text-right">Rapor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {requests.map((r) => {
                    const vehicleLabel =
                      (r.brand_id ? brandMap[r.brand_id] : '') +
                      (r.model_id ? ' ' + (modelMap[r.model_id] ?? '') : '') +
                      (r.year ? ` (${r.year})` : '') +
                      (r.plate ? ` • ${r.plate}` : '');
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                          {formatDateOnly(r.created_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-800">
                          <div className="font-medium">{vehicleLabel || '—'}</div>
                          {r.scheduled_date && (
                            <div className="text-xs text-slate-500">
                              Randevu: {formatDateOnly(r.scheduled_date)}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700">{r.city}</td>
                        <td className="px-4 py-3">
                          <span className={cn('badge', STATUS_STYLES[r.status])}>
                            {EXPERTISE_STATUS_LABELS[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {r.report_url ? (
                            <a
                              href={r.report_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-600 transition hover:bg-brand-50"
                            >
                              <ExternalLink className="h-3.5 w-3.5" /> Raporu Görüntüle
                            </a>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
