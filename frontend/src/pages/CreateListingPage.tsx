import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, BUCKETS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatPrice } from '../lib/utils';
import { useCities, useDistricts } from '../lib/useLocationData';
import { useEngineSizes } from '../lib/useEngineSizes';
import { usePaymentMethods } from '../lib/usePaymentMethods';
import ThreeDSecureModal from '../components/ThreeDSecureModal';
import BankTransferModal from '../components/BankTransferModal';
import type {
  BodyType,
  FuelType,
  ListingType,
  SiteSettings,
  TransmissionType,
  Vehicle,
  VehicleBrand,
  VehicleModel,
} from '../lib/types';
import {
  BODY_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
} from '../lib/types';
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CreditCard,
  Fuel,
  Gavel,
  ImagePlus,
  Loader2,
  MapPin,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

type ListingForm = {
  brand_id: string;
  model_id: string;
  year: string;
  km: string;
  fuel: FuelType;
  transmission: TransmissionType;
  body: BodyType;
  engine_size_id: string | null;
  engine_power_kw: number | null;
  color: string;
  damage_record: boolean;
  damage_detail: string;
  exchange_accepted: boolean;
  description: string;
  city: string;
  district: string;
  title: string;
  price: string;
  listing_type: ListingType;
  images: string[]; // public URLs after upload
};

const STEPS = [
  { key: 'brand', label: 'Marka & Model' },
  { key: 'specs', label: 'Teknik Bilgiler' },
  { key: 'condition', label: 'Hasar & Açıklama' },
  { key: 'images', label: 'Fotoğraflar' },
  { key: 'location', label: 'Konum & Başlık' },
  { key: 'type', label: 'Yayın Tipi' },
] as const;

const initialForm: ListingForm = {
  brand_id: '',
  model_id: '',
  year: '',
  km: '',
  fuel: 'benzin',
  transmission: 'manuel',
  body: 'sedan',
  engine_size_id: null,
  engine_power_kw: null,
  color: '',
  damage_record: false,
  damage_detail: '',
  exchange_accepted: false,
  description: '',
  city: '',
  district: '',
  title: '',
  price: '',
  listing_type: 'free',
  images: [],
};

