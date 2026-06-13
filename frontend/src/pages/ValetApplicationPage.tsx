import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { Car, ChevronRight, CheckCircle2, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';

const valetSchema = z.object({
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı'),
  tcIdNumber: z.string().regex(/^\d{11}$/, 'TC kimlik no 11 haneli olmalı'),
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  phone: z.string().regex(/^5\d{9}$/, 'Telefon 5XXXXXXXXX formatında olmalı'),
  cityId: z.string().min(1, 'İl seçiniz'),
  districtId: z.string().min(1, 'İlçe seçiniz'),
  neighborhood: z.string().max(100).optional(),
  licenseNumber: z.string().min(5, 'Ehliyet no en az 5 karakter olmalı'),
  licenseClass: z.string().min(1, 'Ehliyet sınıfı seçiniz'),
  vehicleInfo: z.string().max(500).optional(),
  contractAccepted: z.literal(true, { message: 'Sözleşmeyi kabul etmelisiniz' }),
});

type ValetFormData = z.infer<typeof valetSchema>;

export default function ValetApplicationPage() {
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, control, watch, formState: { errors } } = useForm<ValetFormData>({
    resolver: zodResolver(valetSchema),
    defaultValues: { contractAccepted: false as unknown as true },
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

  async function onSubmit(data: ValetFormData) {
    setSubmitting(true);
    setError(null);
    try {
      // Basit random password üret
      const tempPassword = 'Valet' + Math.random().toString(36).slice(2, 8).toUpperCase() + '!';
      const { error: insErr } = await supabase.from('expert_valet_applications').insert({
        first_name: data.firstName,
        last_name: data.lastName,
        tc_id_number: data.tcIdNumber,
        email: data.email,
        phone: data.phone,
        city_id: data.cityId,
        district_id: data.districtId,
        neighborhood: data.neighborhood || null,
        license_number: data.licenseNumber,
        license_class: data.licenseClass,
        vehicle_info: data.vehicleInfo || null,
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
            Eksper vale başvurunuz başarıyla iletildi. Yönetici ekibimiz başvuruyu inceleyip sizinle iletişime geçecek.
          </p>
          <p className="text-sm text-slate-500 mt-4">
            Başvuru durumunuzu e-posta adresiniz üzerinden takip edebilirsiniz.
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
                <Car className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Eksper Vale Başvurusu</h1>
                <p className="text-brand-100 text-sm">Aracı ekspertiz noktasına taşıyın, hakediş kazanın</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-8 space-y-6">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
              </div>
            )}

            <Section title="Kişisel Bilgiler">
              <Field label="Ad" error={errors.firstName?.message}>
                <input {...register('firstName')} className="input" placeholder="Adınız" />
              </Field>
              <Field label="Soyad" error={errors.lastName?.message}>
                <input {...register('lastName')} className="input" placeholder="Soyadınız" />
              </Field>
              <Field label="TC Kimlik No" error={errors.tcIdNumber?.message}>
                <input {...register('tcIdNumber')} className="input font-mono" maxLength={11} placeholder="11111111111" />
              </Field>
              <Field label="Telefon" error={errors.phone?.message}>
                <input {...register('phone')} className="input font-mono" maxLength={10} placeholder="5XXXXXXXXX" />
              </Field>
              <Field label="E-posta" error={errors.email?.message}>
                <input {...register('email')} type="email" className="input" placeholder="ornek@email.com" />
              </Field>
            </Section>

            <Section title="Ehliyet Bilgileri">
              <Field label="Ehliyet Numarası" error={errors.licenseNumber?.message}>
                <input {...register('licenseNumber')} className="input font-mono" placeholder="Ehliyet numaranız" />
              </Field>
              <Field label="Ehliyet Sınıfı" error={errors.licenseClass?.message}>
                <select {...register('licenseClass')} className="input">
                  <option value="">Seçiniz</option>
                  <option value="B">B - Otomobil, Kamyonet</option>
                  <option value="C">C - Kamyon</option>
                  <option value="D">D - Otobüs</option>
                  <option value="E">E - Römorklu</option>
                  <option value="B+E">B+E - Römorklu Otomobil</option>
                  <option value="C+E">C+E - Römorklu Kamyon</option>
                </select>
              </Field>
            </Section>

            <Section title="Konum">
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
                    <select {...field} className="input" disabled={!selectedCity || districts.length === 0}>
                      <option value="">{!selectedCity ? 'Önce il seçin' : districts.length === 0 ? 'Yükleniyor…' : 'İlçe seçiniz'}</option>
                      {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  )}
                />
              </Field>
              <Field label="Mahalle (opsiyonel)" error={errors.neighborhood?.message} full>
                <input {...register('neighborhood')} className="input" placeholder="Mahalle / semt" />
              </Field>
            </Section>

            <Section title="Araç Bilgisi (Opsiyonel)">
              <Field label="Varsa kendi aracınız" error={errors.vehicleInfo?.message} full>
                <textarea {...register('vehicleInfo')} className="input min-h-[80px]" placeholder="Marka, model, plaka, yıl (taşıma için kullanılacak)" />
              </Field>
            </Section>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
              <p className="font-bold text-amber-900">📋 Sözleşme</p>
              <p className="text-amber-800 mt-1 text-xs leading-relaxed">
                Eksper Vale olarak görev aldığınızda aracı ekspertiz noktasına güvenli şekilde taşıyacağınızı,
                fotoğraf ve gözlem raporlarını eksiksiz yükleyeceğinizi, hakediş ödemelerinin ay sonu
                yapılacağını kabul etmiş sayılırsınız. Yanlış bilgi/evrak verilmesi başvurunun iptaline yol açar.
              </p>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" {...register('contractAccepted')} className="mt-1 h-4 w-4 rounded" />
              <span className="text-sm text-slate-700">Yukarıdaki sözleşmeyi okudum, kabul ediyorum.</span>
            </label>
            {errors.contractAccepted && <p className="text-sm text-red-600">{errors.contractAccepted.message}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full justify-center"
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor…</>
              ) : (
                <>Başvuruyu Gönder <ChevronRight className="h-4 w-4" /></>
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              Zaten başvurdunuz mu?{' '}
              <Link to="/vales/login" className="text-brand-600 hover:underline">Giriş yapın</Link>
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
