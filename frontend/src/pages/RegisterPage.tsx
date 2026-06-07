import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { useCities } from '../lib/useLocationData';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Eye,
  EyeOff,
  Gavel,
  Loader2,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User,
  UserPlus,
} from 'lucide-react';

const schema = z
  .object({
    full_name: z.string().min(2, 'Ad Soyad en az 2 karakter olmalı'),
    email: z.string().email('Geçerli bir e-posta girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    password_confirm: z.string().min(6, 'Şifre tekrar zorunlu'),
    phone: z.string().min(10, 'Geçerli bir telefon numarası girin').optional().or(z.literal('')),
    city: z.string().optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.password_confirm, {
    path: ['password_confirm'],
    message: 'Şifreler eşleşmiyor',
  });

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/giris';
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: '',
      email: '',
      password: '',
      password_confirm: '',
      phone: '',
      city: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    setSuccess(null);
    const { error: authErr } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: {
          full_name: values.full_name,
          phone: values.phone || null,
          city: values.city || null,
        },
      },
    });
    if (authErr) {
      setError('Kayıt oluşturulamadı: ' + authErr.message);
      return;
    }
    setSuccess(
      'Kayıt başarılı! E-posta adresinize gönderilen doğrulama linkine tıklayarak hesabınızı aktifleştirin. Yönlendiriliyorsunuz…',
    );
    setTimeout(() => navigate(next, { replace: true }), 2500);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* Form side */}
      <div className="flex flex-col justify-center px-5 py-10 sm:px-10 lg:px-16 bg-white">
        <div className="mx-auto w-full max-w-md space-y-6">
          <div>
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700">
              <Car className="h-4 w-4" /> Ana sayfa
            </Link>
            <h1 className="mt-4 text-3xl font-extrabold text-slate-900">Hesap Oluştur</h1>
            <p className="mt-1 text-sm text-slate-500">
              Hemen ücretsiz kayıt olun, ilan vermeye ve açık arttırmalara katılmaya başlayın.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Ad Soyad *</label>
              <div className="relative mt-1">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  autoComplete="name"
                  className="input pl-10"
                  placeholder="Adınız Soyadınız"
                  {...register('full_name')}
                />
              </div>
              {errors.full_name && (
                <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
              )}
            </div>

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">E-posta *</label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  autoComplete="email"
                  className="input pl-10"
                  placeholder="ornek@eposta.com"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Şifre *</label>
                <div className="relative mt-1">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="input pr-10"
                    placeholder="En az 6 karakter"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    aria-label={showPwd ? 'Şifreyi gizle' : 'Şifreyi göster'}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Şifre Tekrar *</label>
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={cn('input mt-1', errors.password_confirm && 'border-red-400')}
                  placeholder="Şifreyi tekrar girin"
                  {...register('password_confirm')}
                />
                {errors.password_confirm && (
                  <p className="mt-1 text-xs text-red-600">{errors.password_confirm.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Telefon</label>
                <div className="relative mt-1">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    autoComplete="tel"
                    className="input pl-10"
                    placeholder="05XX XXX XX XX"
                    {...register('phone')}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Şehir</label>
                <div className="relative mt-1">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select
                    className="input pl-10"
                    {...register('city')}
                  >
                    <option value="">Şehir seçin (opsiyonel)</option>
                    {useCities().data?.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.plate_code.toString().padStart(2, '0')} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="inline h-4 w-4 mr-1" /> {success}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={isSubmitting || !!success}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Kayıt oluşturuluyor…
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" /> Kayıt Ol
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              Hesabın var mı?{' '}
              <Link
                to="/giris"
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Giriş yap
              </Link>
            </p>

            <p className="text-center text-[11px] text-slate-400">
              Kayıt olarak <span className="underline">Kullanıcı Sözleşmesi</span> ve{' '}
              <span className="underline">Gizlilik Politikası</span>'nı kabul etmiş sayılırsınız.
            </p>
          </form>
        </div>
      </div>

      {/* Hero side */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-brand-600 p-12 text-white">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-96 w-96 rounded-full bg-brand-300/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" /> Aramıza katılın
          </div>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight">
            Ücretsiz üye ol, <span className="text-amber-100">avantajları</span> keşfet.
          </h2>
          <p className="mt-3 text-white/90 max-w-md">
            Hesabınızla birlikte açık arttırmalara katılabilir, kendi ilanlarınızı yayınlayabilir,
            favorilerinize ekleyebilir ve mesajlaşabilirsiniz.
          </p>
        </div>

        <div className="relative space-y-4">
          <Feature
            icon={<Gavel className="h-5 w-5" />}
            title="Açık Arttırmalara Katıl"
            desc="Canlı teklif ver, en iyi fiyatı yakala"
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Güvenli Profil"
            desc="Telefon ve şehir bilgisiyle güven inşa et"
          />
          <Feature
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Ücretsiz İlan Ver"
            desc="Komisyon ödemeden ilan yayınla"
          />
          <Feature
            icon={<Star className="h-5 w-5" />}
            title="Favorilere Ekle"
            desc="Beğendiğin araçları kaybetme"
          />
        </div>

        <div className="relative text-xs text-white/70">
          © {new Date().getFullYear()} arabamabak
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-white/85">{desc}</div>
      </div>
    </div>
  );
}