export default function CreateListingPage() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [show3DS, setShow3DS] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [paidMethod, setPaidMethod] = useState<'wallet' | 'iyzico' | 'bank_transfer' | null>(null);

  const settings = useQuery({
    queryKey: ['site_settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
      if (error) throw error;
      return (data as unknown as SiteSettings) ?? null;
    },
    staleTime: 60_000,
  });

  const submit = useMutation({
    mutationFn: async (withAuction: boolean) => {
      if (!user) throw new Error('Giriş yapmalısınız');
      // 1) insert vehicle
      const vehiclePayload: Partial<Vehicle> = {
        seller_id: user.id,
        title: form.title,
        brand_id: form.brand_id,
        model_id: form.model_id,
        year: Number(form.year),
        km: Number(form.km),
        fuel: form.fuel,
        transmission: form.transmission,
        body: form.body,
        engine_size_id: form.engine_size_id,
        engine_power_kw: form.engine_power_kw,
        color: form.color || null,
        price: Number(form.price) || 0,
        city: form.city,
        district: form.district || null,
        damage_record: form.damage_record,
        damage_detail: form.damage_detail || null,
        exchange_accepted: form.exchange_accepted,
        description: form.description || null,
        listing_type: form.listing_type,
        status: 'pending',
        is_premium: form.listing_type === 'premium_auction',
        published_at: null,
      };
      const { data: vehicle, error: vErr } = await supabase
        .from('vehicles')
        .insert(vehiclePayload)
        .select()
        .single();
      if (vErr) throw vErr;

      const vId = (vehicle as unknown as Vehicle).id;

      // 2) insert images
      if (form.images.length > 0) {
        const rows = form.images.map((url, idx) => ({
          vehicle_id: vId,
          url,
          sort_order: idx,
        }));
        const { error: iErr } = await supabase.from('vehicle_images').insert(rows);
        if (iErr) throw iErr;
      }

      // 3) transaction (auction oluşturma admin tarafında slot atanınca yapılır)
      if (withAuction) {
        const fee =
          form.listing_type === 'premium_auction'
            ? Number(settings.data?.premium_auction_fee ?? 750)
            : Number(settings.data?.auction_listing_fee ?? 250);
        const txType: 'auction_payment' | 'premium_payment' =
          form.listing_type === 'premium_auction' ? 'premium_payment' : 'auction_payment';
        const { error: tErr } = await supabase.from('transactions').insert({
          user_id: user.id,
          type: txType,
          amount: fee,
          status: 'completed',
          payment_method: paidMethod ?? 'wallet',
          description: `${form.listing_type === 'premium_auction' ? 'Premium' : 'Standart'} açık arttırma listeleme ücreti`,
          related_vehicle_id: vId,
          completed_at: new Date().toISOString(),
        });
        if (tErr) throw tErr;

        // Cüzdandan düş (sadece wallet seçildiyse)
        if (paidMethod === 'wallet' || paidMethod === null) {
          const balance = Number(profile?.wallet_balance ?? 0);
          if (balance >= fee) {
            const { error: wErr } = await supabase
              .from('profiles')
              .update({ wallet_balance: balance - fee })
              .eq('id', user.id);
            if (wErr) throw wErr;
          }
        }
        // Auction kaydı admin onay + slot atamasından sonra oluşturulur
      }

      return vId;
    },
    onSuccess: async (vId) => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['home'] });
      queryClient.invalidateQueries({ queryKey: ['category'] });
      navigate(`/ilan/${vId}`, { replace: true });
    },
    onError: (e: Error) => {
      setError(e.message);
    },
  });

  if (!user) {
    return <Navigate to="/giris?next=/ilan-ver" replace />;
  }

  const setField = <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
  };

  const validateStep = (s: number): string | null => {
    if (s === 0) {
      if (!form.brand_id) return 'Marka seçmelisiniz';
      if (!form.model_id) return 'Model seçmelisiniz';
    }
    if (s === 1) {
      const y = Number(form.year);
      if (!form.year || Number.isNaN(y) || y < 1950 || y > 2026) return 'Geçerli bir yıl girin (1950-2026)';
      if (form.km === '' || Number.isNaN(Number(form.km)) || Number(form.km) < 0) return 'Geçerli bir KM girin';
    }
    if (s === 2) {
      if (form.damage_record && !form.damage_detail.trim()) return 'Hasar varsa detay girin';
    }
    if (s === 3) {
      if (form.images.length === 0) return 'En az 1 fotoğraf yüklemelisiniz';
    }
    if (s === 4) {
      if (!form.city) return 'Şehir seçmelisiniz';
      if (!form.title.trim()) return 'İlan başlığı girin';
    }
    if (s === 5) {
      if (form.listing_type !== 'free' && (!form.price || Number(form.price) <= 0)) {
        return 'Açık arttırma için açılış fiyatı girin';
      }
    }
    return null;
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goPrev = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handlePublish = () => {
    setError(null);
    const err = validateStep(STEPS.length - 1);
    if (err) {
      setError(err);
      return;
    }
    if (form.listing_type !== 'free') {
      // show payment picker
      setShowPayment(true);
      return;
    }
    submit.mutate(false);
  };

  const finishAfterPayment = (method: 'wallet' | 'iyzico' | 'bank_transfer') => {
    setPaidMethod(method);
    setShowPayment(false);
    setShow3DS(false);
    setShowBank(false);
    submit.mutate(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <h1 className="text-2xl font-extrabold text-slate-900">Yeni İlan Ver</h1>
      <p className="mt-1 text-sm text-slate-500">
        İlanınız admin onayından sonra yayına alınır. Tüm bilgileri eksiksiz doldurun.
      </p>

      <Stepper step={step} />

      <div className="card mt-6 p-5 md:p-6 space-y-4">
        {step === 0 && <Step1BrandModel form={form} setField={setField} />}
        {step === 1 && <Step2Specs form={form} setField={setField} />}
        {step === 2 && <Step3Condition form={form} setField={setField} />}
        {step === 3 && <Step4Images form={form} setField={setField} userId={user.id} />}
        {step === 4 && <Step5Location form={form} setField={setField} />}
        {step === 5 && <Step6Type form={form} setField={setField} settings={settings.data} />}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle className="inline h-4 w-4 mr-1" /> {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={goPrev}
            className="btn-secondary"
            disabled={step === 0 || submit.isPending}
          >
            <ChevronLeft className="h-4 w-4" /> Geri
          </button>
          {step < STEPS.length - 1 ? (
            <button type="button" onClick={goNext} className="btn-primary" disabled={submit.isPending}>
              İleri <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              className="btn-primary"
              disabled={submit.isPending}
            >
              {submit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {form.listing_type === 'free' ? 'Yayınla' : 'Ödeme Yap ve Yayınla'}
            </button>
          )}
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          listingType={form.listing_type}
          fee={
            form.listing_type === 'premium_auction'
              ? Number(settings.data?.premium_auction_fee ?? 750)
              : Number(settings.data?.auction_listing_fee ?? 250)
          }
          walletBalance={Number(profile?.wallet_balance ?? 0)}
          onClose={() => setShowPayment(false)}
          onConfirmWallet={() => finishAfterPayment('wallet')}
          onSelectCard={() => { setShowPayment(false); setShow3DS(true); }}
          onSelectBank={() => { setShowPayment(false); setShowBank(true); }}
        />
      )}

      {show3DS && (
        <ThreeDSecureModal
          amount={form.listing_type === 'premium_auction'
            ? Number(settings.data?.premium_auction_fee ?? 750)
            : Number(settings.data?.auction_listing_fee ?? 250)}
          description={`${form.listing_type === 'premium_auction' ? 'Premium' : 'Standart'} açık arttırma listeleme ücreti`}
          onCancel={() => { setShow3DS(false); setShowPayment(true); }}
          onSuccess={() => finishAfterPayment('iyzico')}
          onFailure={(msg) => { setError(msg); setShow3DS(false); setShowPayment(true); }}
        />
      )}

      {showBank && (
        <BankTransferWrapper
          amount={form.listing_type === 'premium_auction'
            ? Number(settings.data?.premium_auction_fee ?? 750)
            : Number(settings.data?.auction_listing_fee ?? 250)}
          description={`${form.listing_type === 'premium_auction' ? 'Premium' : 'Standart'} açık arttırma listeleme ücreti`}
          onCancel={() => { setShowBank(false); setShowPayment(true); }}
          onSuccess={() => finishAfterPayment('bank_transfer')}
        />
      )}
    </div>
  );
}

function BankTransferWrapper({
  amount, description, onCancel, onSuccess,
}: {
  amount: number;
  description: string;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const { data: methods } = usePaymentMethods();
  const bank = methods?.find((m) => m.type === 'bank' && m.is_active);
  return (
    <BankTransferModal
      amount={amount}
      description={description}
      bankConfig={(bank?.config as any) ?? {}}
      onCancel={onCancel}
      onSuccess={onSuccess}
    />
  );
}

/* ---------------- Stepper ---------------- */

function Stepper({ step }: { step: number }) {
  return (
    <ol className="mt-6 flex flex-wrap items-center gap-2 text-xs">
      {STEPS.map((s, i) => {
        const done = i < step;
        const active = i === step;
        return (
          <li
            key={s.key}
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-1.5',
              done && 'border-emerald-200 bg-emerald-50 text-emerald-700',
              active && 'border-brand-300 bg-brand-50 text-brand-700 font-semibold',
              !done && !active && 'border-slate-200 bg-white text-slate-500',
            )}
          >
            <span
              className={cn(
                'inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                done && 'bg-emerald-500 text-white',
                active && 'bg-brand-600 text-white',
                !done && !active && 'bg-slate-200 text-slate-500',
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {s.label}
          </li>
        );
      })}
    </ol>
  );
}

/* ---------------- Step 1 ---------------- */

function Step1BrandModel({
  form,
  setField,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
}) {
  const brands = useQuery({
    queryKey: ['brands-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VehicleBrand[];
    },
    staleTime: 5 * 60_000,
  });
  const models = useQuery({
    queryKey: ['models-active', form.brand_id],
    enabled: !!form.brand_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('*')
        .eq('is_active', true)
        .eq('brand_id', form.brand_id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as VehicleModel[];
    },
    staleTime: 5 * 60_000,
  });
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Marka & Model</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Marka *</label>
          <select
            className="input mt-1"
            value={form.brand_id}
            onChange={(e) => {
              setField('brand_id', e.target.value);
              setField('model_id', '');
            }}
          >
            <option value="">Marka seçin…</option>
            {brands.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Model *</label>
          <select
            className="input mt-1 disabled:bg-slate-50"
            value={form.model_id}
            onChange={(e) => setField('model_id', e.target.value)}
            disabled={!form.brand_id}
          >
            <option value="">{form.brand_id ? 'Model seçin…' : 'Önce marka seçin'}</option>
            {models.data?.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Step 2 ---------------- */

function Step2Specs({
  form,
  setField,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Teknik Bilgiler</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yıl *</label>
          <input
            type="number"
            min={1950}
            max={2026}
            className="input mt-1"
            value={form.year}
            onChange={(e) => setField('year', e.target.value)}
            placeholder="2018"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">KM *</label>
          <input
            type="number"
            min={0}
            className="input mt-1"
            value={form.km}
            onChange={(e) => setField('km', e.target.value)}
            placeholder="125000"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Renk</label>
          <input
            type="text"
            className="input mt-1"
            value={form.color}
            onChange={(e) => setField('color', e.target.value)}
            placeholder="Beyaz"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yakıt *</label>
          <select
            className="input mt-1"
            value={form.fuel}
            onChange={(e) => setField('fuel', e.target.value as FuelType)}
          >
            {Object.entries(FUEL_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Vites *</label>
          <select
            className="input mt-1"
            value={form.transmission}
            onChange={(e) => setField('transmission', e.target.value as TransmissionType)}
          >
            {Object.entries(TRANSMISSION_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Kasa *</label>
          <select
            className="input mt-1"
            value={form.body}
            onChange={(e) => setField('body', e.target.value as BodyType)}
          >
            {Object.entries(BODY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Motor Hacmi</label>
          <EngineSizeSelect form={form} setField={setField} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Motor Gücü (kW)</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={2000}
            step={1}
            className="input mt-1"
            value={form.engine_power_kw ?? ''}
            onChange={(e) => setField('engine_power_kw', e.target.value ? Number(e.target.value) : null)}
            placeholder="81"
          />
        </div>
      </div>
    </div>
  );
}

function EngineSizeSelect({
  form,
  setField,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
}) {
  const sizes = useEngineSizes();
  return (
    <select
      className="input mt-1"
      value={form.engine_size_id ?? ''}
      onChange={(e) => setField('engine_size_id', e.target.value || null)}
      disabled={sizes.isLoading}
    >
      <option value="">{sizes.isLoading ? 'Yükleniyor…' : 'Seçin (opsiyonel)'}</option>
      {sizes.data?.map((s) => (
        <option key={s.id} value={s.id}>
          {s.displacement}
        </option>
      ))}
    </select>
  );
}

/* ---------------- Step 3 ---------------- */

function Step3Condition({
  form,
  setField,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Hasar & Açıklama</h2>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500">Hasar Kaydı *</label>
        <div className="mt-2 flex gap-2">
          {[
            { v: false, l: 'Hasar kaydı yok' },
            { v: true, l: 'Hasar kaydı var' },
          ].map((o) => (
            <button
              key={String(o.v)}
              type="button"
              onClick={() => setField('damage_record', o.v)}
              className={cn(
                'flex-1 rounded-lg border px-3 py-2 text-sm font-medium',
                form.damage_record === o.v
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              {form.damage_record === o.v ? <CheckCircle2 className="inline h-4 w-4 mr-1" /> : <Circle className="inline h-4 w-4 mr-1" />}
              {o.l}
            </button>
          ))}
        </div>
      </div>
      {form.damage_record && (
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Hasar Detayı *</label>
          <textarea
            className="input mt-1 min-h-[100px]"
            value={form.damage_detail}
            onChange={(e) => setField('damage_detail', e.target.value)}
            placeholder="Hangi parçalar değişti, hangi parçalar orijinal…"
          />
        </div>
      )}
      <div className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
        <div>
          <div className="text-sm font-semibold text-slate-800">Takas kabul ediyor musunuz?</div>
          <div className="text-xs text-slate-500">Takas ile takas için açık olursanız daha fazla alıcıya ulaşırsınız.</div>
        </div>
        <button
          type="button"
          onClick={() => setField('exchange_accepted', !form.exchange_accepted)}
          className={cn(
            'relative h-6 w-11 rounded-full transition',
            form.exchange_accepted ? 'bg-brand-600' : 'bg-slate-300',
          )}
          aria-label="Takas kabul"
        >
          <span
            className={cn(
              'absolute top-0.5 inline-block h-5 w-5 rounded-full bg-white transition',
              form.exchange_accepted ? 'left-5' : 'left-0.5',
            )}
          />
        </button>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500">Açıklama</label>
        <textarea
          className="input mt-1 min-h-[140px]"
          value={form.description}
          onChange={(e) => setField('description', e.target.value)}
          placeholder="Aracınızın özelliklerini, bakım geçmişini, ekstralarını anlatın…"
        />
      </div>
    </div>
  );
}

/* ---------------- Step 4 ---------------- */

function Step4Images({
  form,
  setField,
  userId,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
  userId: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploadError(null);
    const list = Array.from(files);
    const remaining = MAX_IMAGES - form.images.length;
    if (list.length > remaining) {
      setUploadError(`En fazla ${MAX_IMAGES} fotoğraf yükleyebilirsiniz.`);
      return;
    }
    for (const f of list) {
      if (!ACCEPTED_TYPES.includes(f.type)) {
        setUploadError('Sadece JPEG, PNG, WEBP veya AVIF yükleyebilirsiniz.');
        return;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        setUploadError('Her fotoğraf en fazla 10 MB olabilir.');
        return;
      }
    }
    setUploading(true);
    try {
      const newUrls: string[] = [];
      for (const f of list) {
        const ext = f.name.split('.').pop() || 'jpg';
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKETS.VEHICLE_IMAGES)
          .upload(path, f, { contentType: f.type, upsert: false });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKETS.VEHICLE_IMAGES).getPublicUrl(path);
        newUrls.push(pub.publicUrl);
      }
      setField('images', [...form.images, ...newUrls]);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setField(
      'images',
      form.images.filter((_, i) => i !== idx),
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Fotoğraflar</h2>
      <p className="text-sm text-slate-500">
        En fazla {MAX_IMAGES} fotoğraf, her biri en fazla 10 MB. JPEG, PNG, WEBP veya AVIF.
      </p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:bg-slate-100"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        ) : (
          <ImagePlus className="h-8 w-8 text-slate-400" />
        )}
        <div className="mt-2 text-sm font-semibold text-slate-700">
          Fotoğrafları sürükleyip bırakın veya tıklayarak seçin
        </div>
        <div className="text-xs text-slate-500">İlk fotoğraf kapak görseli olur</div>
      </div>
      {uploadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
          <XCircle className="inline h-4 w-4 mr-1" /> {uploadError}
        </div>
      )}
      {form.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {form.images.map((url, i) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200">
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 badge bg-amber-500 text-white text-[10px]">KAPAK</span>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100"
                aria-label="Fotoğrafı kaldır"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-slate-500">
        {form.images.length} / {MAX_IMAGES} fotoğraf yüklendi
      </div>
    </div>
  );
}

/* ---------------- Step 5 ---------------- */

function Step5Location({
  form,
  setField,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
}) {
  const cities = useCities();
  // City name -> id for district lookup
  const selectedCity = cities.data?.find((c) => c.name === form.city);
  const districts = useDistricts(selectedCity?.id ?? null);
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Konum & Başlık</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">İl *</label>
          <select
            className="input mt-1"
            value={form.city}
            onChange={(e) => {
              setField('city', e.target.value);
              // İl değişince ilçe temizle
              if (form.district) setField('district', '');
            }}
            disabled={cities.isLoading}
          >
            <option value="">{cities.isLoading ? 'Yükleniyor…' : 'İl seçin…'}</option>
            {cities.data?.map((c) => (
              <option key={c.id} value={c.name}>
                {c.plate_code.toString().padStart(2, '0')} - {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">İlçe</label>
          <select
            className="input mt-1"
            value={form.district}
            onChange={(e) => setField('district', e.target.value)}
            disabled={!form.city || districts.isLoading}
          >
            <option value="">
              {!form.city
                ? 'Önce il seçin'
                : districts.isLoading
                ? 'Yükleniyor…'
                : districts.data && districts.data.length > 0
                ? 'İlçe seçin (opsiyonel)'
                : 'İlçe bulunamadı'}
            </option>
            {districts.data?.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
            {/* Free text fallback: always allow custom value if user wants something not in list */}
            {form.district && !districts.data?.some((d) => d.name === form.district) && (
              <option value={form.district}>{form.district}</option>
            )}
          </select>
          {form.city && districts.data && districts.data.length === 0 && !districts.isLoading && (
            <p className="mt-1 text-xs text-slate-500">
              İlçe listede yoksa el ile yazabilirsiniz.
            </p>
          )}
        </div>
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-slate-500">İlan Başlığı *</label>
        <input
          type="text"
          className="input mt-1"
          value={form.title}
          onChange={(e) => setField('title', e.target.value)}
          maxLength={120}
          placeholder="Örn: 2020 BMW 320i M Sport Hatasız Boyasız"
        />
        <div className="mt-1 text-xs text-slate-400">{form.title.length} / 120</div>
      </div>
    </div>
  );
}

/* ---------------- Step 6 ---------------- */

function Step6Type({
  form,
  setField,
  settings,
}: {
  form: ListingForm;
  setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void;
  settings: SiteSettings | null | undefined;
}) {
  const auctionFee = Number(settings?.auction_listing_fee ?? 250);
  const premiumFee = Number(settings?.premium_auction_fee ?? 750);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Yayın Tipi</h2>
      <p className="text-sm text-slate-500">
        Ücretsiz ilanlar admin onayından sonra yayınlanır. Açık arttırma ilanları için küçük bir
        listeleme ücreti alınır ve araç 7 gün boyunca açık arttırmaya açılır.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <TypeCard
          active={form.listing_type === 'free'}
          onClick={() => {
            setField('listing_type', 'free');
            setField('price', form.price);
          }}
          title="Ücretsiz İlan"
          desc="Hemen yayına al, komisyon ödeme"
          price="0 ₺"
          icon={<CheckCircle2 className="h-5 w-5" />}
          color="emerald"
        />
        <TypeCard
          active={form.listing_type === 'auction'}
          onClick={() => setField('listing_type', 'auction')}
          title="Açık Arttırma"
          desc="7 günlük açık arttırma"
          price={formatPrice(auctionFee)}
          icon={<Gavel className="h-5 w-5" />}
          color="amber"
        />
        <TypeCard
          active={form.listing_type === 'premium_auction'}
          onClick={() => setField('listing_type', 'premium_auction')}
          title="Premium Açık Arttırma"
          desc="Öne çıkan, 7 günlük açık arttırma"
          price={formatPrice(premiumFee)}
          icon={<Sparkles className="h-5 w-5" />}
          color="brand"
        />
      </div>

      {form.listing_type !== 'free' && (
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Açılış Fiyatı (TL) *</label>
          <input
            type="number"
            min={0}
            className="input mt-1"
            value={form.price}
            onChange={(e) => setField('price', e.target.value)}
            placeholder="250000"
          />
        </div>
      )}
    </div>
  );
}

function TypeCard({
  active,
  onClick,
  title,
  desc,
  price,
  icon,
  color,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  desc: string;
  price: string;
  icon: React.ReactNode;
  color: 'emerald' | 'amber' | 'brand';
}) {
  const tone =
    color === 'emerald'
      ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
      : color === 'amber'
        ? 'border-amber-300 bg-amber-50 text-amber-800'
        : 'border-brand-300 bg-brand-50 text-brand-800';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-2xl border-2 p-4 text-left transition',
        active ? tone : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/70">
          {icon}
        </span>
        <span className="text-lg font-extrabold">{price}</span>
      </div>
      <div className="mt-2 font-semibold">{title}</div>
      <div className="text-xs opacity-80">{desc}</div>
    </button>
  );
}

/* ---------------- Payment Modal ---------------- */

function PaymentModal({
  listingType,
  fee,
  walletBalance,
  onClose,
  onConfirmWallet,
  onSelectCard,
  onSelectBank,
}: {
  listingType: ListingType;
  fee: number;
  walletBalance: number;
  onClose: () => void;
  onConfirmWallet: () => void;
  onSelectCard: () => void;
  onSelectBank: () => void;
}) {
  const { data: methods, isLoading } = usePaymentMethods();
  const total = fee;
  const enough = walletBalance >= fee;

  const wallet = methods?.find((m) => m.code === 'wallet' && m.is_active);
  const card   = methods?.find((m) => m.type === 'card' && m.is_active);
  const bank   = methods?.find((m) => m.type === 'bank' && m.is_active);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold">Listeleme Ücreti</h3>
            <p className="text-sm text-slate-500">
              {listingType === 'premium_auction' ? 'Premium' : 'Standart'} açık arttırma için ödeme
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn-ghost p-1" aria-label="Kapat">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="my-4 space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-sm">
            <span className="font-medium">Toplam</span>
            <span className="font-extrabold text-slate-900 text-lg">{formatPrice(total)}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-400" />
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-700">Ödeme Yöntemi Seç</p>

            {wallet && (
              <button
                type="button"
                onClick={onConfirmWallet}
                disabled={!enough}
                className={cn(
                  'w-full text-left rounded-lg border-2 p-3 transition flex items-center gap-3',
                  enough ? 'border-emerald-200 bg-emerald-50 hover:border-emerald-400' : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed',
                )}
              >
                <div className="h-10 w-10 rounded-lg bg-white flex items-center justify-center text-emerald-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">Cüzdan Bakiyesi</div>
                  <div className="text-xs text-slate-500">Bakiye: {formatPrice(walletBalance)}</div>
                </div>
                {enough && <span className="text-xs font-bold text-emerald-600">Yeterli</span>}
              </button>
            )}

            {card && (
              <button
                type="button"
                onClick={onSelectCard}
                className="w-full text-left rounded-lg border-2 border-slate-200 p-3 hover:border-blue-400 transition flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{card.name}</div>
                  <div className="text-xs text-slate-500 truncate">{card.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">%{card.fee_percent}</div>
                </div>
              </button>
            )}

            {bank && (
              <button
                type="button"
                onClick={onSelectBank}
                className="w-full text-left rounded-lg border-2 border-slate-200 p-3 hover:border-amber-400 transition flex items-center gap-3"
              >
                <div className="h-10 w-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-700">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-900">{bank.name}</div>
                  <div className="text-xs text-slate-500 truncate">{bank.description}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Onay 1-2 sa</div>
                </div>
              </button>
            )}

            <div className="rounded-md bg-blue-50 border border-blue-100 p-2.5 text-xs text-blue-800 flex items-start gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>Kart ödemeleri 3D Secure ile korunur. Tüm bilgiler Supabase'de güvenle saklanır.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Suppress unused imports
void Fuel;
void MapPin;
void Settings2;
void Upload;
