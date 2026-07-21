import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Filter, Tag, Settings2, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type Category = {
  id: string;
  slug: string;
  name: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};

type Brand = {
  id: string;
  name: string;
  logo_url: string | null;
  is_active: boolean;
  sort_order: number;
};

type Model = {
  id: string;
  name: string;
  brand_id: string;
  is_active: boolean;
  sort_order: number;
};

type Trim = {
  id: string;
  name: string;
  model_id: string;
  is_active: boolean;
  sort_order: number;
};

export default function CatalogPage() {
  const [tab, setTab] = useState<'categories' | 'brands' | 'models' | 'trims'>('categories');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <Filter className="h-6 w-6" /> Filtreleme Yönetimi
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Anasayfa ve ilan verme sihirbazında kullanılan filtreleme alanlarını yönet.
        </p>
      </div>

      <div className="border-b border-slate-200 flex gap-1 mb-6 overflow-x-auto">
        <TabButton active={tab === 'categories'} onClick={() => setTab('categories')} icon={<Layers className="h-4 w-4" />}>
          Kategoriler
        </TabButton>
        <TabButton active={tab === 'brands'} onClick={() => setTab('brands')} icon={<Tag className="h-4 w-4" />}>
          Markalar
        </TabButton>
        <TabButton active={tab === 'models'} onClick={() => setTab('models')} icon={<Settings2 className="h-4 w-4" />}>
          Modeller
        </TabButton>
        <TabButton active={tab === 'trims'} onClick={() => setTab('trims')} icon={<Filter className="h-4 w-4" />}>
          Paketler
        </TabButton>
        <TabButton active={tab === 'engine-powers'} onClick={() => setTab('engine-powers')} icon={<Settings2 className="h-4 w-4" />}>
          Motor HP
        </TabButton>
      </div>

      {tab === 'categories' && <CategoriesPanel />}
      {tab === 'brands' && <BrandsPanel />}
      {tab === 'models' && <ModelsPanel />}
      {tab === 'trims' && <TrimsPanel />}
      {tab === 'engine-powers' && <EnginePowersPanel />}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2.5 font-semibold text-sm border-b-2 transition',
        active ? 'border-red-600 text-red-600' : 'border-transparent text-slate-600 hover:text-slate-900'
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* ---------- KATEGORİLER (Read-only) ---------- */
function CategoriesPanel() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [icon, setIcon] = useState('🚗');
  const [sortOrder, setSortOrder] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_categories')
        .select('id, slug, name, icon, sort_order, is_active')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('vehicle_categories')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-categories'] }),
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('vehicle_categories').insert({
        name: name.trim(),
        slug: slug.trim(),
        icon: icon.trim() || '🚗',
        sort_order: sortOrder,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-categories'] });
      setName('');
      setSlug('');
      setIcon('🚗');
      setSortOrder(10);
      setShowForm(false);
    },
  });

  // Slug otomatik olustur
  function autoSlug(t: string) {
    return t
      .toLowerCase()
      .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  if (isLoading) return <div className="text-center py-12 text-slate-500">Yükleniyor...</div>;

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold flex items-center gap-2">📂 Araç Kategorileri</h3>
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1 text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-red-700"
          >
            <Plus className="h-3.5 w-3.5" /> Yeni Kategori
          </button>
        </div>
        <p className="text-sm text-slate-600">
          Sabit kategorilerdir. Anasayfa sol sidebar filtresinde ve ilan verme sihirbazında kullanılır.
        </p>

        {showForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !slug.trim()) return;
              addMut.mutate();
            }}
            className="grid grid-cols-1 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t"
          >
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); if (!slug) setSlug(autoSlug(e.target.value)); }}
              placeholder="Kategori adı (örn. Elektrikli Araçlar)"
              className="sm:col-span-2 px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="slug (elektrikli-araclar)"
              className="px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm"
              required
            />
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🔋"
              className="px-3 py-2 border border-slate-300 rounded-lg text-center"
              maxLength={4}
            />
            <button type="submit" disabled={addMut.isPending} className="bg-red-600 text-white px-3 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
              {addMut.isPending ? 'Ekleniyor...' : 'Ekle'}
            </button>
            {addMut.isError && (
              <p className="text-sm text-red-600 sm:col-span-5">Hata: {(addMut.error as any)?.message}</p>
            )}
          </form>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {data?.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{c.icon}</span>
              <div>
                <div className="font-semibold text-sm">{c.name}</div>
                <div className="text-xs text-slate-500">{c.slug}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleMut.mutate({ id: c.id, current: c.is_active })}
              className={cn(
                'text-xs px-2 py-1 rounded',
                c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
              )}
            >
              {c.is_active ? 'Aktif' : 'Pasif'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- MARKALAR ---------- */
function BrandsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<Brand | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-brands'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, logo_url, is_active, sort_order')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; name: string }) => {
      if (payload.id) {
        const { error } = await supabase.from('vehicle_brands').update({ name: payload.name }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_brands').insert({ name: payload.name, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-brands'] });
      setName('');
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_brands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-brands'] }),
  });

  const toggleMut = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('vehicle_brands')
        .update({ is_active: !current })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-brands'] }),
  });

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Marka Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Marka Ekle</>}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            saveMut.mutate(editing ? { id: editing.id, name: name.trim() } : { name: name.trim() });
          }}
          className="flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marka adı (örn. BMW, Audi, Ford)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setName(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
        {saveMut.isError && (
          <p className="text-sm text-red-600 mt-2">Hata: {(saveMut.error as any)?.message}</p>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((b) => (
            <div key={b.id} className={cn('bg-white border rounded-lg p-3 flex items-center justify-between gap-2', b.is_active ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30')}>
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{b.name}</div>
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({ id: b.id, current: b.is_active })}
                  className={cn('text-xs px-2 py-0.5 rounded mt-1', b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}
                >
                  {b.is_active ? 'Aktif' : 'Pasif'}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { setEditing(b); setName(b.name); }}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded"
                  title="Düzenle"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`"${b.name}" markasını silmek istediğine emin misin?`)) {
                      deleteMut.mutate(b.id);
                    }
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- MODELLER ---------- */
function ModelsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [editing, setEditing] = useState<Model | null>(null);
  const [filterBrand, setFilterBrand] = useState('');

  const { data: brands } = useQuery({
    queryKey: ['vehicle-brands-active'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_brands')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order');
      return (data ?? []) as { id: string; name: string }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-models', filterBrand],
    queryFn: async () => {
      let q = supabase
        .from('vehicle_models')
        .select('id, name, brand_id, is_active, sort_order')
        .order('sort_order');
      if (filterBrand) q = q.eq('brand_id', filterBrand);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Model[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; name: string; brand_id: string }) => {
      if (payload.id) {
        const { error } = await supabase.from('vehicle_models').update({ name: payload.name, brand_id: payload.brand_id }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_models').insert({ name: payload.name, brand_id: payload.brand_id, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-models'] });
      setName('');
      setBrandId('');
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-models'] }),
  });

  const brandMap = new Map((brands ?? []).map((b) => [b.id, b.name]));

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Model Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Model Ekle</>}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !brandId) return;
            saveMut.mutate(editing ? { id: editing.id, name: name.trim(), brand_id: brandId } : { name: name.trim(), brand_id: brandId });
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select
            value={brandId}
            onChange={(e) => setBrandId(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg"
            required
          >
            <option value="">Marka seçin</option>
            {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Model adı (örn. 3 Serisi, A4, Focus)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={saveMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setName(''); setBrandId(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">Marka filtresi:</label>
        <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tümü</option>
          {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">{data?.length ?? 0} model</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg text-slate-500">
          Bu markaya ait model yok
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">{brandMap.get(m.brand_id) ?? '—'}</div>
                <div className="font-semibold truncate">{m.name}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setEditing(m); setName(m.name); setBrandId(m.brand_id); }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm(`"${m.name}" modelini silmek istediğine emin misin?`)) deleteMut.mutate(m.id); }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- TRIMLER (PAKETLER) ---------- */
function TrimsPanel() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [modelId, setModelId] = useState('');
  const [editing, setEditing] = useState<Trim | null>(null);
  const [filterModel, setFilterModel] = useState('');

  const { data: models } = useQuery({
    queryKey: ['vehicle-models-all'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, brand:vehicle_brands(name)')
        .order('name');
      return (data ?? []) as { id: string; name: string; brand_id: string; brand: { name: string } | null }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-trims', filterModel],
    queryFn: async () => {
      let q = supabase
        .from('vehicle_trims')
        .select('id, name, model_id, is_active, sort_order')
        .order('sort_order');
      if (filterModel) q = q.eq('model_id', filterModel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Trim[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; name: string; model_id: string }) => {
      if (payload.id) {
        const { error } = await supabase.from('vehicle_trims').update({ name: payload.name, model_id: payload.model_id }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_trims').insert({ name: payload.name, model_id: payload.model_id, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-trims'] });
      setName('');
      setModelId('');
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_trims').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-trims'] }),
  });

  const modelMap = new Map((models ?? []).map((m) => [m.id, `${m.brand?.name ?? '—'} ${m.name}`]));

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Paket Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Paket Ekle</>}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !modelId) return;
            saveMut.mutate(editing ? { id: editing.id, name: name.trim(), model_id: modelId } : { name: name.trim(), model_id: modelId });
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg flex-1" required>
            <option value="">Model seçin</option>
            {models?.map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Paket adı (örn. Comfort, Sport, M Sport, AMG)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={saveMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setName(''); setModelId(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">Model filtresi:</label>
        <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tümü</option>
          {models?.map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">{data?.length ?? 0} paket</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg text-slate-500">
          Bu modele ait paket yok
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">{modelMap.get(t.model_id) ?? '—'}</div>
                <div className="font-semibold truncate">{t.name}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setEditing(t); setName(t.name); setModelId(t.model_id); }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm(`"${t.name}" paketini silmek istediğine emin misin?`)) deleteMut.mutate(t.id); }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                  title="Sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- MOTOR HP'LERİ ---------- */
function EnginePowersPanel() {
  const qc = useQueryClient();
  const [hp, setHp] = useState('');
  const [modelId, setModelId] = useState('');
  const [editing, setEditing] = useState<{ id: string; hp: number; model_id: string } | null>(null);
  const [filterModel, setFilterModel] = useState('');

  const { data: models } = useQuery({
    queryKey: ['vehicle-models-for-hp'],
    queryFn: async () => {
      const { data } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, brand:vehicle_brands(name)')
        .order('name');
      return (data ?? []) as { id: string; name: string; brand_id: string; brand: { name: string } | null }[];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-engine-powers', filterModel],
    queryFn: async () => {
      let q = supabase
        .from('vehicle_engine_powers')
        .select('id, hp, model_id, is_active, sort_order')
        .order('hp');
      if (filterModel) q = q.eq('model_id', filterModel);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as { id: string; hp: number; model_id: string; is_active: boolean; sort_order: number }[];
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; hp: number; model_id: string }) => {
      if (payload.id) {
        const { error } = await supabase.from('vehicle_engine_powers').update({ hp: payload.hp, model_id: payload.model_id }).eq('id', payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('vehicle_engine_powers').insert({ hp: payload.hp, model_id: payload.model_id, is_active: true });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-engine-powers'] });
      setHp('');
      setModelId('');
      setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_engine_powers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-engine-powers'] }),
  });

  const modelMap = new Map((models ?? []).map((m) => [m.id, `${m.brand?.name ?? '—'} ${m.name}`]));

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Motor HP Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Motor HP Ekle</>}
        </h3>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const hpNum = parseInt(hp);
            if (!hpNum || !modelId) return;
            saveMut.mutate(editing ? { id: editing.id, hp: hpNum, model_id: modelId } : { hp: hpNum, model_id: modelId });
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg flex-1" required>
            <option value="">Model seçin</option>
            {models?.map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
          </select>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="number"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              placeholder="HP (örn. 184)"
              min="20"
              max="2000"
              className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
              required
            />
            <span className="text-sm text-slate-500 font-semibold">HP</span>
          </div>
          <button type="submit" disabled={saveMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setHp(''); setModelId(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label className="text-sm text-slate-600">Model filtresi:</label>
        <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tümü</option>
          {models?.map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">{data?.length ?? 0} motor</span>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg text-slate-500">
          Bu modele ait motor HP yok
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {data?.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 truncate">{modelMap.get(p.model_id) ?? '—'}</div>
                <div className="font-bold text-lg">{p.hp} <span className="text-sm text-slate-500">HP</span></div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => { setEditing({ id: p.id, hp: p.hp, model_id: p.model_id }); setHp(String(p.hp)); setModelId(p.model_id); }} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={() => { if (confirm(`"${p.hp} HP" motorunu silmek istediğine emin misin?`)) deleteMut.mutate(p.id); }}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Sil"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
