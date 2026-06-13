import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, BUCKETS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useCities, useDistricts } from '../lib/useLocationData';
import ThreeDSecureModal from '../components/ThreeDSecureModal';
import BankTransferModal from '../components/BankTransferModal';
import type {
  BodyType, FuelType, ListingType, SiteSettings, TransmissionType, VehicleBrand, VehicleModel, VehicleType,
} from '../lib/types';
import {
  BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, VEHICLE_TYPE_LABELS,
} from '../lib/types';
import {
  AlertCircle, ArrowLeft, ArrowRight, Banknote, Battery, Bike, Car, Check, CheckCircle2,
  ChevronRight, CreditCard, Gavel, ImagePlus, Loader2, Sparkles, Truck, Wallet, X,
  Wrench, Ship, Plane, CarFront, FileWarning, History, Home as HomeIcon, Users,
} from 'lucide-react';

const MAX_IMAGES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

type ListingForm = {
  vehicle_type: VehicleType | '';
  brand_id: string;
  model_id: string;
  engine_size_id: string;
  engine_power_kw: number | null;
  year: string;
  km: string;
  fuel: FuelType;
  transmission: TransmissionType;
  body: BodyType;
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
  images: string[];
  attributes: Record<string, unknown>;
};

const VEHICLE_TYPE_ICONS: Record<VehicleType, React.ReactNode> = {
  otomobil: <Car className="h-6 w-6" />,
  suv_pickup: <CarFront className="h-6 w-6" />,
  elektrikli: <Battery className="h-6 w-6" />,
  motorsiklet: <Bike className="h-6 w-6" />,
  minivan_panelvan: <Truck className="h-6 w-6" />,
  ticari: <Truck className="h-6 w-6" />,
  kiralik: <Car className="h-6 w-6" />,
  deniz: <Ship className="h-6 w-6" />,
  hasarli: <FileWarning className="h-6 w-6" />,
  karavan: <HomeIcon className="h-6 w-6" />,
  klasik: <History className="h-6 w-6" />,
  hava: <Plane className="h-6 w-6" />,
  atv: <Wrench className="h-6 w-6" />,
  utv: <Wrench className="h-6 w-6" />,
  engelli: <Users className="h-6 w-6" />,
};

const VEHICLE_TYPE_DESCRIPTIONS: Record<VehicleType, string> = {
  otomobil: 'Sedan, hatchback, SUV, coupe, cabrio',
  suv_pickup: 'Arazi, SUV ve Pickup araçlar',
  elektrikli: 'Tamamen elektrikli araçlar',
  motorsiklet: 'Sport, touring, scooter',
  minivan_panelvan: 'Geniş iç hacimli araçlar',
  ticari: 'Kamyon, kamyonet, otobüs',
  kiralik: 'Rent a car araçları',
  deniz: 'Tekne, yat, motorbot',
  hasarli: 'Kazalı / hasarlı araçlar',
  karavan: 'Motokaravan, çekme karavan',
  klasik: '20+ yaş klasik araçlar',
  hava: 'Uçak, helikopter',
  atv: 'All Terrain Vehicle',
  utv: 'Side by Side',
  engelli: 'Engelli plakalı araçlar',
};

const STEPS = [
  { key: 'type', label: 'Araç Tipi' },
  { key: 'brand', label: 'Marka & Model' },
  { key: 'engine', label: 'Motor' },
  { key: 'specs', label: 'Teknik' },
  { key: 'condition', label: 'Hasar & Açıklama' },
  { key: 'images', label: 'Fotoğraflar' },
  { key: 'location', label: 'Konum & Başlık' },
  { key: 'type_price', label: 'Yayın & Ödeme' },
] as const;

const initialForm: ListingForm = {
  vehicle_type: '',
  brand_id: '',
  model_id: '',
  engine_size_id: '',
  engine_power_kw: null,
  year: '',
  km: '',
  fuel: 'benzin',
  transmission: 'manuel',
  body: 'sedan',
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
  attributes: {},
};

