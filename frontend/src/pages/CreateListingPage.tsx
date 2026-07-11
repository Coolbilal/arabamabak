import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Car, Bike, Upload, X, Check, Wallet, CreditCard, Building2 } from 'lucide-react';
import { supabase, BUCKETS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useCities, useDistricts } from '../lib/useLocationData';
import {
  useBrands,
  useModels,
  useEngineSizes,
  useMotorcycleBrands,
  useMotorcycleModels,
} from '../lib/hooks/useVehicleData';

// ==================== TYPES ====================
type VehicleType = 'otomobil' | 'suv_pickup' | 'elektrikli' | 'minivan_panelvan' | 'ticari' | 'motorsiklet_utv_atv';
type BodyType = 'sedan' | 'hatchback' | 'station wagon' | 'coupe' | 'cabrio';
type FuelType = 'benzin' | 'dizel' | 'lpg' | 'elektrik' | 'hibrit';
type TransmissionType = 'manuel' | 'otomatik' | 'yarı_otomatik';
type ListingType = 'free' | 'auction' | 'premium_auction';
type SubVehicleType = 'motorsiklet' | 'utv' | 'atv';
type PaymentMethod = 'wallet' | 'card' | 'bank' | null;

interface ListingForm {
  vehicle_type: VehicleType | '';
  brand_id: string;
  model_id: string;
  engine_size_id: string;
  year: string;
  km: string;
  fuel: FuelType;
  transmission: TransmissionType;
  body: BodyType | '';
  color: string;
  sub_type: SubVehicleType | '';
  damage_record: boolean;
  damage_detail: string;
  disabled_plate: boolean;
  exchange_accepted: boolean;
  description: string;
  images: string[];
  city: string;
  district: string;
  title: string;
  price: string;
  listing_type: ListingType;
}

const INITIAL_FORM: ListingForm = {
  vehicle_type: '',
  brand_id: '',
  model_id: '',
  engine_size_id: '',
  year: '',
  km: '',
  fuel: 'benzin',
  transmission: 'manuel',
  body: '',
  color: '',
  sub_type: '',
  damage_record: false,
  damage_detail: '',
  disabled_plate: false,
  exchange_accepted: false,
  description: '',
  images: [],
  city: '',
  district: '',
  title: '',
  price: '',
  listing_type: 'free',
};

const VEHICLE_TYPES: { value: VehicleType; label: string; icon: any; desc: string }[] = [
  { value: 'otomobil', label: 'Otomobil', icon: Car, desc: 'Sedan, hatchback, station wagon, coupe, cabrio' },
  { value: 'suv_pickup', label: 'SUV / Pickup', icon: Car, desc: 'SUV ve pickup araçlar' },
  { value: 'elektrikli', label: 'Elektrikli', icon: Car, desc: 'Tamamen elektrikli araçlar' },
  { value: 'minivan_panelvan', label: 'Minivan / Panelvan', icon: Car, desc: 'Geniş iç hacimli araçlar' },
  { value: 'ticari', label: 'Ticari', icon: Car, desc: 'Kamyon, kamyonet, otobüs' },
  { value: 'motorsiklet_utv_atv', label: 'Motosiklet / UTV / ATV', icon: Bike, desc: 'Motor, UTV, ATV' },
];

const BODY_TYPES: { value: BodyType; label: string }[] = [
  { value: 'sedan', label: 'Sedan' },
  { value: 'hatchback', label: 'Hatchback' },
  { value: 'station wagon', label: 'Station Wagon' },
  { value: 'coupe', label: 'Coupe' },
  { value: 'cabrio', label: 'Cabrio' },
];

const FUEL_TYPES: { value: FuelType; label: string }[] = [
  { value: 'benzin', label: 'Benzin' },
  { value: 'dizel', label: 'Dizel' },
  { value: 'lpg', label: 'LPG & Benzin' },
  { value: 'elektrik', label: 'Elektrik' },
  { value: 'hibrit', label: 'Hibrit' },
];

const TRANSMISSION_TYPES: { value: TransmissionType; label: string }[] = [
  { value: 'manuel', label: 'Manuel' },
  { value: 'otomatik', label: 'Otomatik' },
  { value: 'yarı_otomatik', label: 'Yarı Otomatik' },
];

