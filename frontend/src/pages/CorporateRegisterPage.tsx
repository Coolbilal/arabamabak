import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import {
  AlertCircle, ArrowLeft, Building2, CheckCircle2, Eye, EyeOff,
  FileSignature, Loader2, Mail, MapPin, Phone, ShieldCheck, User,
} from 'lucide-react';

const schema = z.object({
  first_name: z.string().min(2, 'Ad en az 2 karakter olmalı').max(100),
  last_name: z.string().min(2, 'Soyad en az 2 karakter olmalı').max(100),
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(8, 'Şifre en az 8 karakter olmalı'),
  password_confirm: z.string().min(8, 'Şifre tekrar zorunlu'),
  phone: z.string().min(10, 'Geçerli bir telefon numarası girin'),
  city_id: z.string().uuid('İl seçin'),
  district_id: z.string().uuid('İlçe seçin'),
  neighborhood: z.string().min(1, 'Mahalle zorunlu').max(120),
  business_type: z.enum(['individual_company', 'limited_company']),
  tax_office_city_id: z.string().uuid('Vergi dairesi ili seçin'),
  tax_office_district_id: z.string().uuid('Vergi dairesi ilçesi seçin'),
  tax_office_name: z.string().min(2, 'Vergi dairesi adı zorunlu').max(200),
  tax_id_number: z.string()
    .transform((s) => s.replace(/\s/g, ''))
    .refine((s) => /^\d{10,11}$/.test(s), 'Vergi kimlik no 10-11 hane olmalı'),
  tc_id_number: z.string()
    .transform((s) => s.replace(/\s/g, ''))
    .refine((s) => /^\d{11}$/.test(s), 'TC kimlik no 11 hane olmalı'),
  contract_accepted: z.literal(true, {
    errorMap: () => ({ message: 'Kurumsal hesap sözleşmesini onaylamalısınız' }),
  }),
}).refine((d) => d.password === d.password_confirm, {
  path: ['password_confirm'],
  message: 'Şifreler eşleşmiyor',
});

type FormValues = z.infer<typeof schema>;

interface City { id: string; name: string; plate_code: number; }
interface District { id: string; city_id: string; name: string; }