export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingForm>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [listingNo, setListingNo] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'card' | 'bank' | null>(null);
  const [show3DS, setShow3DS] = useState(false);
  const [showBank, setShowBank] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle();
      return (data || {}) as SiteSettings;
    },
  });

  // Brands (kategoriye göre filtreli)
  const brands = useQuery({
    queryKey: ['brands-by-type', form.vehicle_type],
    enabled: !!form.vehicle_type,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, sort_order, is_active, vehicle_type')
        .eq('is_active', true)
        .eq('vehicle_type', form.vehicle_type)
        .order('sort_order');
      if (error) throw error;
      return data as unknown as VehicleBrand[];
    },
  });

  // Models (markaya göre)
  const models = useQuery({
    queryKey: ['models-by-brand', form.brand_id],
    enabled: !!form.brand_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, sort_order')
        .eq('brand_id', form.brand_id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as VehicleModel[];
    },
  });

  // Engine sizes (modele özel, yoksa global)
  const engineSizes = useQuery({
    queryKey: ['engine-sizes', form.model_id],
    queryFn: async () => {
      // Önce modelin displacements array'ini al
      const { data: modelData } = await supabase
        .from('vehicle_models')
        .select('displacements')
        .eq('id', form.model_id)
        .maybeSingle();

      const modelDisplacements: string[] | null = (modelData as { displacements: string[] | null } | null)?.displacements || null;

      if (modelDisplacements && modelDisplacements.length > 0) {
        // Modele özel motorları getir
        const { data, error } = await supabase
          .from('engine_sizes')
          .select('id, displacement')
          .in('displacement', modelDisplacements)
          .order('displacement');
        if (error) throw error;
        return data || [];
      }

      // Yoksa global tüm motorlar
      const { data, error } = await supabase
        .from('engine_sizes')
        .select('id, displacement')
        .order('displacement');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cities = [] } = useCities();
  const { data: districts = [] } = useDistricts(form.city);

  // Marka değişince modeli sıfırla
  useEffect(() => {
    if (!form.brand_id) return;
    setForm(f => ({ ...f, model_id: '' }));
  }, [form.brand_id]);

  // Araç tipi değişince marka ve modeli sıfırla
  useEffect(() => {
    if (!form.vehicle_type) return;
    setForm(f => ({ ...f, brand_id: '', model_id: '', engine_size_id: '', engine_power_kw: null }));
  }, [form.vehicle_type]);

  if (!user) return <Navigate to="/giris?next=/ilan-ver" replace />;

  function setField<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function nextStep() {
    const err = validateStep(step);
    if (err) { setError(err); return; }
    setError(null);
    setStep(s => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setError(null);
    setStep(s => Math.max(s - 1, 0));
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !form.vehicle_type) return 'Araç tipi seçmelisiniz';
    if (s === 1) {
      if (!form.brand_id) return 'Marka seçmelisiniz';
      if (!form.model_id) return 'Model seçmelisiniz';
    }
    if (s === 2) {
      if (!form.engine_size_id) return 'Motor hacmi seçmelisiniz';
    }
    if (s === 3) {
      if (!form.year) return 'Model yılı girin';
      if (!form.km) return 'KM girin';
    }
    if (s === 5 && form.images.length === 0) return 'En az 1 fotoğraf yüklemelisiniz';
    if (s === 6) {
      if (!form.city) return 'İl seçin';
      if (!form.district) return 'İlçe seçin';
      if (!form.title.trim()) return 'İlan başlığı girin';
      if (!form.price) return 'Fiyat girin';
    }
    if (s === 7) {
      if (!form.price || Number(form.price) <= 0) return 'Geçerli bir fiyat girin';
      if ((form.listing_type === 'auction' || form.listing_type === 'premium_auction') && !paymentMethod) return 'Ödeme yöntemi seçin';
    }
    return null;
  }

  const createListing = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .insert({
          user_id: user.id,
          brand_id: form.brand_id,
          model_id: form.model_id,
          year: Number(form.year),
          km: Number(form.km),
          fuel: form.fuel,
          transmission: form.transmission,
          body: form.body,
          engine_size_id: form.engine_size_id || null,
          engine_power_kw: form.engine_power_kw,
          color: form.color || null,
          damage_record: form.damage_record,
          damage_detail: form.damage_detail || null,
          exchange_accepted: form.exchange_accepted,
          description: form.description || null,
          city: form.city,
          district: form.district,
          title: form.title.trim(),
          price: Number(form.price),
          listing_type: form.listing_type,
          status: 'pending',
          published_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          vehicle_type: form.vehicle_type || null,
          attributes: form.attributes && Object.keys(form.attributes).length > 0 ? form.attributes : null,
        })
        .select('id, listing_no')
        .single();
      if (error) throw error;

      // Fotoğrafları kaydet
      if (form.images.length > 0 && data) {
        const imageRows = form.images.map((url, idx) => ({
          vehicle_id: data.id,
          image_url: url,
          sort_order: idx,
          is_cover: idx === 0,
        }));
        await supabase.from('vehicle_images').insert(imageRows);
      }

      return data;
    },
    onSuccess: async (data) => {
      setListingNo(data.listing_no);
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      queryClient.invalidateQueries({ queryKey: ['user-listings'] });
    },
    onError: (e: Error) => setError(e.message),
  });

  async function handleFinalSubmit() {
    if ((form.listing_type === 'auction' || form.listing_type === 'premium_auction') && paymentMethod === 'card') {
      setShow3DS(true);
      return;
    }
    if ((form.listing_type === 'auction' || form.listing_type === 'premium_auction') && paymentMethod === 'bank') {
      setShowBank(true);
      return;
    }
    createListing.mutate();
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-brand-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-4">İlanınız Başarıyla Oluşturuldu! 🎉</h1>
          {listingNo && (
            <div className="mt-4 inline-block bg-slate-100 rounded-lg px-4 py-2">
              <div className="text-xs text-slate-500 uppercase font-semibold">İlan Numaranız</div>
              <div className="text-lg font-mono font-bold text-slate-900">{listingNo}</div>
            </div>
          )}
          <p className="text-slate-600 mt-4 text-sm">
            İlanınız inceleme için kuyruğa alındı. Onaylandıktan sonra yayına alınacak.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button onClick={() => navigate(`/ilan/${listingNo}`)} className="btn-secondary flex-1 justify-center">
              İlanı Gör
            </button>
            <button onClick={() => navigate('/profil/ilanlarim')} className="btn-primary flex-1 justify-center">
              İlanlarım <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button onClick={() => navigate('/')} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 mb-2">
            <ArrowLeft className="h-4 w-4" /> Ana sayfa
          </button>
          <h1 className="text-3xl font-extrabold text-slate-900">Yeni İlan Ver</h1>
          <p className="text-slate-500 text-sm mt-1">Adım adım aracınızı ekleyin</p>
        </div>

        {/* Stepper */}
        <div className="mb-6 card p-4">
          <div className="flex items-center justify-between gap-1 overflow-x-auto">
            {STEPS.map((s, idx) => (
              <div key={s.key} className="flex items-center flex-1 min-w-fit">
                <div className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  idx < step ? 'bg-emerald-500 text-white' :
                  idx === step ? 'bg-brand-600 text-white' :
                  'bg-slate-200 text-slate-500'
                )}>
                  {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <div className="ml-2 text-xs font-medium text-slate-700 hidden sm:block">{s.label}</div>
                {idx < STEPS.length - 1 && (
                  <div className={cn('h-0.5 flex-1 mx-1 sm:mx-2', idx < step ? 'bg-emerald-500' : 'bg-slate-200')} />
                )}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertCircle className="inline h-4 w-4 mr-1" /> {error}
          </div>
        )}

        {/* Step İçerikleri */}
        <div className="card p-6">
          {step === 0 && <StepType form={form} setField={setField} />}
          {step === 1 && <StepBrandModel form={form} setField={setField} brands={brands.data || []} models={models.data || []} loadingBrands={brands.isLoading} loadingModels={models.isLoading} />}
          {step === 2 && <StepEngine form={form} setField={setField} engines={engineSizes.data || []} />}
          {step === 3 && <StepSpecs form={form} setField={setField} />}
          {step === 4 && <StepCondition form={form} setField={setField} />}
          {step === 5 && <StepImages form={form} setField={setField} />}
          {step === 6 && <StepLocation form={form} setField={setField} cities={cities} districts={districts} />}
          {step === 7 && (
            <StepPublish
              form={form}
              setField={setField}
              paymentMethod={paymentMethod}
              setPaymentMethod={setPaymentMethod}
              settings={settings}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="mt-4 flex justify-between">
          <button onClick={prevStep} disabled={step === 0} className="btn-ghost disabled:opacity-50">
            <ArrowLeft className="h-4 w-4" /> Geri
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={nextStep} className="btn-primary">
              İleri <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button onClick={handleFinalSubmit} disabled={createListing.isPending} className="btn-primary">
              {createListing.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              İlanı Oluştur
            </button>
          )}
        </div>
      </div>

      {show3DS && (
        <ThreeDSecureModal
          amount={form.listing_type === 'premium_auction'
            ? Number(form.price) * (settings?.premium_auction_fee || 100) * 2 / 100
            : Number(form.price) * (settings?.premium_auction_fee || 100) / 100}
          description={form.listing_type === 'premium_auction'
            ? 'Premium ilan ücreti (açık arttırma + reklam boost)'
            : 'Açık arttırma yayın ücreti'}
          onCancel={() => setShow3DS(false)}
          onSuccess={() => { setShow3DS(false); createListing.mutate(); }}
          onFailure={() => setShow3DS(false)}
        />
      )}
      {showBank && (
        <BankTransferModal
          amount={form.listing_type === 'premium_auction'
            ? Number(form.price) * (settings?.premium_auction_fee || 100) * 2 / 100
            : Number(form.price) * (settings?.premium_auction_fee || 100) / 100}
          description={form.listing_type === 'premium_auction'
            ? 'Premium ilan ücreti (açık arttırma + reklam boost)'
            : 'Açık arttırma yayın ücreti'}
          bankConfig={{
            bank_name: 'arabamabak A.Ş.',
            account_holder: 'arabamabak Ltd. Şti.',
            iban: 'TR00 0000 0000 0000 0000 0000 00',
            branch_code: '0000',
          }}
          onCancel={() => setShowBank(false)}
          onSuccess={() => { setShowBank(false); createListing.mutate(); }}
        />
      )}
    </div>
  );
}

