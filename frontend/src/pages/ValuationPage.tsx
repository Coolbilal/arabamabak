import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp, BarChart3, Search, Loader2, AlertCircle, Car, Award, DollarSign, Calendar,
  Wrench,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { formatPrice, cn } from '../lib/utils';

interface Brand { id: string; name: string }
interface Model { id: string; name: string; brand_id: string }

interface SoldVehicle {
  final_price: number;
  sold_at: string;
  year: number;
  km: number;
  damage_record: boolean;
  brand_id: string;
  model_id: string;
  brand?: { name: string };
  model?: { name: string };
}

interface MonthStat {
  month: string;
  label: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface DamageStat {
  type: 'Hasarsız' | 'Hasarlı';
  avg: number;
  count: number;
}

export default function ValuationPage() {
  const [brandId, setBrandId] = useState('');
  const [modelId, setModelId] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [searched, setSearched] = useState<{ brandId: string; modelId: string; yearFrom: string; yearTo: string } | null>(null);

  // Markalar
  const brands = useQuery({
    queryKey: ['valuation-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands').select('id, name').eq('is_active', true).order('name');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
    staleTime: 5 * 60_000,
  });

  // Modeller (marka seçilince)
  const models = useQuery({
    queryKey: ['valuation-models', brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models').select('id, name, brand_id')
        .eq('brand_id', brandId).eq('is_active', true).order('name');
      if (error) throw error;
      return (data ?? []) as Model[];
    },
    staleTime: 5 * 60_000,
  });

  // Satılan araçlar (sadece searched olduğunda)
  const sold = useQuery({
    queryKey: ['valuation-stats', searched],
    enabled: !!searched,
    queryFn: async () => {
      if (!searched) return [];
      let q = supabase
        .from('vehicles')
        .select(`
          final_price, sold_at, year, km, damage_record, brand_id, model_id,
          brand:vehicle_brands(name),
          model:vehicle_models(name)
        `)
        .eq('brand_id', searched.brandId)
        .eq('status', 'sold')
        .not('final_price', 'is', null)
        .not('sold_at', 'is', null);
      if (searched.modelId) q = q.eq('model_id', searched.modelId);
      if (searched.yearFrom) q = q.gte('year', Number(searched.yearFrom));
      if (searched.yearTo) q = q.lte('year', Number(searched.yearTo));
      const { data, error } = await q.order('sold_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as SoldVehicle[];
    },
  });

  const handleSearch = () => {
    if (!brandId) return;
    setSearched({ brandId, modelId, yearFrom, yearTo });
  };

  // ---- İstatistikler ----
  const stats = useMemo(() => {
    const data = sold.data ?? [];
    if (data.length === 0) return null;

    const prices = data.map((d) => Number(d.final_price)).filter((p) => p > 0);
    if (prices.length === 0) return null;

    const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];

    // Aylık grupla
    const byMonth: Record<string, number[]> = {};
    data.forEach((d) => {
      if (!d.sold_at) return;
      const dt = new Date(d.sold_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = [];
      byMonth[key].push(Number(d.final_price));
    });
    const monthly: MonthStat[] = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12) // son 12 ay
      .map(([key, vals]) => {
        const [y, m] = key.split('-');
        const date = new Date(Number(y), Number(m) - 1);
        const labels = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
        return {
          month: key,
          label: `${labels[date.getMonth()]} ${y}`,
          avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
          min: Math.min(...vals),
          max: Math.max(...vals),
          count: vals.length,
        };
      });

    // Hasar durumuna göre
    const dmg: Record<string, number[]> = { hasarsiz: [], hasarli: [] };
    data.forEach((d) => {
      const arr = d.damage_record ? dmg.hasarli : dmg.hasarsiz;
      arr.push(Number(d.final_price));
    });
    const damageStats: DamageStat[] = ([
      {
        type: 'Hasarsız',
        avg: dmg.hasarsiz.length ? Math.round(dmg.hasarsiz.reduce((a, b) => a + b, 0) / dmg.hasarsiz.length) : 0,
        count: dmg.hasarsiz.length,
      },
      {
        type: 'Hasarlı',
        avg: dmg.hasarli.length ? Math.round(dmg.hasarli.reduce((a, b) => a + b, 0) / dmg.hasarli.length) : 0,
        count: dmg.hasarli.length,
      },
    ] as DamageStat[]).filter((d) => d.count > 0);

    // Yıllık ortalama
    const byYear: Record<number, number[]> = {};
    data.forEach((d) => {
      const y = d.year;
      if (!byYear[y]) byYear[y] = [];
      byYear[y].push(Number(d.final_price));
    });
    const yearly = Object.entries(byYear)
      .map(([y, vals]) => ({
        year: Number(y),
        avg: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        count: vals.length,
      }))
      .sort((a, b) => a.year - b.year);

    return {
      totalSold: data.length,
      avg, min, max, median,
      monthly, damageStats, yearly,
      brandName: data[0]?.brand?.name,
      modelName: data[0]?.model?.name,
    };
  }, [sold.data]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-brand-600" /> Aracının Değerini Öğren
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Sitemizde gerçekleşen satış verilerine göre aracının piyasa değerini gör.
          Aylık ortalama, hasar durumu etkisi ve yıllık trend.
        </p>
      </div>

      {/* Filtre */}
      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
          <Search className="h-4 w-4" /> Araç Seç
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Marka *</label>
            <select
              className="input w-full"
              value={brandId}
              onChange={(e) => { setBrandId(e.target.value); setModelId(''); }}
            >
              <option value="">— Seç —</option>
              {(brands.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Model</label>
            <select
              className="input w-full"
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              disabled={!brandId}
            >
              <option value="">— Tüm Modeller —</option>
              {(models.data ?? []).map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Yıl (Alt)</label>
            <input
              type="number" placeholder="2010" className="input w-full"
              value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Yıl (Üst)</label>
            <input
              type="number" placeholder="2024" className="input w-full"
              value={yearTo} onChange={(e) => setYearTo(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={!brandId || sold.isLoading}
              className="btn-primary w-full"
            >
              {sold.isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              Değerle
            </button>
          </div>
        </div>
      </div>

      {/* Sonuçlar */}
      {!searched ? (
        <div className="card p-12 text-center">
          <Car className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-700 mt-3">Marka seç ve değerle</h3>
          <p className="text-sm text-slate-500 mt-1">Marka, model ve yıl seçtikten sonra gerçek satış verileriyle karşılaştırma yapabilirsin.</p>
        </div>
      ) : sold.isLoading ? (
        <div className="card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
        </div>
      ) : sold.isError ? (
        <div className="card p-6 flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" /> Veri yüklenemedi.
        </div>
      ) : !stats ? (
        <div className="card p-12 text-center">
          <AlertCircle className="h-10 w-10 text-amber-400 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-700 mt-3">Bu kriterlere uygun satış yok</h3>
          <p className="text-sm text-slate-500 mt-1">Farklı bir marka/model veya yıl aralığı deneyin.</p>
        </div>
      ) : (
        <>
          {/* Özet Kartlar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              icon={<BarChart3 className="h-4 w-4" />}
              label="Toplam Satış"
              value={`${stats.totalSold} araç`}
              color="bg-blue-50 text-blue-700"
            />
            <SummaryCard
              icon={<DollarSign className="h-4 w-4" />}
              label="Ortalama"
              value={formatPrice(stats.avg)}
              color="bg-emerald-50 text-emerald-700"
            />
            <SummaryCard
              icon={<Award className="h-4 w-4" />}
              label="En Yüksek"
              value={formatPrice(stats.max)}
              color="bg-amber-50 text-amber-700"
            />
            <SummaryCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="En Düşük"
              value={formatPrice(stats.min)}
              color="bg-slate-100 text-slate-700"
            />
          </div>

          {/* Aylık Trend Grafiği */}
          {stats.monthly.length > 0 && (
            <div className="card p-5">
              <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                Son 12 Ay Aylık Ortalama Satış Fiyatı
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                {stats.brandName} {stats.modelName && `· ${stats.modelName}`}
              </p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}K`} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: any) => formatPrice(Number(value))}
                      labelStyle={{ color: '#0f172a' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="avg" name="Ortalama" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="min" name="En Düşük" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                    <Line type="monotone" dataKey="max" name="En Yüksek" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Hasar Durumu */}
            {stats.damageStats.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-amber-600" />
                  Hasar Durumuna Göre Ortalama Fiyat
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.damageStats}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="type" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}K`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => formatPrice(Number(value))} />
                      <Bar dataKey="avg" name="Ortalama" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1">
                  {stats.damageStats.map((d) => (
                    <div key={d.type} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{d.type} ({d.count} araç)</span>
                      <span className="font-semibold text-slate-800">{formatPrice(d.avg)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Yıllık */}
            {stats.yearly.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  Yıllık Model Yılına Göre Ortalama
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.yearly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}K`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(value: any) => formatPrice(Number(value))} />
                      <Bar dataKey="avg" name="Ortalama" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 space-y-1">
                  {stats.yearly.map((y) => (
                    <div key={y.year} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">{y.year} ({y.count} araç)</span>
                      <span className="font-semibold text-slate-800">{formatPrice(y.avg)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="card p-4 bg-blue-50 border-blue-200 text-sm text-blue-900">
            <strong>ℹ Bilgi:</strong> Veriler sadece arabamabak üzerinden gerçekleşen satışlardan alınmaktadır. Gerçek piyasa değeri farklılık gösterebilir.
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="card p-3">
      <div className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium', color)}>
        {icon} {label}
      </div>
      <div className="text-xl font-extrabold text-slate-800 mt-1">{value}</div>
    </div>
  );
}