export default function CorporateRegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '', last_name: '', email: '', password: '', password_confirm: '',
      phone: '', city_id: '', district_id: '', neighborhood: '',
      business_type: 'limited_company',
      tax_office_city_id: '', tax_office_district_id: '', tax_office_name: '',
      tax_id_number: '', tc_id_number: '',
    },
  });

  // Şehirleri yükle
  useEffect(() => {
    supabase
      .from('cities')
      .select('id, name, plate_code')
      .eq('is_active', true)
      .order('plate_code', { ascending: true })
      .then(({ data, error }) => {
        if (error) { setError('Şehirler yüklenemedi: ' + error.message); return; }
        setCities((data || []) as City[]);
        setLoadingCities(false);
      });
  }, []);

  // İl seçilince ilçeleri yükle
  const cityId = watch('city_id');
  const taxOfficeCityId = watch('tax_office_city_id');

  useEffect(() => {
    if (!cityId) { setValue('district_id', ''); return; }
    setLoadingDistricts(true);
    supabase
      .from('districts')
      .select('id, city_id, name')
      .eq('city_id', cityId)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setDistricts((data || []) as District[]);
        setLoadingDistricts(false);
      });
  }, [cityId, setValue]);

  // Vergi dairesi ili değişirse ilçeleri tekrar yükle (cityId ile aynı listeyi kullanır)
  // Tax office districts ayrı liste kullanmıyor, aynı districts tablosundan

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);

    const payload = {
      first_name: values.first_name.trim(),
      last_name: values.last_name.trim(),
      email: values.email.trim().toLowerCase(),
      phone: values.phone.trim(),
      password_temp: values.password,
      city_id: values.city_id,
      district_id: values.district_id,
      neighborhood: values.neighborhood.trim(),
      business_type: values.business_type,
      tax_office_city_id: values.tax_office_city_id,
      tax_office_district_id: values.tax_office_district_id,
      tax_office_name: values.tax_office_name.trim(),
      tax_id_number: values.tax_id_number.replace(/\s/g, ''),
      tc_id_number: values.tc_id_number.replace(/\s/g, ''),
      contract_accepted_at: new Date().toISOString(),
    };

    const { error: insErr } = await supabase
      .from('corporate_applications')
      .insert(payload);

    if (insErr) {
      if (insErr.code === '23505') {
        setError('Bu e-posta ile bekleyen bir kurumsal başvuru zaten var.');
      } else {
        setError('Başvuru gönderilemedi: ' + insErr.message);
      }
      return;
    }

    setSuccess(
      'Kurumsal başvurunuz başarıyla alındı! Admin ekibimiz en kısa sürede başvurunuzu inceleyecek ve ' +
      'onay sonrası giriş bilgileriniz aktif olacaktır. Onay durumunu bu e-posta ile takip edebilirsiniz.'
    );
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 py-10">
      <div className="mx-auto max-w-3xl px-4">
        <Link to="/kayit" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Bireysel kayıt sayfasına dön
        </Link>

        <div className="mt-4 card overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Kurumsal Hesap Aç</h1>
                <p className="text-sm text-slate-300 mt-1">
                  Bayi, galerici veya kurumsal araç satıcıları için profesyonel hesap.
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <Pill icon={<ShieldCheck className="h-3.5 w-3.5" />}>Yönetici onayı sonrası aktif</Pill>
              <Pill icon={<Building2 className="h-3.5 w-3.5" />}>Bayi paneli + ilan verme</Pill>
              <Pill icon={<FileSignature className="h-3.5 w-3.5" />}>Vergi bilgisiyle doğrulama</Pill>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6" noValidate>
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                <CheckCircle2 className="inline h-4 w-4 mr-1" /> {success}
              </div>
            )}

            <Section title="Yetkili Kişi Bilgileri">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Adınız *" error={errors.first_name?.message}>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input type="text" className="input pl-10" placeholder="Adınız" {...register('first_name')} />
                  </div>
                </Field>
                <Field label="Soyadınız *" error={errors.last_name?.message}>
                  <input type="text" className="input" placeholder="Soyadınız" {...register('last_name')} />
                </Field>
              </div>
              <Field label="E-posta Adresiniz *" error={errors.email?.message}>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="email" autoComplete="email" className="input pl-10" placeholder="ornek@firma.com" {...register('email')} />
                </div>
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Şifre *" error={errors.password?.message} hint="En az 8 karakter, giriş için kullanacaksınız">
                  <div className="relative">
                    <input type={showPwd ? 'text' : 'password'} autoComplete="new-password" className="input pr-10" placeholder="En az 8 karakter" {...register('password')} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                      {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>
                <Field label="Şifre Tekrar *" error={errors.password_confirm?.message}>
                  <input type={showPwd ? 'text' : 'password'} autoComplete="new-password" className="input" placeholder="Şifreyi tekrar girin" {...register('password_confirm')} />
                </Field>
              </div>
              <Field label="Sabit Telefon *" error={errors.phone?.message}>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input type="tel" autoComplete="tel" className="input pl-10" placeholder="0XXX XXX XX XX" {...register('phone')} />
                </div>
              </Field>
            </Section>

            <Section title="İşletme Adresi">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="İl *" error={errors.city_id?.message}>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select className="input pl-10" disabled={loadingCities} {...register('city_id')}>
                      <option value="">İl seçin</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>
                          {String(c.plate_code).padStart(2, '0')} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="İlçe *" error={errors.district_id?.message}>
                  <select className="input" disabled={!cityId || loadingDistricts} {...register('district_id')}>
                    <option value="">{!cityId ? 'Önce il seçin' : loadingDistricts ? 'Yükleniyor…' : 'İlçe seçin'}</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Mahalle / Köy *" error={errors.neighborhood?.message}>
                <input type="text" className="input" placeholder="Mahalle / köy adı" {...register('neighborhood')} />
              </Field>
            </Section>

            <Section title="İşletme Türü">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={cnRadio(watch('business_type') === 'limited_company')}>
                  <input type="radio" value="limited_company" {...register('business_type')} className="sr-only" />
                  <div className="font-semibold">Limited Şirketi</div>
                  <div className="text-xs text-slate-500 mt-0.5">Anonim veya limited şirket</div>
                </label>
                <label className={cnRadio(watch('business_type') === 'individual_company')}>
                  <input type="radio" value="individual_company" {...register('business_type')} className="sr-only" />
                  <div className="font-semibold">Şahıs Şirketi</div>
                  <div className="text-xs text-slate-500 mt-0.5">Şahıs firması</div>
                </label>
              </div>
            </Section>

            <Section title="Vergi Bilgileri">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Vergi Dairesi İli *" error={errors.tax_office_city_id?.message}>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <select className="input pl-10" disabled={loadingCities} {...register('tax_office_city_id')}>
                      <option value="">Vergi dairesi ili seçin</option>
                      {cities.map(c => (
                        <option key={c.id} value={c.id}>
                          {String(c.plate_code).padStart(2, '0')} - {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="Vergi Dairesi İlçesi *" error={errors.tax_office_district_id?.message}>
                  <select className="input" disabled={!taxOfficeCityId || loadingDistricts} {...register('tax_office_district_id')}>
                    <option value="">{!taxOfficeCityId ? 'Önce ili seçin' : loadingDistricts ? 'Yükleniyor…' : 'İlçe seçin'}</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Vergi Dairesi Adı *" error={errors.tax_office_name?.message}>
                <input type="text" className="input" placeholder="Örn. Beşiktaş Vergi Dairesi" {...register('tax_office_name')} />
              </Field>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Vergi Kimlik No *" error={errors.tax_id_number?.message} hint="10 veya 11 hane">
                  <input type="text" inputMode="numeric" className="input" placeholder="1234567890" {...register('tax_id_number')} />
                </Field>
                <Field label="TC Kimlik No *" error={errors.tc_id_number?.message} hint="Yetkili kişi TC">
                  <input type="text" inputMode="numeric" className="input" placeholder="12345678901" {...register('tc_id_number')} />
                </Field>
              </div>
            </Section>

            <Section title="Kurumsal Hesap Sözleşmesi">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 max-h-32 overflow-y-auto leading-relaxed">
                <p><strong>Madde 1:</strong> İş bu sözleşme, kurumsal üye ile arabamabak arasındaki ticari ilişkiyi düzenler.</p>
                <p><strong>Madde 2:</strong> Kurumsal üye, verdiği tüm bilgilerin (vergi no, TC, adres) doğruluğunu taahhüt eder.</p>
                <p><strong>Madde 3:</strong> Yönetim, başvuruyu 1-3 iş günü içinde inceler. Onay/ret gerekçesi bildirilir.</p>
                <p><strong>Madde 4:</strong> Onay sonrası üye, bayi olarak ilan verebilir, açık arttırmalara katılabilir (kendi ilanlarına katılamaz).</p>
                <p><strong>Madde 5:</strong> Kurumsal üye, KVKK kapsamında kişisel verilerin işlenmesine onay verir.</p>
                <p><strong>Madde 6:</strong> Üyelik iptali, yazılı talep ile yapılır. Kalan bakiye iade edilir.</p>
                <p><strong>Madde 7:</strong> Platform, kötüye kullanımı tespit ettiğinde üyeliği askıya alabilir.</p>
              </div>
              <label className="mt-3 flex items-start gap-3 cursor-pointer">
                <input type="checkbox" {...register('contract_accepted')} className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                <span className="text-sm text-slate-700">
                  <strong>Kurumsal Kullanıcı Hesap Sözleşmesi</strong>'ni okudum, anladım ve kabul ediyorum.
                </span>
              </label>
              {errors.contract_accepted?.message && (
                <p className="mt-1 text-xs text-red-600">{errors.contract_accepted.message}</p>
              )}
            </Section>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
              <button
                type="submit"
                className="btn-primary justify-center flex-1"
                disabled={isSubmitting || !!success}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Gönderiliyor…</>
                ) : (
                  <><FileSignature className="h-4 w-4" /> Başvuruyu Gönder</>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn-ghost justify-center"
              >
                İptal
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 border-b border-slate-200 pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase text-slate-500">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function Pill({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 font-medium">
      {icon}{children}
    </div>
  );
}

function cnRadio(active: boolean): string {
  const base = 'rounded-xl border-2 p-4 cursor-pointer transition-all';
  return active
    ? `${base} border-brand-600 bg-brand-50 text-brand-900`
    : `${base} border-slate-200 bg-white hover:border-slate-300 text-slate-700`;
}
