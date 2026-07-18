import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Car, Bike, Upload, X, Check } from 'lucide-react';
import { supabase, BUCKETS } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useCities, useDistricts } from '../lib/useLocationData';
import VehicleCascadeWizard, { type CascadeValue } from '../components/VehicleCascadeWizard';


// ==================== TYPES ====================
type VehicleType = 'otomobil' | 'suv_pickup' | 'elektrikli' | 'minivan_panelvan' | 'ticari' | 'motorsiklet_utv_atv';
type BodyType = 'sedan' | 'hatchback' | 'station wagon' | 'coupe' | 'cabrio';
type FuelType = 'benzin' | 'dizel' | 'lpg' | 'elektrik' | 'hibrit';
type TransmissionType = 'manuel' | 'otomatik' | 'yarı_otomatik';
type ListingType = 'free' | 'auction' | 'premium_auction';
type SubVehicleType = 'motorsiklet' | 'utv' | 'atv';
// (artık kullanılmıyor ama type tanımı kalsın ileride gerekirse)
void (null as unknown as SubVehicleType);
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
  // Yeni alanlar (Migration 55)
  vehicle_condition: '' | 'sifir' | 'ikinci_el';
  plate_number: string;
  plate_country: string;
  garanti_durumu: '' | 'var' | 'yok' | 'bitmis';
  ilk_sahibi: boolean | null;
  takasa_uygun: boolean | null;
  tramer_durumu: '' | 'bilinmiyor' | 'yok' | 'var' | 'agir_hasarli';
  tramer_tutari: string;
  sub_model: string;
  engine_size_label: string;
  fuel_type_label: string;
  // Donanım (opsiyonel - JSON array olarak)
  equipment: {
    interior: string[];
    entertainment: string[];
    safety: string[];
    exterior: string[];
  };
  // İletişim
  contact_preference: '' | 'phone_message' | 'phone_only' | 'message_only';
  contact_phone: string;
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
  vehicle_condition: '',
  plate_number: '',
  plate_country: 'TR',
  garanti_durumu: '',
  ilk_sahibi: null,
  takasa_uygun: null,
  tramer_durumu: '',
  tramer_tutari: '',
  sub_model: '',
  engine_size_label: '',
  fuel_type_label: '',
  equipment: { interior: [], entertainment: [], safety: [], exterior: [] },
  contact_preference: '',
  contact_phone: '',
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
  // Yeni cascade wizard state
  const [cascade, setCascade] = useState<CascadeValue>({
    year: null, fuel: null, brand: null, model: null, engine: null, subModel: null,
  });

  // Yönlendirme için state + useEffect (hooks kuralı: tüm hooks'lar return'den önce)
  const [shouldRedirect, setShouldRedirect] = useState(false);
  useEffect(() => {
    if (shouldRedirect) {
      navigate('/profil/ilanlarim');
      setShouldRedirect(false);
    }
  }, [shouldRedirect, navigate]);

  // Test amaçlı cüzdan bakiyesi (production'da Supabase'den çekilecek)
  const [walletBalance] = useState(500);

  const isMotorcycle = form.vehicle_type === 'motorsiklet_utv_atv';
  const isAuction = form.listing_type === 'auction' || form.listing_type === 'premium_auction';
  const fee = form.listing_type === 'premium_auction' ? 200 : 100;

  const citiesQuery = useCities();
  const districtsQuery = useDistricts(form.city);

  useEffect(() => {
    setForm(f => ({ ...f, model_id: '' }));
  }, [form.brand_id]);

  useEffect(() => {
    setForm(f => ({ ...f, brand_id: '', model_id: '', engine_size_id: '' }));
  }, [form.vehicle_type]);

  // Cascade → Form senkronizasyonu
  useEffect(() => {
    setForm(f => ({
      ...f,
      brand_id: cascade.brand?.id ?? '',
      model_id: cascade.model?.id ?? '',
      year: cascade.year ? String(cascade.year) : f.year,
      fuel: (cascade.fuel as FuelType) ?? f.fuel,
    }));
  }, [cascade.brand?.id, cascade.model?.id, cascade.year, cascade.fuel]);

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
      case 1: return !!cascade.brand && !!cascade.model;
      case 2: return !!form.price && !!form.km && !!form.color && !!form.vehicle_condition && !!form.title && !!form.plate_number;
      case 3: return true; // Detaylar opsiyonel
      case 4: return true; // Boya opsiyonel
      case 5: return form.images.length > 0;
      case 6: return !!form.city && !!form.district && !!form.contact_preference;
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

  async function submitListing(currentUser: any) {
    if (!currentUser) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      // ÖNCE ilanı INSERT et (RPC ile — RLS bypass)
      const payload: any = {
        seller_id: currentUser.id,
        vehicle_type: form.vehicle_type,
        brand_id: form.brand_id,
        year: form.year ? Number(form.year) : null,
        sub_model: cascade.subModel?.name ?? null,
        engine_size_label: cascade.engine?.name ?? null,
        fuel_type_label: cascade.fuel ?? null,
        model_id: form.model_id,
        engine_size_id: form.engine_size_id,
        city: form.city,
        district: form.district,
        title: form.title,
        description: form.description,
        price: parseFloat(form.price),
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
      const { data: vehicleId, error: rpcErr } = await supabase.rpc('submit_vehicle_listing', {
        p_payload: payload,
      });
      if (rpcErr) throw rpcErr;
      if (!vehicleId) throw new Error('İlan eklendi ama veri dönmedi');
      const data = { id: vehicleId };

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
        {step === 1 && <VehicleCascadeWizard value={cascade} onChange={setCascade} />}
        {step === 2 && <StepListingInfo form={form} setField={setField} />}
        {step === 3 && <StepDetails form={form} setField={setField} />}
        {step === 4 && <StepPaintCondition form={form} setField={setField} />}
        {step === 5 && <StepImages form={form} setField={setField} userId={user.id} />}
        {step === 6 && <StepLocationContact form={form} setField={setField} cities={citiesQuery.data} districts={districtsQuery.data} />}
        {step === 7 && <StepPublishType form={form} setField={setField} paymentMethod={paymentMethod} setPaymentMethod={setPaymentMethod} walletBalance={walletBalance} fee={fee} />}
      </div>

      {/* Ödeme Modal'ları */}
      {/* Ödeme modal'ları ileride eklenecek (iyzico/PayTR entegrasyonu sonrası) */}

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
  const steps = ['Tip', 'Seçim', 'Bilgi', 'Detay', 'Boya', 'Foto', 'Konum', 'Yayın'];
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
// ==================== STEP 3: ENGINE ====================
function StepPaintCondition({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Boya, Değişen ve Tramer Bilgisi</h2>
      <p className="text-sm text-slate-500 mb-5">(Opsiyonel) Neredeyse tüm alıcıların dikkat ettiği bu bilginin doğru ve eksiksiz belirtilmesi önerilir.</p>

      {/* Boya/Değişen — kısa bilgilendirme */}
      <div className="rounded-lg border p-4 mb-4 bg-slate-50">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold">Boya ve Değişen Bilgisi</h3>
        </div>
        <p className="text-sm text-slate-600">
          İlan yayınlandıktan sonra, araç detay sayfasında boya/değişen diyagramını görebilirsiniz. Şimdilik
          bu adımı atlayabilir veya <span className="font-semibold text-red-600">Tümü Orijinal</span> olarak işaretleyebilirsiniz.
          Detaylı parça seçimi ilerleyen sürümlerde eklenecektir.
        </p>
        <label className="mt-3 flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="h-4 w-4" />
          <span className="text-sm font-medium">Tümü Orijinal</span>
        </label>
      </div>

      {/* Tramer */}
      <div className="rounded-lg border p-4">
        <h3 className="font-bold mb-3">Tramer Bilgisi</h3>
        <div className="flex flex-wrap gap-4 mb-3">
          {['bilinmiyor', 'yok', 'var', 'agir_hasarli'].map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="tramer_durumu"
                value={opt}
                checked={form.tramer_durumu === opt}
                onChange={(e) => setField('tramer_durumu', e.target.value)}
                className="h-4 w-4 accent-red-600"
              />
              <span className="text-sm">
                {opt === 'bilinmiyor' && 'Bilmiyorum'}
                {opt === 'yok' && 'Tramer Yok'}
                {opt === 'var' && 'Tramer Var'}
                {opt === 'agir_hasarli' && 'Ağır Hasarlı'}
              </span>
            </label>
          ))}
        </div>
        {(form.tramer_durumu === 'var' || form.tramer_durumu === 'agir_hasarli') && (
          <div>
            <label className="text-xs font-semibold uppercase text-slate-500">Tramer Tutarı</label>
            <div className="relative mt-1">
              <input
                type="number"
                className="input pr-12"
                value={form.tramer_tutari}
                onChange={(e) => setField('tramer_tutari', e.target.value)}
                placeholder="0"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">TL</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== STEP 6: ADRES + İLETİŞİM (YENİ) ====================
function StepLocationContact({ form, setField, cities, districts }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Adres & İletişim</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın konumu ve iletişim tercihiniz</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">İl *</label>
          <select
            className="input mt-1"
            value={form.city}
            onChange={(e) => setField('city', e.target.value)}
          >
            <option value="">Seçiniz</option>
            {(cities ?? []).map((c: any) => (
              <option key={c.id ?? c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">İlçe *</label>
          <select
            className="input mt-1"
            value={form.district}
            onChange={(e) => setField('district', e.target.value)}
            disabled={!form.city}
          >
            <option value="">Seçiniz</option>
            {(districts ?? []).map((d: any) => (
              <option key={d.id ?? d.name} value={d.name}>{d.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Semt</label>
          <input
            type="text"
            className="input mt-1"
            placeholder="Opsiyonel"
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="font-bold mb-3">İletişim Tercihi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className={cn(
            'rounded-lg border-2 p-3 cursor-pointer flex items-center gap-3 transition',
            form.contact_preference === 'phone_message' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-400'
          )}>
            <input
              type="radio"
              name="contact"
              value="phone_message"
              checked={form.contact_preference === 'phone_message'}
              onChange={(e) => setField('contact_preference', e.target.value)}
              className="h-4 w-4 accent-red-600"
            />
            <div>
              <div className="font-semibold text-sm">Telefon + Mesaj</div>
              <div className="text-xs text-slate-500">Telefon numaram ve mesaj ile ulaşılsın.</div>
            </div>
          </label>

          <label className={cn(
            'rounded-lg border-2 p-3 cursor-pointer flex items-center gap-3 transition',
            form.contact_preference === 'phone_only' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-400'
          )}>
            <input
              type="radio"
              name="contact"
              value="phone_only"
              checked={form.contact_preference === 'phone_only'}
              onChange={(e) => setField('contact_preference', e.target.value)}
              className="h-4 w-4 accent-red-600"
            />
            <div>
              <div className="font-semibold text-sm">Sadece Telefon</div>
              <div className="text-xs text-slate-500">Yalnızca telefon numaram üzerinden ulaşılsın.</div>
            </div>
          </label>

          <label className={cn(
            'rounded-lg border-2 p-3 cursor-pointer flex items-center gap-3 transition',
            form.contact_preference === 'message_only' ? 'border-red-500 bg-red-50' : 'border-slate-200 hover:border-slate-400'
          )}>
            <input
              type="radio"
              name="contact"
              value="message_only"
              checked={form.contact_preference === 'message_only'}
              onChange={(e) => setField('contact_preference', e.target.value)}
              className="h-4 w-4 accent-red-600"
            />
            <div>
              <div className="font-semibold text-sm">Sadece Mesaj</div>
              <div className="text-xs text-slate-500">Sadece site üzerinden mesaj ile ulaşılsın.</div>
            </div>
          </label>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold uppercase text-slate-500">Telefon Numarası</label>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-sm text-slate-600">+90</span>
            <input
              type="tel"
              className="input flex-1"
              value={form.contact_phone}
              onChange={(e) => setField('contact_phone', e.target.value)}
              placeholder="5445146498"
              maxLength={10}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== STEP 7: İLAN TÜRÜ + YAYINLA (YENİ) ====================
function StepPublishType({ form, setField, paymentMethod, setPaymentMethod, walletBalance, fee }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">İlan Türü Seçimi</h2>
      <p className="text-sm text-slate-500 mb-5">İlanınızı nasıl yayınlamak istiyorsunuz?</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className={cn(
          'rounded-xl border-2 p-5 cursor-pointer transition',
          form.listing_type === 'auction' || form.listing_type === 'premium_auction'
            ? 'border-red-500 bg-red-50'
            : 'border-slate-200 hover:border-slate-400'
        )}>
          <input
            type="radio"
            name="listing_type"
            value="auction"
            checked={form.listing_type === 'auction'}
            onChange={(e) => setField('listing_type', e.target.value)}
            className="sr-only"
          />
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl font-bold">🏷️</div>
            <div>
              <div className="font-bold text-base">Açık Arttırma İlanı Ver</div>
              <div className="text-sm text-slate-600 mt-1">Aracınız açık arttırmaya çıkar, en yüksek teklifi veren kazanır.</div>
              <div className="text-xs text-red-600 font-semibold mt-2">Ücret: {fee} TL</div>
            </div>
          </div>
        </label>

        <label className={cn(
          'rounded-xl border-2 p-5 cursor-pointer transition',
          form.listing_type === 'free' ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-400'
        )}>
          <input
            type="radio"
            name="listing_type"
            value="free"
            checked={form.listing_type === 'free'}
            onChange={(e) => setField('listing_type', e.target.value)}
            className="sr-only"
          />
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">✓</div>
            <div>
              <div className="font-bold text-base">Ücretsiz İlan Ver</div>
              <div className="text-sm text-slate-600 mt-1">Aracınız klasik ilan olarak yayınlanır, sabit fiyat ile satılır.</div>
              <div className="text-xs text-emerald-600 font-semibold mt-2">Ücretsiz</div>
            </div>
          </div>
        </label>
      </div>

      {/* Ödeme (auction seçildiyse) */}
      {(form.listing_type === 'auction' || form.listing_type === 'premium_auction') && (
        <div className="mt-6 rounded-xl border p-5 bg-slate-50">
          <h3 className="font-bold mb-3">Ödeme Yöntemi</h3>
          <div className="space-y-2">
            <PaymentOption
              value="wallet"
              current={paymentMethod}
              onSelect={setPaymentMethod}
              label="Cüzdandan Öde"
              detail={`Bakiye: ${walletBalance} TL ${walletBalance >= fee ? '✓' : '✗ Yetersiz'}`}
            />
            <PaymentOption
              value="card"
              current={paymentMethod}
              onSelect={setPaymentMethod}
              label="Kredi/Banka Kartı"
              detail="iyzico güvencesiyle"
            />
            <PaymentOption
              value="bank"
              current={paymentMethod}
              onSelect={setPaymentMethod}
              label="Banka Havalesi / EFT"
              detail="Onay sonrası aktif olur"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentOption({ value, current, onSelect, label, detail }: any) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        'w-full text-left p-3 rounded-lg border-2 flex items-center gap-3 transition',
        selected ? 'border-red-500 bg-white' : 'border-slate-200 hover:border-slate-300'
      )}
    >
      <div className={cn(
        'h-5 w-5 rounded-full border-2 flex items-center justify-center',
        selected ? 'border-red-600' : 'border-slate-300'
      )}>
        {selected && <div className="h-2.5 w-2.5 rounded-full bg-red-600" />}
      </div>
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-slate-500">{detail}</div>
      </div>
    </button>
  );
}
