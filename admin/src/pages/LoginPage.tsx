import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, Mail, Lock, AlertCircle, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalıdır'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { admin, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!loading && admin) {
      navigate('/', { replace: true });
    }
  }, [admin, loading, navigate]);

  async function onSubmit(values: LoginForm) {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: values.email.trim(),
        password: values.password,
      });
      if (error) {
        setErrorMsg(error.message || 'Giriş yapılamadı');
        return;
      }
      if (!data.user) {
        setErrorMsg('Giriş yapılamadı');
        return;
      }
      // Auth state değiştiğinde AuthContext admin state'i doldurur.
      // Burada admin kaydı yoksa hata gösterilebilmesi için ek bir kontrol yapıyoruz.
      const { data: adminRow, error: adminErr } = await supabase
        .from('admin_users')
        .select('id, is_active, is_super_admin')
        .eq('user_id', data.user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (adminErr) {
        setErrorMsg(adminErr.message);
        await supabase.auth.signOut();
        return;
      }
      if (!adminRow) {
        setErrorMsg('Bu hesabın admin yetkisi yok. Yönetici ile iletişime geçin.');
        await supabase.auth.signOut();
        return;
      }
      // AuthContext yönlendirmeyi tetikler.
      navigate('/', { replace: true });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Giriş yapılamadı');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sol gradient panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-slate-900 via-sky-900 to-sky-700 text-white">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-sky-400 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-64 w-64 rounded-full bg-cyan-400 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center border border-white/20">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-extrabold tracking-tight">arabamabak</div>
              <div className="text-sm text-sky-200">Yönetim Paneli</div>
            </div>
          </div>
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-extrabold leading-tight">
              Tüm operasyonunuz <span className="text-sky-300">tek panelde</span>.
            </h1>
            <p className="text-sky-100/80 text-base leading-relaxed">
              İlanlar, açık arttırmalar, ekspertiz talepleri ve finansal işlemlerinizi güvenli
              bir arayüzden yönetin. Sadece yetkilendirilmiş yöneticiler içindir.
            </p>
            <div className="flex items-center gap-2 text-sm text-sky-200/80">
              <Shield className="h-4 w-4" />
              <span>SSL korumalı, Supabase Auth ile güvenli giriş</span>
            </div>
          </div>
          <div className="text-xs text-sky-200/60">
            © {new Date().getFullYear()} arabamabak. Tüm hakları saklıdır.
          </div>
        </div>
      </div>

      {/* Sağ form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-sky-600 text-white flex items-center justify-center">
              <Car className="h-5 w-5" />
            </div>
            <span className="text-xl font-extrabold text-slate-800">arabamabak</span>
          </div>
          <div className="card p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Yönetici Girişi</h2>
              <p className="text-sm text-slate-500 mt-1">
                Hesabınızla giriş yaparak panele erişin.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div>
                <label className="label" htmlFor="email">E-posta</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="ornek@arabamabak.com"
                    className={cn('input pl-9', errors.email && 'border-red-400 focus:border-red-500 focus:ring-red-500')}
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="label" htmlFor="password">Şifre</label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn('input pl-9', errors.password && 'border-red-400 focus:border-red-500 focus:ring-red-500')}
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full"
              >
                {submitting ? 'Giriş yapılıyor…' : 'Giriş Yap'}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-400">
              Bu sayfa yalnızca yetkili yöneticiler içindir. Tüm giriş denemeleri loglanır.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
