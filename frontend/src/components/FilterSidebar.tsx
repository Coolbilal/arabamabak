import { useEffect, useRef, useState } from 'react';
import { Filter, RefreshCw } from 'lucide-react';
import { BODY_LABELS, FUEL_LABELS, TRANSMISSION_LABELS, type BodyType, type FuelType, type TransmissionType, type VehicleBrand, type VehicleModel } from '../lib/types';
import { useCities } from '../lib/useLocationData';
import { useEngineSizes } from '../lib/useEngineSizes';

export interface FilterState {
  brand_id: string;
  model_id: string;
  year_min: string;
  year_max: string;
  km_min: string;
  km_max: string;
  price_min: string;
  price_max: string;
  fuel: FuelType[];
  transmission: TransmissionType | '';
  body: BodyType | '';
  city: string;
  damage_record: '' | 'yes' | 'no';
  engine_size_id: string;
}

export const EMPTY_FILTERS: FilterState = {
  brand_id: '',
  model_id: '',
  year_min: '',
  year_max: '',
  km_min: '',
  km_max: '',
  price_min: '',
  price_max: '',
  fuel: [],
  transmission: '',
  body: '',
  city: '',
  damage_record: '',
  engine_size_id: '',
};

interface Props {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  brands: VehicleBrand[];
  models: VehicleModel[];
}

export default function FilterSidebar({ filters, onChange, brands, models }: Props) {
  const [local, setLocal] = useState<FilterState>(filters);
  const debounceRef = useRef<number | null>(null);
  const cities = useCities();
  const engineSizes = useEngineSizes();

  // Dışarıdan gelen filter değişimlerini iç state'e yansıt
  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  // Marka değiştiğinde model sıfırlansın
  useEffect(() => {
    if (local.brand_id && local.model_id) {
      const m = models.find((mm) => mm.id === local.model_id);
      if (m && m.brand_id !== local.brand_id) {
        setLocal((p) => ({ ...p, model_id: '' }));
      }
    }
  }, [local.brand_id, local.model_id, models]);

  // 300ms debounce
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      onChange(local);
    }, 300);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const filteredModels = local.brand_id
    ? models.filter((m) => m.brand_id === local.brand_id && m.is_active)
    : [];

  const update = (patch: Partial<FilterState>) => setLocal((p) => ({ ...p, ...patch }));
  const toggleFuel = (f: FuelType) =>
    setLocal((p) => ({
      ...p,
      fuel: p.fuel.includes(f) ? p.fuel.filter((x) => x !== f) : [...p.fuel, f],
    }));

  const clear = () => {
    setLocal(EMPTY_FILTERS);
    onChange(EMPTY_FILTERS);
  };

  return (
    <aside className="card sticky top-20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="h-4 w-4" /> Filtrele
        </div>
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-brand-600"
        >
          <RefreshCw className="h-3 w-3" /> Temizle
        </button>
      </div>

      <div className="space-y-4">
        {/* Marka */}
        <Field label="Marka">
          <select
            className="input"
            value={local.brand_id}
            onChange={(e) => update({ brand_id: e.target.value, model_id: '' })}
          >
            <option value="">Tümü</option>
            {brands
              .filter((b) => b.is_active)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
          </select>
        </Field>

        {/* Model */}
        <Field label="Model">
          <select
            className="input disabled:bg-slate-50 disabled:text-slate-400"
            value={local.model_id}
            onChange={(e) => update({ model_id: e.target.value })}
            disabled={!local.brand_id}
          >
            <option value="">{local.brand_id ? 'Tümü' : 'Önce marka seçin'}</option>
            {filteredModels
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
          </select>
        </Field>

        {/* Yıl */}
        <Field label="Yıl">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1950}
              max={new Date().getFullYear()}
              placeholder="Min"
              className="input"
              value={local.year_min}
              onChange={(e) => update({ year_min: e.target.value })}
            />
            <input
              type="number"
              inputMode="numeric"
              min={1950}
              max={new Date().getFullYear()}
              placeholder="Max"
              className="input"
              value={local.year_max}
              onChange={(e) => update({ year_max: e.target.value })}
            />
          </div>
        </Field>

        {/* KM */}
        <Field label="KM">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min"
              className="input"
              value={local.km_min}
              onChange={(e) => update({ km_min: e.target.value })}
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Max"
              className="input"
              value={local.km_max}
              onChange={(e) => update({ km_max: e.target.value })}
            />
          </div>
        </Field>

        {/* Fiyat */}
        <Field label="Fiyat (₺)">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Min"
              className="input"
              value={local.price_min}
              onChange={(e) => update({ price_min: e.target.value })}
            />
            <input
              type="number"
              inputMode="numeric"
              min={0}
              placeholder="Max"
              className="input"
              value={local.price_max}
              onChange={(e) => update({ price_max: e.target.value })}
            />
          </div>
        </Field>

        {/* Yakıt */}
        <Field label="Yakıt">
          <div className="space-y-1.5">
            {(Object.keys(FUEL_LABELS) as FuelType[]).map((f) => (
              <label key={f} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={local.fuel.includes(f)}
                  onChange={() => toggleFuel(f)}
                />
                {FUEL_LABELS[f]}
              </label>
            ))}
          </div>
        </Field>

        {/* Vites */}
        <Field label="Vites">
          <div className="space-y-1.5">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={local.transmission === ''}
                onChange={() => update({ transmission: '' })}
                name="transmission"
              />
              Farketmez
            </label>
            {(Object.keys(TRANSMISSION_LABELS) as TransmissionType[]).map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={local.transmission === t}
                  onChange={() => update({ transmission: t })}
                  name="transmission"
                />
                {TRANSMISSION_LABELS[t]}
              </label>
            ))}
          </div>
        </Field>

        {/* Motor Hacmi */}
        <Field label="Motor Hacmi">
          <select
            className="input"
            value={local.engine_size_id}
            onChange={(e) => update({ engine_size_id: e.target.value })}
          >
            <option value="">Tümü</option>
            {engineSizes.data?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displacement}
              </option>
            ))}
          </select>
        </Field>

        {/* Kasa tipi */}
        <Field label="Kasa Tipi">
          <select
            className="input"
            value={local.body}
            onChange={(e) => update({ body: e.target.value as BodyType | '' })}
          >
            <option value="">Tümü</option>
            {(Object.keys(BODY_LABELS) as BodyType[]).map((b) => (
              <option key={b} value={b}>
                {BODY_LABELS[b]}
              </option>
            ))}
          </select>
        </Field>

        {/* Şehir */}
        <Field label="Şehir">
          <select className="input" value={local.city} onChange={(e) => update({ city: e.target.value })}>
            <option value="">Tümü</option>
            {cities.data?.map((c) => (
              <option key={c.id} value={c.name}>
                {c.plate_code.toString().padStart(2, '0')} - {c.name}
              </option>
            ))}
          </select>
        </Field>

        {/* Hasar kaydı */}
        <Field label="Hasar Kaydı">
          <div className="flex gap-3 text-sm">
            {[
              { v: '' as const, l: 'Farketmez' },
              { v: 'yes' as const, l: 'Var' },
              { v: 'no' as const, l: 'Yok' },
            ].map((o) => (
              <label key={o.v || 'any'} className="flex items-center gap-1.5 text-slate-700">
                <input
                  type="radio"
                  className="h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500"
                  checked={local.damage_record === o.v}
                  onChange={() => update({ damage_record: o.v })}
                  name="damage_record"
                />
                {o.l}
              </label>
            ))}
          </div>
        </Field>
      </div>
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </label>
      {children}
    </div>
  );
}
