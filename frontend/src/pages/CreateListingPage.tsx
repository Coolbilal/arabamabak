import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Car, Bike, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { useCities, useDistricts } from '../lib/useLocationData';
import VehicleCascadeWizard, { type CascadeValue } from '../components/VehicleCascadeWizard';
import VehiclePaintDiagramEditor, { type PaintStatus } from '../components/VehiclePaintDiagramEditor';


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

  // Cascade â†’ Form senkronizasyonu
  useEffect(() => {
    setForm(f => ({
      ...f,
      brand_id: cascade.brand?.id ?? '',
      model_id: cascade.model?.id ?? '',
      year: cascade.year ? String(cascade.year) : f.year,
      fuel: (cascade.fuel === 'lpg_benzin' ? 'lpg' : cascade.fuel) as FuelType ?? f.fuel,
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
      // Ã–NCE ilanı INSERT et (RPC ile â€” RLS bypass)
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

      // BAÅARI MESAJI
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

      {/* Ã–deme Modal'ları */}
      {/* Ã–deme modal'ları ileride eklenecek (iyzico/PayTR entegrasyonu sonrası) */}

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
  const [paint, setPaint] = useState<Record<string, PaintStatus>>({});
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Boya, Değişen ve Tramer Bilgisi</h2>
      <p className="text-sm text-slate-500 mb-5">(Opsiyonel) Neredeyse tüm alıcıların dikkat ettiği bu bilginin doğru ve eksiksiz belirtilmesi önerilir.</p>

      {/* Boya/Değişen Diyagramı */}
      <div className="rounded-lg border p-4 mb-4">
        <h3 className="font-bold mb-3">Boya ve Değişen Bilgisi</h3>
        <VehiclePaintDiagramEditor value={paint} onChange={setPaint} />
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

// ==================== STEP 6: ADRES + İLETİÅİM (YENİ) ====================
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

// ==================== STEP 7: İLAN TÃœRÃœ + YAYINLA (YENİ) ====================
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
            <div className="h-10 w-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-xl font-bold">ğŸ·ï¸</div>
            <div>
              <div className="font-bold text-base">Açık Arttırma İlanı Ver</div>
              <div className="text-sm text-slate-600 mt-1">Aracınız açık arttırmaya çıkar, en yüksek teklifi veren kazanır.</div>
              <div className="text-xs text-red-600 font-semibold mt-2">Ãœcret: {fee} TL</div>
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
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xl font-bold">âœ“</div>
            <div>
              <div className="font-bold text-base">Ãœcretsiz İlan Ver</div>
              <div className="text-sm text-slate-600 mt-1">Aracınız klasik ilan olarak yayınlanır, sabit fiyat ile satılır.</div>
              <div className="text-xs text-emerald-600 font-semibold mt-2">Ãœcretsiz</div>
            </div>
          </div>
        </label>
      </div>

      {/* Ã–deme (auction seçildiyse) */}
      {(form.listing_type === 'auction' || form.listing_type === 'premium_auction') && (
        <div className="mt-6 rounded-xl border p-5 bg-slate-50">
          <h3 className="font-bold mb-3">Ã–deme Yöntemi</h3>
          <div className="space-y-2">
            <PaymentOption
              value="wallet"
              current={paymentMethod}
              onSelect={setPaymentMethod}
              label="Cüzdandan Ã–de"
              detail={`Bakiye: ${walletBalance} TL ${walletBalance >= fee ? 'âœ“' : 'âœ— Yetersiz'}`}
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

// ==================== STEP 2: İLAN BİLGİLERİ (YENİ) ====================
function StepListingInfo({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">İlan Bilgileri</h2>
      <p className="text-sm text-slate-500 mb-5">Aracınızın temel bilgileri</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Fiyat *</label>
          <div className="relative mt-1">
            <input type="number" min="0" className="input pr-12" value={form.price} onChange={(e) => setField('price', e.target.value)} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">TL</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Kilometre *</label>
          <div className="relative mt-1">
            <input type="number" min="0" className="input pr-12" value={form.km} onChange={(e) => setField('km', e.target.value)} placeholder="0" />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">KM</span>
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Renk *</label>
          <select className="input mt-1" value={form.color} onChange={(e) => setField('color', e.target.value)}>
            <option value="">Seçiniz</option>
            <option>Siyah</option><option>Beyaz</option><option>Gri</option><option>Gri (Açık)</option>
            <option>Gri (Koyu)</option><option>Gümüş</option><option>Lacivert</option><option>Mavi</option>
            <option>Kırmızı</option><option>Bordo</option><option>Yeşil</option><option>Yeşil (Açık)</option>
            <option>Sarı</option><option>Turuncu</option><option>Mor</option><option>Kahverengi</option><option>Bej</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Araç Durumu *</label>
          <select className="input mt-1" value={form.vehicle_condition} onChange={(e) => setField('vehicle_condition', e.target.value)}>
            <option value="">Seçiniz</option>
            <option value="ikinci_el">İkinci El</option>
            <option value="sifir">Sıfır</option>
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="text-xs font-semibold uppercase text-slate-500">Plaka *</label>
        <div className="mt-1 flex gap-2">
          <select className="input w-32" value={form.plate_country} onChange={(e) => setField('plate_country', e.target.value)}>
            <option value="TR">TR</option>
          </select>
          <input type="text" className="input flex-1" value={form.plate_number} onChange={(e) => setField('plate_number', e.target.value.toUpperCase())} placeholder="34 ABC 1234" maxLength={10} />
        </div>
        <p className="text-xs text-slate-500 mt-1">EİDS (Elektronik İlan Doğrulama Sistemi) üzerinden satış yetkisi sorgulamak için zorunludur.</p>
      </div>
      <div className="mt-4">
        <label className="text-xs font-semibold uppercase text-slate-500">İlan Başlığı *</label>
        <input type="text" className="input mt-1" value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="Sahibinden Hyundai i20 Troy 1.2 DOHC Team 2011 Model" maxLength={80} />
        <p className="text-xs text-slate-500 mt-1">{form.title.length} / 80 karakter</p>
      </div>
    </div>
  );
}

// ==================== STEP 3: DETAYLAR (YENİ) ====================
function StepDetails({ form, setField }: any) {
  return (
    <div>
      <h2 className="text-xl font-extrabold mb-1">Detaylar</h2>
      <p className="text-sm text-slate-500 mb-5">(Opsiyonel)</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Araç Türü</label>
          <select className="input mt-1" defaultValue="bireysel">
            <option value="bireysel">Bireysel</option>
            <option value="kurumsal">Kurumsal</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Plaka Uyruğu</label>
          <select className="input mt-1" defaultValue="TR">
            <option value="TR">(TR) Türkiye</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Garanti Durumu</label>
          <select className="input mt-1" value={form.garanti_durumu} onChange={(e) => setField('garanti_durumu', e.target.value)}>
            <option value="">Seçiniz</option>
            <option value="var">Var</option>
            <option value="yok">Yok</option>
            <option value="bitmis">Bitti</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Aracın İlk Sahibiyim</label>
          <select
            className="input mt-1"
            value={form.ilk_sahibi === null ? '' : form.ilk_sahibi ? 'evet' : 'hayir'}
            onChange={(e) => setField('ilk_sahibi', e.target.value === '' ? null : e.target.value === 'evet')}
          >
            <option value="">Seçiniz</option>
            <option value="evet">İlk Sahibiyim</option>
            <option value="hayir">İlk Sahibi Değilim</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Takasa Uygun</label>
          <select
            className="input mt-1"
            value={form.takasa_uygun === null ? '' : form.takasa_uygun ? 'evet' : 'hayir'}
            onChange={(e) => setField('takasa_uygun', e.target.value === '' ? null : e.target.value === 'evet')}
          >
            <option value="">Seçiniz</option>
            <option value="evet">Evet</option>
            <option value="hayir">Hayır</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-semibold uppercase text-slate-500">Vites</label>
          <select className="input mt-1" value={form.transmission} onChange={(e) => setField('transmission', e.target.value)}>
            <option value="manuel">Manuel</option>
            <option value="otomatik">Otomatik</option>
            <option value="yarı_otomatik">Yarı Otomatik</option>
          </select>
        </div>
      </div>
      {form.vehicle_type === 'otomobil' && (
        <div className="mt-4">
          <label className="text-xs font-semibold uppercase text-slate-500">Kasa Tipi</label>
          <select className="input mt-1" value={form.body} onChange={(e) => setField('body', e.target.value)}>
            <option value="">Seçiniz</option>
            <option value="sedan">Sedan</option>
            <option value="hatchback">Hatchback</option>
            <option value="station wagon">Station Wagon</option>
            <option value="coupe">Coupe</option>
            <option value="cabrio">Cabrio</option>
          </select>
        </div>
      )}
    </div>
  );
}

// ==================== STEP 5: FOTOÄRAFLAR (MEVCUT â€” DİL DEÄİÅTİ) ====================
function StepImages({ form, setField, userId }: any) {
  const [uploading, setUploading] = useState(false);

  async function handleFiles(filesList: FileList | null) {
    if (!filesList || filesList.length === 0 || !userId) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(filesList).slice(0, 15 - form.images.length)) {
        const ext = file.name.split('.').pop();
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('vehicle-images').upload(path, file);
        if (upErr) continue;
        const { data: pub } = supabase.storage.from('vehicle-images').getPublicUrl(path);
        if (pub?.publicUrl) urls.push(pub.publicUrl);
      }
      setField('images', [...form.images, ...urls]);
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
      <p className="text-sm text-slate-500 mb-5">Aracın farklı açılardan dış (ön, arka, yan) ve iç (motor, konsol, koltuklar, bagaj) fotoğraflarının eklenmesi önerilir.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <label className={cn("border-2 border-dashed border-red-300 bg-red-50/30 rounded-lg p-5 text-center cursor-pointer hover:border-red-500", uploading && "opacity-50 pointer-events-none")}>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} disabled={uploading} />
          <div className="text-3xl mb-1">{uploading ? 'â³' : 'ğŸ“·'}</div>
          <div className="font-semibold text-red-700">{uploading ? 'Yükleniyor...' : 'Fotoğraf Ekle'}</div>
          <div className="text-xs text-slate-500">{form.images.length}/15 yüklendi</div>
        </label>
        <button type="button" className="border rounded-lg p-5 text-center">
          <div className="text-3xl mb-1">ğŸ“±</div>
          <div className="font-semibold">Telefondan Ekle</div>
          <div className="text-xs text-slate-500">Bildirim ile</div>
        </button>
        <button type="button" className="border rounded-lg p-5 text-center">
          <div className="text-3xl mb-1">ğŸ“²</div>
          <div className="font-semibold">Telefondan Ekle</div>
          <div className="text-xs text-slate-500">QR Kod ile</div>
        </button>
      </div>

      <p className="text-sm text-slate-600 mb-3">Eklenen Fotoğraflar: <span className="font-bold">{form.images.length}</span> / 15</p>

      {form.images.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
          {form.images.map((url: string, i: number) => (
            <div key={i} className="relative group">
              <img src={url} alt="" className="w-full h-24 object-cover rounded" />
              <button type="button" onClick={() => removeImage(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* İlan Açıklaması */}
      <div className="mt-6">
        <label className="text-xs font-semibold uppercase text-slate-500">İlan Açıklaması</label>
        <textarea className="input mt-1" rows={5} value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Aracın ek özellikleri, satış ile ilgili özel şartlar ve durumlar ile ilgili bilgileri bu alana yazabilirsin." />
      </div>
    </div>
  );
}