// ================== STEP COMPONENTS ==================

function StepType({ form, setField }: { form: ListingForm; setField: <K extends keyof ListingForm>(k: K, v: ListingForm[K]) => void }) {
  const types = Object.keys(VEHICLE_TYPE_LABELS) as VehicleType[];
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Araç Tipini Seçin</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın ana kategorisini seçin (15 seçenek)</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {types.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setField('vehicle_type', t)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition',
              form.vehicle_type === t
                ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-md'
                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
            )}
          >
            <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center mb-2',
              form.vehicle_type === t ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600')}>
              {VEHICLE_TYPE_ICONS[t]}
            </div>
            <div className="text-sm font-bold">{VEHICLE_TYPE_LABELS[t]}</div>
            <div className="text-xs text-slate-500 mt-1 line-clamp-2">{VEHICLE_TYPE_DESCRIPTIONS[t]}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepBrandModel({ form, setField, brands, models, loadingBrands, loadingModels }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Marka & Model</h2>
      <p className="text-sm text-slate-500 mb-5">
        {form.vehicle_type ? `${VEHICLE_TYPE_LABELS[form.vehicle_type as VehicleType]} için marka seçin` : 'Marka seçin'}
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Marka *</label>
          {loadingBrands ? (
            <div className="mt-2 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…</div>
          ) : brands.length === 0 ? (
            <div className="mt-2 text-sm text-amber-600">Bu kategori için marka bulunamadı.</div>
          ) : (
            <select className="input mt-1" value={form.brand_id} onChange={e => setField('brand_id', e.target.value)}>
              <option value="">Marka seçin…</option>
              {brands.map((b: VehicleBrand) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
        </div>

        {form.brand_id && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Model *</label>
            {loadingModels ? (
              <div className="mt-2 text-sm text-slate-500 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…</div>
            ) : models.length === 0 ? (
              <div className="mt-2 text-sm text-amber-600">Bu marka için model bulunamadı.</div>
            ) : (
              <select className="input mt-1" value={form.model_id} onChange={e => setField('model_id', e.target.value)}>
                <option value="">Model seçin…</option>
                {models.map((m: VehicleModel) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StepEngine({ form, setField, engines }: any) {
  // Elektrikli ise motor hacmi gösterme, direkt atla
  if (form.vehicle_type === 'elektrikli' || form.vehicle_type === 'deniz' || form.vehicle_type === 'hava') {
    return (
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 mb-1">Motor Bilgisi</h2>
        <p className="text-sm text-slate-500 mb-5">Bu araç tipi için motor hacmi gerekli değil</p>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          <CheckCircle2 className="inline h-4 w-4 mr-1" /> Bu araç tipi için motor hacmi gerekmiyor. İleri'ye tıklayabilirsiniz.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Motor Hacmi & Gücü</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın motor hacmini seçin</p>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Motor Hacmi *</label>
          <select className="input mt-1" value={form.engine_size_id} onChange={e => setField('engine_size_id', e.target.value)}>
            <option value="">Motor hacmi seçin…</option>
            {engines.map((e: { id: string; displacement: string }) => (
              <option key={e.id} value={e.id}>{e.displacement}{e.displacement === 'Elektrik' ? '' : ' L'}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Motor Gücü (HP) - Opsiyonel</label>
          <input
            type="number"
            min={0}
            max={2000}
            className="input mt-1"
            value={form.engine_power_kw || ''}
            onChange={e => setField('engine_power_kw', e.target.value ? Number(e.target.value) : null)}
            placeholder="örn: 150"
          />
        </div>
      </div>
    </div>
  );
}

function StepSpecs({ form, setField }: any) {
  const vt = form.vehicle_type as VehicleType;
  const isMotor = vt === 'motorsiklet' || vt === 'atv' || vt === 'utv';
  const isDeniz = vt === 'deniz';
  const isHava = vt === 'hava';
  const isKaravan = vt === 'karavan';
  const isTicari = vt === 'ticari' || vt === 'minivan_panelvan';
  const isElektrikli = vt === 'elektrikli';
  const isOtomobil = vt === 'otomobil' || vt === 'suv_pickup' || isElektrikli;
  const isKiralik = vt === 'kiralik';
  const isHasarli = vt === 'hasarli';
  const isKlasik = vt === 'klasik';
  const isEngelli = vt === 'engelli';

  function setAttr(key: string, value: unknown) {
    setField('attributes', { ...form.attributes, [key]: value });
  }
  function getAttr(key: string): any {
    return form.attributes?.[key];
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Teknik Bilgiler</h2>
      <p className="text-sm text-slate-500 mb-5">
        {vt ? `${VEHICLE_TYPE_LABELS[vt]} için özel bilgiler` : 'Araç teknik bilgileri'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yıl *</label>
          <input type="number" min={1950} max={2026} className="input mt-1" value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2018" />
        </div>

        {/* KM - kara araçları için */}
        {!isDeniz && !isHava && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">
              {isMotor || isTicari ? 'KM' : 'KM *'}
            </label>
            <input type="number" min={0} className="input mt-1" value={form.km} onChange={e => setField('km', e.target.value)} placeholder="125000" />
          </div>
        )}

        {/* Hava araçları için uçuş saati */}
        {isHava && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Toplam Uçuş Saati *</label>
            <input type="number" min={0} className="input mt-1" value={getAttr('flight_hours') || ''} onChange={e => setAttr('flight_hours', e.target.value)} placeholder="1500" />
          </div>
        )}

        {/* Deniz aracı boy */}
        {isDeniz && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Boy (metre) *</label>
            <input type="number" step="0.1" min={0} className="input mt-1" value={getAttr('length_m') || ''} onChange={e => setAttr('length_m', e.target.value)} placeholder="8.5" />
          </div>
        )}

        {/* Renk - otomobil/motosiklet için */}
        {(isOtomobil || isMotor || isTicari) && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Renk</label>
            <input type="text" className="input mt-1" value={form.color} onChange={e => setField('color', e.target.value)} placeholder="Beyaz" />
          </div>
        )}

        {/* Yakıt - otomobil/motosiklet/ticari için (elektrikli hariç) */}
        {(isOtomobil || isMotor || isTicari) && !isElektrikli && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Yakıt *</label>
            <select className="input mt-1" value={form.fuel} onChange={e => setField('fuel', e.target.value as FuelType)}>
              {Object.entries(FUEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}

        {/* Vites - otomobil/motosiklet/ticari için */}
        {(isOtomobil || isMotor || isTicari) && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Vites *</label>
            <select className="input mt-1" value={form.transmission} onChange={e => setField('transmission', e.target.value as TransmissionType)}>
              {Object.entries(TRANSMISSION_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}

        {/* Kasa - sadece otomobil/SUV için */}
        {isOtomobil && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Kasa *</label>
            <select className="input mt-1" value={form.body} onChange={e => setField('body', e.target.value as BodyType)}>
              {Object.entries(BODY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}

        {/* Yolcu Kapasitesi - deniz, karavan, ticari (minivan_panelvan dahil) */}
        {(isDeniz || isKaravan || isTicari) && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Yolcu Kapasitesi *</label>
            <input type="number" min={0} className="input mt-1" value={getAttr('passenger_capacity') || ''} onChange={e => setAttr('passenger_capacity', e.target.value)} placeholder={isDeniz ? '8' : '5'} />
          </div>
        )}

        {/* Yük Kapasitesi - ticari */}
        {isTicari && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Yük Kapasitesi (kg)</label>
            <input type="number" min={0} className="input mt-1" value={getAttr('cargo_capacity_kg') || ''} onChange={e => setAttr('cargo_capacity_kg', e.target.value)} placeholder="1500" />
          </div>
        )}

        {/* Yatak Sayısı - karavan */}
        {isKaravan && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Yatak Sayısı *</label>
            <input type="number" min={0} className="input mt-1" value={getAttr('bed_count') || ''} onChange={e => setAttr('bed_count', e.target.value)} placeholder="4" />
          </div>
        )}

        {/* Karavan özel - banyo, klima */}
        {isKaravan && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Banyo/WC</label>
            <select className="input mt-1" value={getAttr('has_bathroom') || ''} onChange={e => setAttr('has_bathroom', e.target.value)}>
              <option value="">Seçiniz</option>
              <option value="yes">Var</option>
              <option value="no">Yok</option>
            </select>
          </div>
        )}

        {/* Kiralık - günlük fiyat */}
        {isKiralik && (
          <>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Günlük Fiyat (TL)</label>
              <input type="number" min={0} className="input mt-1" value={getAttr('daily_price') || ''} onChange={e => setAttr('daily_price', e.target.value)} placeholder="500" />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-slate-500">Min. Kiralama (gün)</label>
              <input type="number" min={1} className="input mt-1" value={getAttr('min_rental_days') || ''} onChange={e => setAttr('min_rental_days', e.target.value)} placeholder="3" />
            </div>
          </>
        )}

        {/* Hava - motor markası */}
        {isHava && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Motor Markası</label>
            <input type="text" className="input mt-1" value={getAttr('engine_brand') || ''} onChange={e => setAttr('engine_brand', e.target.value)} placeholder="Lycoming, Continental..." />
          </div>
        )}

        {/* Hava - kuyruk no */}
        {isHava && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Kuyruk Numarası</label>
            <input type="text" className="input mt-1" value={getAttr('tail_number') || ''} onChange={e => setAttr('tail_number', e.target.value)} placeholder="TC-ABC" />
          </div>
        )}

        {/* Klasik - restorasyon durumu */}
        {isKlasik && (
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Restorasyon Durumu *</label>
            <select className="input mt-1" value={getAttr('restoration_status') || ''} onChange={e => setAttr('restoration_status', e.target.value)}>
              <option value="">Seçiniz</option>
              <option value="original">Orijinal, hiç dokunulmamış</option>
              <option value="restored">Restorasyonlu</option>
              <option value="partial">Kısmen restore edilmiş</option>
              <option value="project">Proje (restore edilecek)</option>
            </select>
          </div>
        )}

        {/* Engelli - engel türü */}
        {isEngelli && (
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold uppercase text-slate-500">Engel Türü *</label>
            <select className="input mt-1" value={getAttr('disability_type') || ''} onChange={e => setAttr('disability_type', e.target.value)}>
              <option value="">Seçiniz</option>
              <option value="movement">Hareket engeli</option>
              <option value="vision">Görme engeli</option>
              <option value="hearing">İşitme engeli</option>
              <option value="orthopedic">Ortopedik engel</option>
            </select>
          </div>
        )}

        {/* Hasarlı - zorunlu hasar detayı */}
        {isHasarli && (
          <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Hasarlı araç ilanı veriyorsunuz. Lütfen "Hasar & Açıklama" adımında detay verin (parça durumu, onarım bilgisi).
          </div>
        )}
      </div>
    </div>
  );
}

function StepCondition({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Hasar Durumu & Açıklama</h2>
      <p className="text-sm text-slate-500 mb-5">Detaylı bilgi ver, alıcı güvenir</p>

      <div className="space-y-4">
        <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-slate-300">
          <input type="checkbox" checked={form.damage_record} onChange={e => setField('damage_record', e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">Hasar kaydı var</span>
        </label>

        {form.damage_record && (
          <textarea
            className="input min-h-[80px]"
            placeholder="Hasar detayı..."
            value={form.damage_detail}
            onChange={e => setField('damage_detail', e.target.value)}
          />
        )}

        <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-slate-200 cursor-pointer hover:border-slate-300">
          <input type="checkbox" checked={form.exchange_accepted} onChange={e => setField('exchange_accepted', e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">Takas kabul ediyorum</span>
        </label>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Açıklama</label>
          <textarea
            className="input mt-1 min-h-[120px]"
            placeholder="Aracınız hakkında detaylı bilgi verin..."
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            maxLength={2000}
          />
          <div className="text-xs text-slate-500 mt-1">{form.description.length}/2000</div>
        </div>
      </div>
    </div>
  );
}

function StepImages({ form, setField }: any) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList) {
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [...form.images];
      for (const file of Array.from(files)) {
        if (urls.length >= MAX_IMAGES) break;
        if (file.size > MAX_IMAGE_BYTES) {
          alert(`${file.name} çok büyük (max 10MB)`);
          continue;
        }
        if (!ACCEPTED_TYPES.includes(file.type)) continue;
        const ext = file.name.split('.').pop();
        const path = `vehicles/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from(BUCKETS.VEHICLE_IMAGES).upload(path, file, { contentType: file.type });
        if (error) continue;
        const { data: pub } = supabase.storage.from(BUCKETS.VEHICLE_IMAGES).getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      setField('images', urls);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setField('images', form.images.filter((_: string, i: number) => i !== idx));
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Fotoğraflar</h2>
      <p className="text-sm text-slate-500 mb-5">İlk fotoğraf vitrin fotoğrafı olur. Max {MAX_IMAGES} adet.</p>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-brand-500 transition"
      >
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleFiles(e.target.files)} />
        {uploading ? <Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-400" /> : <ImagePlus className="h-8 w-8 mx-auto text-slate-400" />}
        <p className="mt-2 text-sm text-slate-600">Fotoğraf yükle (sürükle-bırak veya tıkla)</p>
        <p className="text-xs text-slate-500 mt-1">JPG, PNG, WEBP - Max 10MB - {form.images.length}/{MAX_IMAGES}</p>
      </div>

      {form.images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {form.images.map((url: string, idx: number) => (
            <div key={idx} className="relative group">
              <img src={url} alt="" className="w-full h-28 object-cover rounded-lg" />
              {idx === 0 && <span className="absolute top-1 left-1 badge bg-amber-500 text-white text-xs">Vitrin</span>}
              <button onClick={() => removeImage(idx)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepLocation({ form, setField, cities, districts }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Konum & Başlık</h2>
      <p className="text-sm text-slate-500 mb-5">Aracın bulunduğu yer ve ilan başlığı</p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">İl *</label>
            <select className="input mt-1" value={form.city} onChange={e => setField('city', e.target.value)}>
              <option value="">İl seçin</option>
              {cities.map((c: { id: string; name: string }) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">İlçe *</label>
            <select className="input mt-1" value={form.district} onChange={e => setField('district', e.target.value)} disabled={!form.city}>
              <option value="">{form.city ? 'İlçe seçin' : 'Önce il seçin'}</option>
              {districts.map((d: { id: string; name: string }) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">İlan Başlığı *</label>
          <input type="text" className="input mt-1" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Örn: Tertemiz 2018 BMW 320i" maxLength={100} />
          <div className="text-xs text-slate-500 mt-1">{form.title.length}/100</div>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Fiyat (TL) *</label>
          <input type="number" min={0} className="input mt-1" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="500000" />
        </div>
      </div>
    </div>
  );
}

function StepPublish({ form, setField, paymentMethod, setPaymentMethod, settings }: any) {
  const isAuction = form.listing_type === 'auction' || form.listing_type === 'premium_auction';
  const auctionFee = settings?.premium_auction_fee || 100;
  const walletBalance = settings?.wallet_min_balance || 0;

  return (
    <div>
      <h2 className="text-xl font-extrabold text-slate-900 mb-1">Yayın Tipi & Ödeme</h2>
      <p className="text-sm text-slate-500 mb-5">Ücretsiz ilan veya açık arttırma seçin</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setField('listing_type', 'free')}
          className={cn('p-5 rounded-xl border-2 text-left',
            form.listing_type === 'free' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white')}
        >
          <Sparkles className={cn('h-6 w-6 mb-2', form.listing_type === 'free' ? 'text-brand-600' : 'text-slate-500')} />
          <div className="font-bold">Ücretsiz İlan</div>
          <div className="text-xs text-slate-500 mt-1">Standart ilan, 30 gün yayında. Ödeme yok.</div>
        </button>

        <button
          type="button"
          onClick={() => setField('listing_type', 'auction')}
          className={cn('p-5 rounded-xl border-2 text-left',
            form.listing_type === 'auction' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white')}
        >
          <Gavel className={cn('h-6 w-6 mb-2', form.listing_type === 'auction' ? 'text-amber-600' : 'text-slate-500')} />
          <div className="font-bold">Açık Arttırma</div>
          <div className="text-xs text-slate-500 mt-1">Canlı açık arttırma. {auctionFee} TL ücret.</div>
        </button>

        <button
          type="button"
          onClick={() => setField('listing_type', 'premium_auction')}
          className={cn('p-5 rounded-xl border-2 text-left',
            form.listing_type === 'premium_auction' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white')}
        >
          <Sparkles className={cn('h-6 w-6 mb-2', form.listing_type === 'premium_auction' ? 'text-purple-600' : 'text-slate-500')} />
          <div className="font-bold flex items-center gap-1">Premium İlan <span className="badge bg-purple-100 text-purple-700 text-xs">YENİ</span></div>
          <div className="text-xs text-slate-500 mt-1">Açık arttırma + reklam alanlarında boost. {auctionFee * 2} TL ücret.</div>
        </button>
      </div>

      {isAuction && (
        <div>
          <h3 className="font-bold text-slate-900 mb-3">Ödeme Yöntemi</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              className={cn('p-4 rounded-xl border-2 text-left',
                paymentMethod === 'wallet' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white')}
            >
              <Wallet className={cn('h-5 w-5 mb-2', paymentMethod === 'wallet' ? 'text-emerald-600' : 'text-slate-500')} />
              <div className="font-bold text-sm">Cüzdan</div>
              <div className="text-xs text-slate-500 mt-1">Bakiye: ₺{walletBalance}</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={cn('p-4 rounded-xl border-2 text-left',
                paymentMethod === 'card' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white')}
            >
              <CreditCard className={cn('h-5 w-5 mb-2', paymentMethod === 'card' ? 'text-brand-600' : 'text-slate-500')} />
              <div className="font-bold text-sm">Kredi/Banka Kartı</div>
              <div className="text-xs text-slate-500 mt-1">₺{auctionFee} (3D Secure)</div>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('bank')}
              className={cn('p-4 rounded-xl border-2 text-left',
                paymentMethod === 'bank' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white')}
            >
              <Banknote className={cn('h-5 w-5 mb-2', paymentMethod === 'bank' ? 'text-blue-600' : 'text-slate-500')} />
              <div className="font-bold text-sm">Banka Transferi</div>
              <div className="text-xs text-slate-500 mt-1">₺{auctionFee} (EFT/Havale)</div>
            </button>
          </div>
        </div>
      )}

      {!isAuction && form.listing_type !== 'premium_auction' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="inline h-4 w-4 mr-1" /> Ücretsiz ilan için ödeme gerekmez. İlanı oluşturmak için "İlanı Oluştur" butonuna tıklayın.
        </div>
      )}
    </div>
  );
}
