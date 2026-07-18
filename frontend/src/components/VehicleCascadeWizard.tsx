import { useEffect, useState } from 'react';
import { ChevronRight, Check, Car, Fuel, Calendar, Cog, Tag, Layers, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

type Brand = { id: string; name: string; logo_url?: string | null };
type Model = { id: string; name: string; brand_id: string };
type Engine = { id: string; name: string; displacement_cc?: number | null; power_hp?: number | null; model_id: string };
type SubModel = { id: string; name: string; model_id: string };

const CATEGORIES = [
  { code: 'otomobil', label: 'Otomobil', icon: '🚗' },
  { code: 'arazi_suv_pickup', label: 'Arazi, SUV, Pick-up', icon: '🚙' },
  { code: 'motosiklet', label: 'Motosiklet', icon: '🏍️' },
  { code: 'minivan_panelvan', label: 'Minivan & Panelvan', icon: '🚐' },
  { code: 'ticari', label: 'Ticari Araçlar', icon: '🚚' },
  { code: 'hasarli', label: 'Hasarlı Araçlar', icon: '⚠️' },
  { code: 'yedek_parca', label: 'Yedek Parça, Aksesuar', icon: '🔧' },
  { code: 'traktor', label: 'Traktör', icon: '🚜' },
  { code: 'tarim', label: 'Tarım & İş Makineleri', icon: '🌾' },
  { code: 'klasik', label: 'Klasik Araçlar', icon: '🏛️' },
];

const FUEL_TYPES = [
  { code: 'dizel', label: 'Dizel' },
  { code: 'benzin', label: 'Benzin' },
  { code: 'lpg_benzin', label: 'LPG & Benzin' },
  { code: 'hibrit', label: 'Hibrit' },
  { code: 'elektrik', label: 'Elektrik' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i);

export type CascadeValue = {
  year: number | null;
  fuel: string | null;
  brand: Brand | null;
  model: Model | null;
  engine: Engine | null;
  subModel: SubModel | null;
};

type Props = {
  value: CascadeValue;
  onChange: (v: CascadeValue) => void;
};

export default function VehicleCascadeWizard({ value, onChange }: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [subModels, setSubModels] = useState<SubModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingEngines, setLoadingEngines] = useState(false);
  const [loadingSubModels, setLoadingSubModels] = useState(false);

  // 1) Markalar (her zaman yükle, brand gerekince)
  useEffect(() => {
    setLoadingBrands(true);
    supabase
      .from('vehicle_brands')
      .select('id, name, logo_url')
      .order('name', { ascending: true })
      .then(({ data }) => {
        setBrands((data ?? []) as Brand[]);
        setLoadingBrands(false);
      });
  }, []);

  // 2) Modeller (marka seçilince)
  useEffect(() => {
    if (!value.brand) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    supabase
      .from('vehicle_models')
      .select('id, name, brand_id')
      .eq('brand_id', value.brand.id)
      .order('name', { ascending: true })
      .then(({ data }) => {
        setModels((data ?? []) as Model[]);
        setLoadingModels(false);
      });
  }, [value.brand]);

  // 3) Motorlar (model seçilince)
  useEffect(() => {
    if (!value.model) {
      setEngines([]);
      return;
    }
    setLoadingEngines(true);
    supabase
      .from('vehicle_model_engines')
      .select('id, name, displacement_cc, power_hp, model_id')
      .eq('model_id', value.model.id)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setEngines((data ?? []) as Engine[]);
        setLoadingEngines(false);
      });
  }, [value.model]);

  // 4) Alt Modeller (motor seçilince)
  useEffect(() => {
    if (!value.model) {
      setSubModels([]);
      return;
    }
    setLoadingSubModels(true);
    supabase
      .from('vehicle_sub_models')
      .select('id, name, model_id')
      .eq('model_id', value.model.id)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setSubModels((data ?? []) as SubModel[]);
        setLoadingSubModels(false);
      });
  }, [value.model]);

  function pick<K extends keyof CascadeValue>(key: K, val: CascadeValue[K]) {
    // Sıralı reset: sonraki adımları sıfırla
    const reset: Partial<CascadeValue> = {};
    if (key === 'year') {
      reset.fuel = null; reset.brand = null; reset.model = null; reset.engine = null; reset.subModel = null;
    } else if (key === 'fuel') {
      reset.brand = null; reset.model = null; reset.engine = null; reset.subModel = null;
    } else if (key === 'brand') {
      reset.model = null; reset.engine = null; reset.subModel = null;
    } else if (key === 'model') {
      reset.engine = null; reset.subModel = null;
    } else if (key === 'engine') {
      reset.subModel = null;
    }
    onChange({ ...value, [key]: val, ...reset });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-1">Araç Bilgileri</h2>
        <p className="text-sm text-slate-500">İlan vermek istediğiniz aracın bilgilerini seçin.</p>
      </div>

      {/* Breadcrumb */}
      <Breadcrumb value={value} onClear={(k) => pick(k, null)} />

      {/* 1) Yıl */}
      {(
        <Section icon={<Calendar className="h-4 w-4" />} title="Yıl" active={!value.year} done={!!value.year}>
          {value.year ? (
            <Pill onRemove={() => pick('year', null)}>{value.year}</Pill>
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y bg-white">
              {YEARS.map((y) => (
                <button
                  key={y}
                  onClick={() => pick('year', y)}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-700 font-medium"
                >
                  {y}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 3) Yakıt */}
      {value.year && (
        <Section icon={<Fuel className="h-4 w-4" />} title="Yakıt Tipi" active={!value.fuel} done={!!value.fuel}>
          {value.fuel ? (
            <Pill onRemove={() => pick('fuel', null)}>
              {FUEL_TYPES.find((f) => f.code === value.fuel)?.label}
            </Pill>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {FUEL_TYPES.map((f) => (
                <button
                  key={f.code}
                  onClick={() => pick('fuel', f.code)}
                  className="p-3 rounded-lg border border-slate-200 hover:border-red-500 hover:bg-red-50 transition text-sm font-medium"
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 4) Marka */}
      {value.fuel && (
        <Section icon={<Tag className="h-4 w-4" />} title="Marka" active={!value.brand} done={!!value.brand}>
          {value.brand ? (
            <Pill onRemove={() => pick('brand', null)}>
              {value.brand.logo_url && (
                <img src={value.brand.logo_url} alt="" className="h-4 w-4 inline mr-1 object-contain" />
              )}
              {value.brand.name}
            </Pill>
          ) : loadingBrands ? (
            <Spinner text="Markalar yükleniyor…" />
          ) : (
            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y bg-white">
              {brands.map((b) => (
                <button
                  key={b.id}
                  onClick={() => pick('brand', b)}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-700 font-medium flex items-center gap-2"
                >
                  {b.logo_url && <img src={b.logo_url} alt="" className="h-4 w-4 object-contain" />}
                  {b.name}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 5) Seri / Model */}
      {value.brand && (
        <Section icon={<Layers className="h-4 w-4" />} title="Seri / Model" active={!value.model} done={!!value.model}>
          {value.model ? (
            <Pill onRemove={() => pick('model', null)}>{value.model.name}</Pill>
          ) : loadingModels ? (
            <Spinner text="Modeller yükleniyor…" />
          ) : models.length === 0 ? (
            <EmptyState text="Bu marka için model bulunamadı." />
          ) : (
            <div className="max-h-72 overflow-y-auto border rounded-lg divide-y bg-white">
              {models.map((m) => (
                <button
                  key={m.id}
                  onClick={() => pick('model', m)}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-700 font-medium"
                >
                  {m.name}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 6) Motor */}
      {value.model && engines.length > 0 && (
        <Section icon={<Cog className="h-4 w-4" />} title="Motor" active={!value.engine} done={!!value.engine}>
          {value.engine ? (
            <Pill onRemove={() => pick('engine', null)}>{value.engine.name}</Pill>
          ) : loadingEngines ? (
            <Spinner text="Motorlar yükleniyor…" />
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y bg-white">
              {engines.map((e) => (
                <button
                  key={e.id}
                  onClick={() => pick('engine', e)}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-700 font-medium"
                >
                  {e.name}
                  {e.displacement_cc && <span className="text-xs text-slate-500 ml-2">({e.displacement_cc}cc{e.power_hp ? `, ${e.power_hp}hp` : ''})</span>}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 7) Donanım / Alt Model */}
      {value.model && (
        <Section icon={<Cog className="h-4 w-4" />} title="Donanım" active={!value.subModel} done={!!value.subModel}>
          {value.subModel ? (
            <Pill onRemove={() => pick('subModel', null)}>{value.subModel.name}</Pill>
          ) : loadingSubModels ? (
            <Spinner text="Donanım seçenekleri yükleniyor…" />
          ) : subModels.length === 0 ? (
            <EmptyState text="Bu model için donanım seçeneği bulunmuyor (opsiyonel)." />
          ) : (
            <div className="max-h-60 overflow-y-auto border rounded-lg divide-y bg-white">
              {subModels.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pick('subModel', s)}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 hover:text-red-700 font-medium"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* Sağdaki Araç Seçim Kartı */}
      {value.model && (
        <VehicleSummaryCard value={value} />
      )}
    </div>
  );
}

function Breadcrumb({ value, onClear }: { value: CascadeValue; onClear: (k: keyof CascadeValue) => void }) {
  const items: Array<{ label: string; onClick: () => void }> = [];
  if (value.year) {
    items.push({ label: String(value.year), onClick: () => onClear('year') });
  }
  if (value.fuel) {
    items.push({ label: FUEL_TYPES.find((f) => f.code === value.fuel)?.label ?? value.fuel, onClick: () => onClear('fuel') });
  }
  if (value.brand) items.push({ label: value.brand.name, onClick: () => onClear('brand') });
  if (value.model) items.push({ label: value.model.name, onClick: () => onClear('model') });
  if (value.engine) items.push({ label: value.engine.name, onClick: () => onClear('engine') });
  if (value.subModel) items.push({ label: value.subModel.name, onClick: () => onClear('subModel') });

  if (items.length === 0) return null;

  return (
    <div className="text-sm flex items-center flex-wrap gap-1 bg-red-50 px-3 py-2 rounded-lg text-red-700">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 opacity-60" />}
          <button onClick={it.onClick} className="hover:underline font-medium">
            {it.label}
          </button>
        </span>
      ))}
    </div>
  );
}

function Section({ icon, title, active, done, children }: { icon: React.ReactNode; title: string; active: boolean; done: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border p-4', done ? 'border-slate-200 bg-white' : active ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/50')}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('flex items-center justify-center h-7 w-7 rounded-full', done ? 'bg-emerald-500 text-white' : active ? 'bg-red-500 text-white' : 'bg-slate-200 text-slate-500')}>
          {done ? <Check className="h-4 w-4" /> : icon}
        </span>
        <h3 className={cn('font-bold', done ? 'text-slate-700' : 'text-slate-800')}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Pill({ onRemove, children }: { onRemove: () => void; children: React.ReactNode }) {
  return (
    <div className="inline-flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-sm font-medium">
      {children}
      <button onClick={onRemove} className="text-slate-500 hover:text-red-600">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return <div className="text-sm text-slate-500 p-3">{text}</div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded">{text}</div>;
}

function VehicleSummaryCard({ value }: { value: CascadeValue }) {
  const parts: string[] = [];
  if (value.year) parts.push(`${value.year} - ${value.year + 3}`);
  parts.push([value.brand?.name, value.model?.name, value.engine?.name, value.subModel?.name].filter(Boolean).join(' '));
  const fuelLabel = FUEL_TYPES.find((f) => f.code === value.fuel)?.label;
  if (fuelLabel) parts.push(fuelLabel);
  const detail = value.engine?.displacement_cc && value.engine?.power_hp
    ? `${value.engine.power_hp}hp, ${value.engine.displacement_cc}cc`
    : '';

  const title = parts.filter(Boolean).join(' ');
  return (
    <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50/30 p-5 flex items-start gap-4">
      <div className="h-12 w-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <Check className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <div className="font-bold text-emerald-900 mb-1">{title}</div>
        {detail && <div className="text-sm text-emerald-700">{detail}</div>}
        <div className="text-xs text-slate-500 mt-2">Araç Seçimini Tamamladın ✓</div>
      </div>
    </div>
  );
}
