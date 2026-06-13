import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import {
  AlertCircle,
  Car,
  CheckCircle2,
  Eye,
  EyeOff,
  Gavel,
  Loader2,
  LogIn,
  Mail,
  ShieldCheck,
  Sparkles,
  Star,
} from 'lucide-react';

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  const [error, setError] = useState<string | null>(null);
  const [showPwd, setShowPwd] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);
    const { error: authErr } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });
    if (authErr) {
      setError('Giriş yapılamadı: ' + authErr.message);
      return;
    }
    navigate(next, { replace: true });
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
            <h1 className="mt-4 text-3xl font-extrabold text-slate-900">Tekrar Hoş Geldiniz</h1>
            <p className="mt-1 text-sm text-slate-500">
              Hesabınıza giriş yaparak açık arttırmalara katılabilir, ilanlarınızı yönetebilirsiniz.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">E-posta</label>
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

            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Şifre</label>
              <div className="relative mt-1">
                <input
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="input pr-10"
                  placeholder="••••••••"
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

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Giriş yapılıyor…
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" /> Giriş Yap
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-500">
              Hesabın yok mu?{' '}
              <Link
                to={`/kayit${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`}
                className="font-semibold text-brand-600 hover:text-brand-700"
              >
                Kayıt ol
              </Link>
            </p>
          </form>

        </div>
      </div>

      {/* Hero side */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-12 text-white">
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-10 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
            <Sparkles className="h-3.5 w-3.5" /> Türkiye'nin yeni nesil araç platformu
          </div>
          <h2 className="mt-4 text-4xl font-extrabold leading-tight">
            Hayalindeki aracı <span className="text-amber-300">açık arttırmayla</span> bul.
          </h2>
          <p className="mt-3 text-white/80 max-w-md">
            Canlı açık arttırmalara katıl, ücretsiz ilanlara göz at, ekspertiz raporlarıyla güvenle al.
          </p>
        </div>

        <div className="relative space-y-4">
          <Feature
            icon={<Gavel className="h-5 w-5" />}
            title="Canlı Açık Arttırma"
            desc="Şeffaf teklif mekanizması ile en iyi fiyatı yakala"
          />
          <Feature
            icon={<ShieldCheck className="h-5 w-5" />}
            title="Güvenli Ticaret"
            desc="Ekspertiz raporlu, doğrulanmış ilanlar"
          />
          <Feature
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="Ücretsiz İlan"
            desc="Komisyon ödemeden kendi ilanını oluştur"
          />
          <Feature
            icon={<Star className="h-5 w-5" />}
            title="7/24 Destek"
            desc="Müşteri hizmetlerimiz her zaman yanında"
          />
        </div>

        <div className="relative text-xs text-white/60">
          © {new Date().getFullYear()} arabamabak
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-white/80">{desc}</div>
      </div>
    </div>
  );
}
