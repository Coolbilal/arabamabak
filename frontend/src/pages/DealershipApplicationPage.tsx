import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Building2, ChevronRight, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const dealershipSchema = z.object({
  companyName: z.string().min(2, 'Şirket adı en az 2 karakter'),
  taxIdNumber: z.string().regex(/^\d{10,11}$/, 'Vergi no 10-11 haneli sayı olmalı'),
  taxOfficeName: z.string().min(2, 'Vergi dairesi adı giriniz'),
  contactPerson: z.string().min(2, 'Yetkili kişi adı'),
  email: z.string().email('Geçerli e-posta adresi'),
  phone: z.string().regex(/^5\d{9}$/, 'Telefon 5XXXXXXXXX formatında'),
  address: z.string().min(10, 'Tam adres giriniz'),
  cityId: z.string().min(1, 'İl seçiniz'),
  districtId: z.string().min(1, 'İlçe seçiniz'),
  serviceAreas: z.array(z.string()).min(1, 'En az bir hizmet alanı seçiniz'),
  description: z.string().max(1000).optional(),
  contractAccepted: z.literal(true, { message: 'Sözleşmeyi kabul ediniz' }),
});

type DealershipFormData = z.infer<typeof dealershipSchema>;

const SERVICE_AREA_OPTIONS = [
  'Kaporta/Boya Kontrolü', 'Motor/Mekanik', 'Fren Sistemi', 'Lastik/Jant',
  'Elektrik/Elektronik', 'İç Trim', 'Yol Testi', 'Alt Takım',
  'Şanzıman', 'Klima', 'Egzoz', 'Süspansiyon',
];