const SUB_VEHICLE_TYPES: { value: SubVehicleType; label: string }[] = [
  { value: 'motorsiklet', label: 'Motosiklet' },
  { value: 'utv', label: 'UTV' },
  { value: 'atv', label: 'ATV' },
];

// ==================== MAIN COMPONENT ====================
export default function CreateListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ListingForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);

  // Test amaçlı cüzdan bakiyesi (production'da Supabase'den çekilecek)
  const [walletBalance] = useState(500);

  const isMotorcycle = form.vehicle_type === 'motorsiklet_utv_atv';
  const isAuction = form.listing_type === 'auction' || form.listing_type === 'premium_auction';
  const fee = form.listing_type === 'premium_auction' ? 200 : 100;

  const brandsQuery = isMotorcycle ? useMotorcycleBrands() : useBrands(form.vehicle_type);
  const modelsQuery = isMotorcycle ? useMotorcycleModels(form.brand_id) : useModels(form.brand_id);
  const engineSizesQuery = useEngineSizes();
  const citiesQuery = useCities();
  const districtsQuery = useDistricts(form.city);

  useEffect(() => {
    setForm(f => ({ ...f, model_id: '' }));
  }, [form.brand_id]);

  useEffect(() => {
    setForm(f => ({ ...f, brand_id: '', model_id: '', engine_size_id: '' }));
  }, [form.vehicle_type]);

  if (!user) {
    navigate('/giris?next=/ilan-ver');
    return null;
  }

  function setField<K extends keyof ListingForm>(key: K, value: ListingForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function nextStep() { setStep(s => Math.min(s + 1, 7)); }
  function prevStep() { setStep(s => Math.max(s - 1, 0)); }

  function canGoNext(): boolean {
    switch (step) {
      case 0: return !!form.vehicle_type;
      case 1: return !!form.brand_id && !!form.model_id;
      case 2: return !!form.engine_size_id;
      case 3: {
        if (!form.year || !form.km) return false;
        if (isMotorcycle) return !!form.sub_type && !!form.color;
        return !!form.body && !!form.color;
      }
      case 4: return form.damage_record ? !!form.damage_detail : true;
      case 5: return form.images.length > 0;
      case 6: return !!form.city && !!form.district && !!form.title && !!form.price;
      case 7: {
        if (form.listing_type === 'free') return true;
        return !!paymentMethod;
      }
      default: return true;
    }
  }

  // Cüzdan bakiyesini düş (ilan INSERT olduktan SONRA, gerçek vehicle_id ile)
  async function deductWallet(amount: number, vehicleId: string): Promise<boolean> {
    if (!user) {
      setError('Giriş yapmalısınız');
      return false;
    }
    const { error: rpcErr } = await supabase.rpc('deduct_wallet_for_listing', {
      p_user_id: user.id,
      p_amount: amount,
      p_vehicle_id: vehicleId,
      p_description: 'İlan verme ücreti (ön ödeme)',
    });
    if (rpcErr) {
      setError(`Cüzdan işlemi başarısız: ${rpcErr.message}`);
      return false;
    }
    return true;
  }

  // Yönlendirme için state (useEffect içinde navigate)
  const [shouldRedirect, setShouldRedirect] = useState(false);
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/profil/ilanlarim');
      setShouldRedirect(false);
    }
  }, [shouldRedirect, navigate]);

  async function submitListing(currentUser: any) {
    if (!currentUser) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // ÖNCE ilanı INSERT et
      const payload: any = {
        seller_id: currentUser.id,
        vehicle_type: form.vehicle_type,
        brand_id: form.brand_id,
        model_id: form.model_id,
        engine_size_id: form.engine_size_id,
        city: form.city,
        district: form.district,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
        year: parseInt(form.year),
        km: parseInt(form.km),
        fuel: form.fuel,
        transmission: form.transmission,
        body: isMotorcycle ? null : form.body,
        color: form.color,
        damage_record: form.damage_record,
        damage_detail: form.damage_record ? form.damage_detail : null,
        exchange_accepted: form.exchange_accepted,
        engine_power_kw: null,
        listing_type: form.listing_type,
        status: 'pending',
      };
      const { data, error: insertErr } = await supabase
        .from('vehicles')
        .insert(payload)
        .select()
        .single();
      if (insertErr) throw insertErr;
      if (!data) throw new Error('İlan eklendi ama veri dönmedi');

      // INSERT sonrası cüzdan düş (gerçek vehicle_id ile)
      if (isAuction && paymentMethod === 'wallet') {
        const ok = await deductWallet(fee, data.id);
        if (!ok) {
          // Cüzdan düşmedi, ilanı sil (rollback)
          await supabase.from('vehicles').delete().eq('id', data.id);
          setSubmitting(false);
          return;
        }
      }

      // Fotoğrafları vehicle_images tablosuna ekle
      console.log('DEBUG form.images:', form.images, 'vehicle_id:', data.id);
      if (form.images && form.images.length > 0) {
        const imageRows = form.images.map((url, idx) => ({
          vehicle_id: data.id,
          url,
          sort_order: idx,
        }));
        console.log('DEBUG imageRows:', imageRows);
        const { data: imgData, error: imgErr } = await supabase
          .from('vehicle_images')
          .insert(imageRows)
          .select();
        console.log('DEBUG insert result:', { imgData, imgErr });
        if (imgErr) console.error('Fotoğraf kayıt hatası:', imgErr);
      } else {
        console.warn('DEBUG form.images boş veya undefined!');
      }

      // BAŞARI MESAJI
      setSuccess('İlanınız başarıyla oluşturuldu! İlan admin onayından sonra yayına alınacaktır.');
      setSubmitting(false);

      // 4 saniye sonra yönlendir (useEffect ile)
      setTimeout(() => {
        setShouldRedirect(true);
      }, 4000);
    } catch (e: any) {
      setError(e.message || 'İlan eklenirken hata oluştu');
      setSubmitting(false);
    }
  }

  async function handlePublish() {
    if (!user) {
      navigate('/giris?next=/ilan-ver');
      return;
    }
    if (form.listing_type === 'free') {
      await submitListing(user);
      return;
    }
    if (!paymentMethod) {
      setError('Lütfen bir ödeme yöntemi seçin');
      return;
    }
    // Hangi yöntem seçildiyse o modalı göster
    if (paymentMethod === 'card') {
      // 3D Modal açılır, onaylayınca submitListing çağrılır
      return;
    }
    if (paymentMethod === 'bank') {
      // Banka modalı açılır, onaylayınca submitListing çağrılır
      return;
    }
    // Cüzdan: direkt düş ve ekle
    await submitListing(user);
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-extrabold mb-2">İlan Ver</h1>
      <ProgressBar step={step} />

      {success && (
        <div className="mt-6 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl text-green-900 flex items-start gap-4 shadow-lg">
          <div className="h-12 w-12 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0">
            <Check className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <div className="text-3xl font-extrabold text-green-900 mb-1">Başarılı!</div>
            <div className="text-base text-green-800">{success}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        {step === 0 && <StepType form={form} setField={setField} />}
        {step === 1 && <StepBrand form={form} setField={setField} brands={brandsQuery.data} models={modelsQuery.data} />}
        {step === 2 && <StepEngine form={form} setField={setField} engines={engineSizesQuery.data} />}
        {step === 3 && (isMotorcycle
          ? <StepMotorcycleSpecs form={form} setField={setField} />
          : <StepCarSpecs form={form} setField={setField} />)}
        {step === 4 && <StepCondition form={form} setField={setField} />}
        {step === 5 && <StepImages form={form} setField={setField} userId={user.id} />}
        {step === 6 && <StepLocation form={form} setField={setField} cities={citiesQuery.data} districts={districtsQuery.data} />}
        {step === 7 && <StepPublish form={form} setField={setField} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} walletBalance={walletBalance} fee={fee} />}
      </div>

      {/* Ödeme Modal'ları */}
      {paymentMethod === 'card' && (
        <CardPaymentModal
          fee={fee}
          onCancel={() => setPaymentMethod(null)}
          onSuccess={() => { if (user) submitListing(user); }}
        />
      )}
      {paymentMethod === 'bank' && (
        <BankTransferModal
          fee={fee}
          onCancel={() => setPaymentMethod(null)}
          onSuccess={() => { if (user) submitListing(user); }}
        />
      )}

      <div className="mt-4 flex justify-between">
        <button onClick={prevStep} disabled={step === 0} className="btn-ghost disabled:opacity-30">
          <ChevronLeft className="inline h-4 w-4 mr-1" /> Geri
        </button>
        {step < 7 ? (
          <button onClick={nextStep} disabled={!canGoNext()} className="btn-primary disabled:opacity-30">
            İleri <ChevronRight className="inline h-4 w-4 ml-1" />
          </button>
        ) : (
          <button onClick={handlePublish} disabled={submitting} className="btn-primary disabled:opacity-50">
            {submitting ? 'Yayınlanıyor...' : 'İlanı Yayınla'} <Check className="inline h-4 w-4 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
}

// ==================== PROGRESS BAR ====================
function ProgressBar({ step }: { step: number }) {
  const steps = ['Tip', 'Marka', 'Motor', 'Teknik', 'Hasar', 'Foto', 'Konum', 'Yayın'];
  return (
    <div className="flex gap-1">
      {steps.map((label, i) => (
        <div key={i} className="flex-1">
          <div className={cn('h-1.5 rounded', i <= step ? 'bg-brand-500' : 'bg-slate-200')} />
          <div className={cn('text-xs mt-1', i <= step ? 'text-brand-600 font-semibold' : 'text-slate-400')}>
            {i + 1}. {label}
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== STEP 1: TYPE ====================
function StepType({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Araç Tipi</h2>
      <p className="text-sm text-slate-500 mb-5">İlan vermek istediğiniz araç tipini seçin</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {VEHICLE_TYPES.map(({ value, label, icon: Icon, desc }) => (
          <button
            key={value}
            onClick={() => setField('vehicle_type', value)}
            className={cn(
              'p-4 rounded-xl border-2 text-left transition',
              form.vehicle_type === value
                ? 'border-brand-500 bg-brand-50'
                : 'border-slate-200 bg-white hover:border-slate-300'
            )}
          >
            <Icon className={cn('h-6 w-6 mb-2', form.vehicle_type === value ? 'text-brand-600' : 'text-slate-500')} />
            <div className="font-bold">{label}</div>
            <div className="text-xs text-slate-500 mt-1">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ==================== STEP 2: BRAND & MODEL ====================
function StepBrand({ form, setField, brands, models }: any) {
  if (!brands) return <div className="text-slate-500">Markalar yükleniyor...</div>;
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Marka & Model</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın marka ve modelini seçin</p>
      <div className="space-y-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Marka *</label>
          <select className="input mt-1" value={form.brand_id} onChange={e => setField('brand_id', e.target.value)}>
            <option value="">Marka seçin</option>
            {brands.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Model *</label>
          <select
            className="input mt-1"
            value={form.model_id}
            onChange={e => setField('model_id', e.target.value)}
            disabled={!form.brand_id}
          >
            <option value="">{form.brand_id ? 'Model seçin' : 'Önce marka seçin'}</option>
            {models?.map((m: any) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 3: ENGINE ====================
function StepEngine({ form, setField, engines }: any) {
  if (!engines) return <div className="text-slate-500">Motor seçenekleri yükleniyor...</div>;
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Motor Hacmi</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın motor hacmini seçin</p>
      <div>
        <select className="input" value={form.engine_size_id} onChange={e => setField('engine_size_id', e.target.value)}>
          <option value="">Motor hacmi seçin</option>
          {engines.map((e: any) => <option key={e.id} value={e.id}>{e.displacement}</option>)}
        </select>
      </div>
    </div>
  );
}

// ==================== STEP 4A: CAR SPECS ====================
function StepCarSpecs({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Teknik Özellikler</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın teknik bilgileri</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yıl *</label>
          <input type="number" min={1950} max={new Date().getFullYear()} className="input mt-1" value={form.year} onChange={e => setField('year', e.target.value)} placeholder="2020" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">KM *</label>
          <input type="number" min={0} className="input mt-1" value={form.km} onChange={e => setField('km', e.target.value)} placeholder="50000" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yakıt *</label>
          <select className="input mt-1" value={form.fuel} onChange={e => setField('fuel', e.target.value)}>
            {FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Vites *</label>
          <select className="input mt-1" value={form.transmission} onChange={e => setField('transmission', e.target.value)}>
            {TRANSMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Kasa Tipi *</label>
          <select className="input mt-1" value={form.body} onChange={e => setField('body', e.target.value)}>
            <option value="">Kasa seçin</option>
            {BODY_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Renk *</label>
          <input className="input mt-1" value={form.color} onChange={e => setField('color', e.target.value)} placeholder="Beyaz, Siyah, Kırmızı..." />
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 4B: MOTORCYCLE SPECS ====================
function StepMotorcycleSpecs({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Teknik Özellikler</h2>
      <p className="text-sm text-slate-500 mb-5">Motosiklet / UTV / ATV bilgileri</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Tip *</label>
          <select className="input mt-1" value={form.sub_type} onChange={e => setField('sub_type', e.target.value)}>
            <option value="">Tip seçin</option>
            {SUB_VEHICLE_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yıl *</label>
          <input type="number" min={1950} max={new Date().getFullYear()} className="input mt-1" value={form.year} onChange={e => setField('year', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">KM *</label>
          <input type="number" min={0} className="input mt-1" value={form.km} onChange={e => setField('km', e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Yakıt *</label>
          <select className="input mt-1" value={form.fuel} onChange={e => setField('fuel', e.target.value)}>
            <option value="benzin">Benzin</option>
            <option value="elektrik">Elektrik</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Vites *</label>
          <select className="input mt-1" value={form.transmission} onChange={e => setField('transmission', e.target.value)}>
            {TRANSMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Renk *</label>
          <input className="input mt-1" value={form.color} onChange={e => setField('color', e.target.value)} placeholder="Kırmızı, Siyah..." />
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 5: CONDITION ====================
function StepCondition({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Hasar & Açıklama</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın durumu hakkında bilgi</p>
      <div className="space-y-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.damage_record} onChange={e => setField('damage_record', e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">Hasar kaydı var</span>
        </label>
        {form.damage_record && (
          <textarea className="input" rows={3} value={form.damage_detail} onChange={e => setField('damage_detail', e.target.value)} placeholder="Hasar detayını açıklayın..." />
        )}
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.disabled_plate} onChange={e => setField('disabled_plate', e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">Engelli plakalı</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.exchange_accepted} onChange={e => setField('exchange_accepted', e.target.checked)} className="h-4 w-4" />
          <span className="text-sm font-medium">Takas kabul ediyorum</span>
        </label>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Açıklama</label>
          <textarea className="input mt-1" rows={5} value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Aracınız hakkında detaylı bilgi verin..." />
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 6: IMAGES ====================
function StepImages({ form, setField, userId }: any) {
  const [uploading, setUploading] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !userId) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKETS.VEHICLE_IMAGES)
          .upload(path, file);
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from(BUCKETS.VEHICLE_IMAGES).getPublicUrl(path);
        urls.push(pub.publicUrl);
      }
      setField('images', [...form.images, ...urls]);
    } catch (err: any) {
      alert('Yükleme hatası: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setField('images', form.images.filter((_: any, i: number) => i !== idx));
  }

  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Fotoğraflar</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın fotoğraflarını yükleyin (en az 1 adet)</p>
      <div className="grid grid-cols-3 gap-3">
        {form.images.map((url: string, i: number) => (
          <div key={i} className="relative aspect-square">
            <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
            <button onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label className="aspect-square border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-slate-400">
          <Upload className="h-6 w-6 text-slate-400 mb-1" />
          <span className="text-xs text-slate-500">{uploading ? 'Yükleniyor...' : 'Fotoğraf Ekle'}</span>
          <input type="file" accept="image/*" multiple onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>
    </div>
  );
}

// ==================== STEP 7: LOCATION ====================
function StepLocation({ form, setField, cities, districts }: any) {
  if (!cities) return <div className="text-slate-500">Şehirler yükleniyor...</div>;
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Konum & Başlık</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın konumu ve ilan başlığı</p>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">İl *</label>
            <select className="input mt-1" value={form.city} onChange={e => setField('city', e.target.value)}>
              <option value="">İl seçin</option>
              {cities.map((c: any) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">İlçe *</label>
            <select className="input mt-1" value={form.district} onChange={e => setField('district', e.target.value)} disabled={!form.city}>
              <option value="">{form.city ? 'İlçe seçin' : 'Önce il seçin'}</option>
              {districts?.map((d: any) => <option key={d.id} value={d.name}>{d.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">İlan Başlığı *</label>
          <input className="input mt-1" value={form.title} onChange={e => setField('title', e.target.value)} placeholder="Örn: 2020 BMW 320i M Sport Hatasız Boyasız" />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Fiyat (TL) *</label>
          <input type="number" min={0} className="input mt-1" value={form.price} onChange={e => setField('price', e.target.value)} placeholder="500000" />
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 8: PUBLISH ====================
function StepPublish({ form, setField, paymentMethod, setPaymentMethod, walletBalance, fee }: any) {
  const isAuction = form.listing_type === 'auction' || form.listing_type === 'premium_auction';
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Yayın Tipi</h2>
      <p className="text-sm text-slate-500 mb-5">İlanınızı nasıl yayınlamak istiyorsunuz?</p>
      <div className="space-y-3">
        <button
          onClick={() => { setField('listing_type', 'free'); setPaymentMethod(null); }}
          className={cn(
            'w-full p-4 rounded-xl border-2 text-left transition',
            form.listing_type === 'free' ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
          )}
        >
          <div className="font-bold">Ücretsiz İlan</div>
          <div className="text-sm text-slate-500 mt-1">Standart yayın, ücret yok</div>
        </button>
        <button
          onClick={() => setField('listing_type', 'auction')}
          className={cn(
            'w-full p-4 rounded-xl border-2 text-left transition',
            form.listing_type === 'auction' ? 'border-amber-500 bg-amber-50' : 'border-slate-200 bg-white'
          )}
        >
          <div className="font-bold">Açık Arttırma</div>
          <div className="text-sm text-slate-500 mt-1">Canlı açık arttırma, 100 TL ücret</div>
        </button>
        <button
          onClick={() => setField('listing_type', 'premium_auction')}
          className={cn(
            'w-full p-4 rounded-xl border-2 text-left transition',
            form.listing_type === 'premium_auction' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white'
          )}
        >
          <div className="font-bold">Premium Açık Arttırma</div>
          <div className="text-sm text-slate-500 mt-1">Öne çıkan açık arttırma, 200 TL ücret</div>
        </button>
      </div>

      {isAuction && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h3 className="font-bold text-amber-900 mb-3">Ödeme Yöntemi ({fee} TL)</h3>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition',
                paymentMethod === 'wallet' ? 'border-amber-500 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <Wallet className="h-5 w-5 text-amber-600" />
              <div className="flex-1">
                <div className="font-semibold text-sm">Cüzdan</div>
                <div className="text-xs text-slate-500">Bakiyenden otomatik düşer</div>
              </div>
              <div className="text-sm font-bold text-amber-600">{walletBalance} TL</div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('card')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition',
                paymentMethod === 'card' ? 'border-amber-500 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <CreditCard className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold text-sm">Kredi / Banka Kartı</div>
                <div className="text-xs text-slate-500">3D Secure ile güvenli ödeme</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('bank')}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg border-2 text-left transition',
                paymentMethod === 'bank' ? 'border-amber-500 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
              )}
            >
              <Building2 className="h-5 w-5 text-amber-600" />
              <div>
                <div className="font-semibold text-sm">Banka Havalesi / EFT</div>
                <div className="text-xs text-slate-500">Dekont yükleyerek onay al</div>
              </div>
            </button>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-slate-50 rounded-lg text-sm text-slate-600">
        <strong>Özet:</strong> {form.title || '(Başlık girilmedi)'} — {form.price ? `${form.price} TL` : '(Fiyat belirtilmedi)'}
        <br />
        {form.city && form.district && <span>{form.city} / {form.district}</span>}
      </div>
    </div>
  );
}

// ==================== CARD PAYMENT MODAL ====================
function CardPaymentModal({ fee, onCancel, onSuccess }: { fee: number; onCancel: () => void; onSuccess: () => void }) {
  const [step, setStep] = useState<'card' | '3ds' | 'processing'>('card');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [cardName, setCardName] = useState('');
  const [otp, setOtp] = useState('');

  function handleCardSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cardNumber || !expiry || !cvc || !cardName) {
      alert('Tüm alanları doldurun');
      return;
    }
    setStep('3ds');
  }

  function handle3DSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length !== 6) {
      alert('Lütfen 6 haneli SMS kodunu girin');
      return;
    }
    setStep('processing');
    setTimeout(() => {
      onSuccess();
    }, 2000);
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 to-slate-700 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* 3D Secure Bank Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">3D</span>
              </div>
              <div>
                <div className="text-sm font-semibold">3D Secure ile Güvenli Ödeme</div>
                <div className="text-xs opacity-80">Verified by Visa • MasterCard SecureCode</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs opacity-80">Toplam</div>
              <div className="text-lg font-bold">{fee} TL</div>
            </div>
          </div>
        </div>

        {/* Step 1: Kart Bilgileri */}
        {step === 'card' && (
          <form onSubmit={handleCardSubmit} className="p-6">
            <h3 className="text-lg font-bold mb-4 text-slate-900">Kart Bilgileri</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Kart Üzerindeki İsim</label>
                <input
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value.toUpperCase())}
                  className="input mt-1"
                  placeholder="AD SOYAD"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Kart Numarası</label>
                <input
                  type="text"
                  maxLength={19}
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim())}
                  className="input mt-1 font-mono"
                  placeholder="0000 0000 0000 0000"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">Son Kullanma</label>
                  <input
                    type="text"
                    maxLength={5}
                    value={expiry}
                    onChange={e => setExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2'))}
                    className="input mt-1 font-mono"
                    placeholder="AA/YY"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase text-slate-500">CVC</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={cvc}
                    onChange={e => setCvc(e.target.value.replace(/\D/g, ''))}
                    className="input mt-1 font-mono"
                    placeholder="000"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 flex items-start gap-2">
              <div className="h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold">i</div>
              <div>Devam ettiğinizde kartınızın bağlı olduğu bankanın güvenlik sayfasına yönlendirileceksiniz.</div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={onCancel} className="flex-1 btn-ghost">İptal</button>
              <button type="submit" className="flex-1 btn-primary">Devam Et</button>
            </div>
          </form>
        )}

        {/* Step 2: 3D Secure OTP */}
        {step === '3ds' && (
          <form onSubmit={handle3DSubmit} className="p-6">
            <div className="text-center mb-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-2xl">📱</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900">Telefonunuza Gelen Kodu Girin</h3>
              <p className="text-sm text-slate-500 mt-1">3D Secure doğrulama için bankanıza kayıtlı telefon numarasına SMS gönderdik.</p>
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                className="input mt-1 text-center text-2xl font-mono tracking-widest"
                placeholder="• • • • • •"
                autoFocus
              />
              <div className="text-xs text-slate-500 text-center mt-2">Test: 123456 girin</div>
            </div>
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Kart:</span>
                <span className="font-mono">{cardNumber || '****'}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span>Tutar:</span>
                <span className="font-bold">{fee} TL</span>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setStep('card')} className="flex-1 btn-ghost">Geri</button>
              <button type="submit" className="flex-1 btn-primary">Doğrula ve Öde</button>
            </div>
          </form>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="p-8 text-center">
            <div className="h-16 w-16 mx-auto rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Ödeme İşleniyor...</h3>
            <p className="text-sm text-slate-500 mt-1">Lütfen bekleyin, işleminiz gerçekleştiriliyor.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== BANK TRANSFER MODAL ====================
function BankTransferModal({ fee, onCancel, onSuccess }: { fee: number; onCancel: () => void; onSuccess: () => void }) {
  const [receipt, setReceipt] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!receipt) {
      alert('Lütfen dekont yükleyin');
      return;
    }
    setUploading(true);
    setTimeout(() => {
      setUploading(false);
      onSuccess();
    }, 1500);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-2">Banka Havalesi / EFT</h3>
        <p className="text-sm text-slate-600 mb-3">Aşağıdaki IBAN'a <strong>{fee} TL</strong> yatırın ve dekontu yükleyin.</p>
        <div className="bg-slate-50 p-3 rounded-lg mb-4 text-sm space-y-1">
          <div><strong>Banka:</strong> Ziraat Bankası</div>
          <div className="font-mono text-xs"><strong>IBAN:</strong> TR12 0001 0012 3456 7890 1234 56</div>
          <div><strong>Alıcı:</strong> Arabamabak A.Ş.</div>
          <div><strong>Tutar:</strong> {fee} TL</div>
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold uppercase text-slate-500">Dekont Yükle *</label>
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={e => setReceipt(e.target.files?.[0] || null)}
            className="input mt-1"
          />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} disabled={uploading} className="flex-1 btn-ghost disabled:opacity-50">İptal</button>
          <button type="submit" disabled={uploading || !receipt} className="flex-1 btn-primary disabled:opacity-50">
            {uploading ? 'Yükleniyor...' : 'Dekontu Yükle ve Yayınla'}
          </button>
        </div>
      </form>
    </div>
  );
}
