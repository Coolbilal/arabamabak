import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Camera, Loader, Save, User, Wallet, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, publicUrl } from '../lib/supabase';
import { formatPrice, cn } from '../lib/utils';
import { useCities, useDistricts } from '../lib/useLocationData';

const schema = z.object({
  full_name: z.string().min(2, 'Ad soyad en az 2 karakter olmalı').max(80),
  phone: z
    .string()
    .max(20)
    .regex(/^[0-9+\s()-]*$/, 'Geçersiz telefon')
    .optional()
    .or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  district: z.string().max(60).optional().or(z.literal('')),
  bio: z.string().max(500).optional().or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth();
  if (!user) return <Navigate to="/giris" replace />;

  const fileInput = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url ?? null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
      district: profile?.district ?? '',
      bio: '',
    },
  });

  // İl değişince ilçeleri yükle
  const watchedCity = watch('city');
  const districtsQuery = useDistricts(watchedCity);

  useEffect(() => {
    reset({
      full_name: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
      city: profile?.city ?? '',
      district: profile?.district ?? '',
      bio: '',
    });
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile, reset]);

  const uploadAvatar = useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      if (file.size > 2 * 1024 * 1024) throw new Error('Avatar 2MB\'dan büyük olamaz');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Sadece JPEG, PNG veya WebP yükleyin');
      }
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });
      if (upErr) throw upErr;
      const url = publicUrl('avatars', path);
      const { error: dbErr } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', user.id);
      if (dbErr) throw dbErr;
      return url;
    },
    onSuccess: (url) => {
      setAvatarUrl(url);
      refreshProfile();
    },
    onError: (err: Error) => alert(err.message),
  });

  const onAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) uploadAvatar.mutate(f);
    e.target.value = '';
  };

  const save = useMutation({
    mutationFn: async (vals: FormValues) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: vals.full_name.trim(),
          phone: vals.phone?.trim() || null,
          city: vals.city?.trim() || null,
          district: vals.district?.trim() || null,
        })
        .eq('id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await refreshProfile();
      setSavedAt(Date.now());
      window.setTimeout(() => setSavedAt(null), 3000);
    },
    onError: (err: Error) => alert(err.message || 'Kayıt başarısız'),
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-slate-900">Profilim</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Sol: avatar + form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-white shadow"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-bold text-white">
                    {(profile?.full_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploadAvatar.isPending}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-700 shadow ring-1 ring-slate-200 transition hover:bg-slate-50"
                  aria-label="Avatar yükle"
                >
                  {uploadAvatar.isPending ? (
                    <Loader className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </button>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={onAvatarChange}
                />
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {profile?.full_name ?? 'İsimsiz Kullanıcı'}
                </div>
                <div className="text-sm text-slate-500">{user.email}</div>
                <div className="mt-1 text-xs text-slate-400">
                  JPG/PNG/WebP · Maks 2MB
                </div>
              </div>
            </div>
          </div>

          <form
            onSubmit={handleSubmit((v) => save.mutate(v))}
            className="card space-y-4 p-6"
          >
            <div>
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <User className="h-4 w-4" /> Kişisel Bilgiler
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Profil bilgilerinizi güncelleyin. Yıldızlı alanlar zorunludur.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Ad Soyad *
                </label>
                <input className={cn('input', errors.full_name && 'border-red-400')}
                  {...register('full_name')} />
                {errors.full_name && (
                  <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Telefon</label>
                <input className="input" placeholder="05XX XXX XX XX" {...register('phone')} />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">İl</label>
                <select className="input" {...register('city')}>
                  <option value="">Seçiniz</option>
                  {useCities().data?.map((c) => (
                    <option key={c.id} value={c.name}>{c.plate_code.toString().padStart(2, '0')} - {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">İlçe</label>
                <select
                  className="input"
                  {...register('district')}
                  disabled={!watchedCity}
                >
                  <option value="">{watchedCity ? 'İlçe seçin' : 'Önce il seçin'}</option>
                  {districtsQuery.data?.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Hakkımda <span className="text-slate-400">(opsiyonel)</span>
                </label>
                <textarea
                  className="input min-h-[90px] resize-y"
                  placeholder="Kendinizden kısaca bahsedin..."
                  {...register('bio')}
                />
                {errors.bio && (
                  <p className="mt-1 text-xs text-red-600">{errors.bio.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <div>
                {savedAt && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 animate-fade-in">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Profil güncellendi
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!isDirty || isSubmitting || save.isPending}
                className="btn-primary"
              >
                {save.isPending ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Kaydet
              </button>
            </div>
          </form>
        </div>

        {/* Sağ: cüzdan özeti */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-6 text-white">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/80">
                <Wallet className="h-4 w-4" /> Cüzdan Bakiyesi
              </div>
              <div className="mt-2 text-3xl font-extrabold">
                {formatPrice(profile?.wallet_balance ?? 0)}
              </div>
              <p className="mt-1 text-xs text-white/80">
                İlan verme, teklif ve ekspertiz ödemeleri için kullanılır.
              </p>
              <Link
                to="/profil/cuzdan"
                className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-white px-3 py-2 text-sm font-semibold text-brand-700 transition hover:bg-amber-50"
              >
                Cüzdana Git
              </Link>
            </div>
          </div>

          <div className="card p-4">
            <h3 className="text-sm font-bold text-slate-900">Hesap Bilgileri</h3>
            <dl className="mt-3 space-y-2 text-xs">
              <Row k="E-posta" v={user.email ?? '—'} />
              <Row k="Kullanıcı ID" v={user.id} mono />
              <Row k="Üyelik Tarihi" v={
                profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString('tr-TR')
                  : '—'
              } />
              <Row k="Rol" v={profile?.role ?? 'user'} />
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="shrink-0 text-slate-500">{k}</dt>
      <dd className={cn('text-right text-slate-800', mono && 'font-mono text-[10px]')}>
        {v}
      </dd>
    </div>
  );
}