export default function DealershipApplicationPage() {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<DealershipFormData>({
    resolver: zodResolver(dealershipSchema),
    defaultValues: {
      serviceAreas: [],
      contractAccepted: false as unknown as true,
    },
  });
  const selectedCity = watch('cityId');

  useEffect(() => {
    supabase.from('cities').select('id, name').order('name').then(({ data }) => {
      setCities(data || []);
      setLoadingCities(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedCity) { setDistricts([]); return; }
    supabase.from('districts').select('id, name').eq('city_id', selectedCity).order('name').then(({ data }) => {
      setDistricts(data || []);
    });
  }, [selectedCity]);

  async function onSubmit(data: DealershipFormData) {
    setSubmitting(true);
    setError(null);
    try {
      const tempPassword = 'Franchise' + Math.random().toString(36).slice(2, 8).toUpperCase() + '!';
      const { error: insErr } = await supabase.from('expertise_dealership_applications').insert({
        company_name: data.companyName,
        tax_id_number: data.taxIdNumber,
        tax_office_name: data.taxOfficeName,
        contact_person: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        city_id: data.cityId,
        district_id: data.districtId,
        service_areas: data.serviceAreas,
        description: data.description || null,
        contract_accepted_at: new Date().toISOString(),
        password_temp: tempPassword,
        status: 'pending',
      });
      if (insErr) throw insErr;
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Başvuru gönderilemedi');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-4">Başvurunuz Alındı! 🎉</h1>
          <p className="text-slate-600 mt-2">
            Ekspertiz bayisi başvurunuz başarıyla iletildi. Belgeleriniz ve şirket bilgileriniz
            yöneticilerimiz tarafından incelenecek, onay sonrası sizinle iletişime geçilecektir.
          </p>
          <Link to="/" className="mt-6 btn-primary w-full justify-center">Ana Sayfaya Dön</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-slate-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="h-4 w-4" /> Ana sayfa
        </Link>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-6 text-white">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Building2 className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Ekspertiz Bayisi Başvurusu</h1>
                <p className="text-brand-100 text-sm">Aracınızı profesyonel ekspertize emanet edin</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
              </div>
            )}

            <Section title="Şirket Bilgileri">
              <Field label="Şirket Adı" error={errors.companyName?.message} full>
                <input {...register('companyName')} className="input" placeholder="Örn: ABC Oto Ekspertiz Ltd. Şti." />
              </Field>
              <Field label="Vergi No" error={errors.taxIdNumber?.message}>
                <input {...register('taxIdNumber')} className="input font-mono" maxLength={11} placeholder="10-11 haneli" />
              </Field>
              <Field label="Vergi Dairesi" error={errors.taxOfficeName?.message}>
                <input {...register('taxOfficeName')} className="input" placeholder="Örn: Beşiktaş VD" />
              </Field>
              <Field label="Yetkili Kişi" error={errors.contactPerson?.message}>
                <input {...register('contactPerson')} className="input" placeholder="Ad Soyad" />
              </Field>
              <Field label="E-posta" error={errors.email?.message}>
                <input {...register('email')} type="email" className="input" placeholder="info@sirket.com" />
              </Field>
              <Field label="Telefon" error={errors.phone?.message}>
                <input {...register('phone')} className="input font-mono" maxLength={10} placeholder="5XXXXXXXXX" />
              </Field>
            </Section>

            <Section title="Adres">
              <Field label="Açık Adres" error={errors.address?.message} full>
                <textarea {...register('address')} className="input min-h-[80px]" placeholder="Mahalle, sokak, no, daire" />
              </Field>
              <Field label="İl" error={errors.cityId?.message}>
                <Controller
                  name="cityId"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="input" disabled={loadingCities}>
                      <option value="">{loadingCities ? 'Yükleniyor…' : 'İl seçiniz'}</option>
                      {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                />
              </Field>
              <Field label="İlçe" error={errors.districtId?.message}>
                <Controller
                  name="districtId"
                  control={control}
                  render={({ field }) => (
                    <select {...field} className="input" disabled={!selectedCity}>
                      <option value="">{!selectedCity ? 'Önce il seçin' : 'İlçe seçiniz'}</option>
                      {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                />
              </Field>
            </Section>

            <Section title="Hizmet Alanlarınız">
              <Field label="Hangi ekspertiz kontrollerini yapıyorsunuz?" error={errors.serviceAreas?.message} full>
                <Controller
                  name="serviceAreas"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {SERVICE_AREA_OPTIONS.map(opt => {
                        const checked = (field.value || []).includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-sm transition ${
                              checked
                                ? 'border-brand-500 bg-brand-50 text-brand-700'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                const newValue = e.target.checked
                                  ? [...(field.value || []), opt]
                                  : (field.value || []).filter(v => v !== opt);
                                field.onChange(newValue);
                              }}
                              className="h-4 w-4"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                />
              </Field>
            </Section>

            <Section title="Açıklama (Opsiyonel)">
              <Field label="Bayiniz hakkında kısa bilgi" error={errors.description?.message} full>
                <textarea {...register('description')} className="input min-h-[80px]" placeholder="Tecrübeniz, ekipmanınız, öne çıkan özellikleriniz..." />
              </Field>
            </Section>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-bold text-amber-900">📋 Sözleşme</p>
              <p className="text-amber-800 mt-1 text-xs leading-relaxed">
                Ekspertiz bayisi olarak onaylanmanız halinde profesyonel raporlar üreteceğinizi,
                araçlara objektif değerlendirme yapacağınızı, ekspertiz sonuçlarını 24 saat
                içinde sisteme yükleyeceğinizi kabul etmiş sayılırsınız. Yanlış bilgi/evrak
                verilmesi başvurunun iptaline yol açar.
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('contractAccepted')} className="mt-1 h-4 w-4 rounded" />
              <span className="text-sm text-slate-700">Yukarıdaki sözleşmeyi okudum, kabul ediyorum.</span>
            </label>
            {errors.contractAccepted && <p className="text-sm text-red-600">{errors.contractAccepted.message}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
              {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor…</> : <>Başvuruyu Gönder <ChevronRight className="h-4 w-4" /></>}
            </button>

            <p className="text-center text-sm text-slate-500">
              Zaten başvurdunuz mu?{' '}
              <Link to="/franchise/login" className="text-brand-600 hover:underline">Giriş yapın</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-sm font-bold text-slate-900 mb-3 pb-1 border-b border-slate-200">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </section>
  );
}

function Field({ label, error, children, full }: { label: string; error?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? 'sm:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-600 mb-1">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
