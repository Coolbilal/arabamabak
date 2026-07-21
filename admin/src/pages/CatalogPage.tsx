import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Filter, Tag, Settings2, Layers, ChevronLeft, X } from 'lucide-react';
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

type EnginePower = {
  id: string;
  hp: number;
  model_id: string;
  is_active: boolean;
  sort_order: number;
};

type SubTab = 'brands' | 'models' | 'trims' | 'engine-powers';

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [subTab, setSubTab] = useState<SubTab>('brands');

  // Kategori seçilmemişse: kategori seçim ekranı
  if (!selectedCategory) {
    return <CategorySelector onSelect={setSelectedCategory} />;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb category={selectedCategory} onBack={() => setSelectedCategory(null)} />
      <h1 className="text-2xl font-extrabold flex items-center gap-2 mb-6">
        <span className="text-3xl">{selectedCategory.icon}</span>
        {selectedCategory.name}
      </h1>

      <div className="border-b border-slate-200 flex gap-1 mb-6 overflow-x-auto">
        <TabButton active={subTab === 'brands'} onClick={() => setSubTab('brands')} icon={<Tag className="h-4 w-4" />}>
          Markalar
        </TabButton>
        <TabButton active={subTab === 'models'} onClick={() => setSubTab('models')} icon={<Settings2 className="h-4 w-4" />}>
          Modeller
        </TabButton>
        <TabButton active={subTab === 'trims'} onClick={() => setSubTab('trims')} icon={<Filter className="h-4 w-4" />}>
          Paketler
        </TabButton>
        <TabButton active={subTab === 'engine-powers'} onClick={() => setSubTab('engine-powers')} icon={<Layers className="h-4 w-4" />}>
          Motor HP
        </TabButton>
      </div>

      {subTab === 'brands' && <BrandsPanel category={selectedCategory} />}
      {subTab === 'models' && <ModelsPanel category={selectedCategory} />}
      {subTab === 'trims' && <TrimsPanel category={selectedCategory} />}
      {subTab === 'engine-powers' && <EnginePowersPanel category={selectedCategory} />}
    </div>
  );
}

/* ---------- KATEGORİ SEÇİCİ (İlk Ekran) ---------- */
function CategorySelector({ onSelect }: { onSelect: (c: Category) => void }) {
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
      const { error } = await supabase.from('vehicle_categories').update({ is_active: !current }).eq('id', id);
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
      setName(''); setSlug(''); setIcon('🚗'); setSortOrder(10);
      setShowForm(false);
    },
  });

  function autoSlug(t: string) {
    return t.toLowerCase()
      .replace(/[ıİ]/g, 'i').replace(/[şŞ]/g, 's').replace(/[ğĞ]/g, 'g')
      .replace(/[üÜ]/g, 'u').replace(/[öÖ]/g, 'o').replace(/[çÇ]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Filter className="h-6 w-6" /> Filtreleme Yönetimi
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Bir kategori seçin, o kategorinin altına marka, model, paket ve motor HP ekleyin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Yeni Kategori
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !slug.trim()) return; addMut.mutate(); }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-2"
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
          {addMut.isError && <p className="text-sm text-red-600 sm:col-span-5">Hata: {(addMut.error as any)?.message}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map((c) => (
            <div
              key={c.id}
              className={cn(
                'bg-white border-2 rounded-xl p-5 transition cursor-pointer hover:shadow-md',
                c.is_active ? 'border-slate-200 hover:border-red-400' : 'border-slate-100 opacity-60'
              )}
              onClick={() => c.is_active && onSelect(c)}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{c.icon}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleMut.mutate({ id: c.id, current: c.is_active }); }}
                  className={cn('text-xs px-2 py-0.5 rounded', c.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600')}
                >
                  {c.is_active ? 'Aktif' : 'Pasif'}
                </button>
              </div>
              <h3 className="text-lg font-bold mb-1">{c.name}</h3>
              <p className="text-xs text-slate-500 mb-3">/{c.slug}</p>
              <div className="text-xs text-red-600 font-semibold flex items-center gap-1">
                Altına git →
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- BREADCRUMB ---------- */
function Breadcrumb({ category, onBack }: { category: Category; onBack: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm mb-4 text-slate-600">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-slate-600 hover:text-red-600">
        <ChevronLeft className="h-4 w-4" /> Filtreleme Yönetimi
      </button>
      <span className="text-slate-400">/</span>
      <span className="inline-flex items-center gap-1 font-semibold text-slate-900">
        <span>{category.icon}</span> {category.name}
      </span>
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

/* ---------- MARKA - KATEGORİ İLİŞKİSİ (yardımcı hook) ---------- */
function useBrandCategories() {
  return useQuery({
    queryKey: ['brand-categories-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brand_categories')
        .select('brand_id, category_id');
      if (error) throw error;
      return (data ?? []) as { brand_id: string; category_id: string }[];
    },
  });
}

function useCategories() {
  return useQuery({
    queryKey: ['vehicle-categories-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_categories')
        .select('id, slug, name, icon, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

/* ---------- MARKALAR (kategoriye özel) ---------- */
function BrandsPanel({ category }: { category: Category }) {
  const qc = useQueryClient();
  const brandCats = useBrandCategories();
  const [name, setName] = useState('');
  const [selectedCats, setSelectedCats] = useState<string[]>([category.id]);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [showExistingPicker, setShowExistingPicker] = useState(false);
  const [existingSearch, setExistingSearch] = useState('');

  // Kategoriye ait brand_id'leri al
  const categoryBrandIds = brandCats.data
    ?.filter((bc) => bc.category_id === category.id)
    .map((bc) => bc.brand_id) ?? [];

  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-brands-in-category', category.id],
    queryFn: async () => {
      // Bu kategorideki markaları al
      if (categoryBrandIds.length === 0) return [] as Brand[];
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, logo_url, is_active, sort_order')
        .in('id', categoryBrandIds)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
    enabled: categoryBrandIds.length > 0,
  });

  // Mevcut TÜM markalar (bu kategoride olmayanları seçmek için)
  const { data: allBrands } = useQuery({
    queryKey: ['vehicle-brands-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, logo_url, is_active, sort_order')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });

  // Bu kategoride OLMAYAN markalar
  const availableBrands = (allBrands ?? []).filter((b) => !categoryBrandIds.includes(b.id));
  const filteredAvailable = existingSearch
    ? availableBrands.filter((b) => b.name.toLowerCase().includes(existingSearch.toLowerCase()))
    : availableBrands;

  // Mevcut markayı bu kategoriye ekle
  const addExistingMut = useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await supabase.from('brand_categories').insert({ brand_id: brandId, category_id: category.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brand-categories-all'] });
      qc.invalidateQueries({ queryKey: ['vehicle-brands-in-category'] });
      setShowExistingPicker(false);
      setExistingSearch('');
    },
  });

  const saveMut = useMutation({
    mutationFn: async (payload: { id?: string; name: string; categoryIds: string[] }) => {
      let brandId = payload.id;
      if (!brandId) {
        // Önce marka oluştur
        const { data, error } = await supabase.from('vehicle_brands').insert({ name: payload.name, is_active: true }).select('id').single();
        if (error) throw error;
        brandId = data.id;
      } else {
        const { error } = await supabase.from('vehicle_brands').update({ name: payload.name }).eq('id', brandId);
        if (error) throw error;
      }
      // Kategori ilişkilerini güncelle
      await supabase.from('brand_categories').delete().eq('brand_id', brandId);
      if (payload.categoryIds.length > 0) {
        const rows = payload.categoryIds.map((cid) => ({ brand_id: brandId, category_id: cid }));
        const { error } = await supabase.from('brand_categories').insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-brands-in-category'] });
      qc.invalidateQueries({ queryKey: ['brand-categories-all'] });
      setName(''); setSelectedCats([category.id]); setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      // brand_categories'den de silinir (CASCADE)
      const { error } = await supabase.from('vehicle_brands').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-brands-in-category'] });
      qc.invalidateQueries({ queryKey: ['brand-categories-all'] });
    },
  });

  const allCategories = useCategories().data ?? [];

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Marka Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Marka Ekle</>}
        </h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; saveMut.mutate({ id: editing?.id, name: name.trim(), categoryIds: selectedCats }); }}
          className="space-y-3"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Marka adı (örn. BMW, Audi, Ford)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <div>
            <label className="text-xs font-semibold text-slate-700">Kategoriler (bu marka hangi kategorilerde olacak?)</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {allCategories.map((c) => {
                const active = selectedCats.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCats((p) => active ? p.filter((x) => x !== c.id) : [...p, c.id])}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 text-sm font-semibold transition',
                      active ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <span>{c.icon}</span> {c.name}
                    {active && <X className="h-3 w-3" />}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saveMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
              {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
            </button>
            {editing && (
              <button type="button" onClick={() => { setEditing(null); setName(''); setSelectedCats([category.id]); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                İptal
              </button>
            )}
          </div>
        </form>
        {saveMut.isError && <p className="text-sm text-red-600 mt-2">Hata: {(saveMut.error as any)?.message}</p>}
      </div>

      {/* MEVCUT MARKALARDAN BU KATEGORİYE EKLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">
            📋 Mevcut Markalardan Bu Kategoriye Ekle
          </h3>
          <button
            type="button"
            onClick={() => setShowExistingPicker((v) => !v)}
            className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded font-semibold"
          >
            {showExistingPicker ? 'Kapat' : 'Aç'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Bu kategoride olmayan tüm markalar ({availableBrands.length} adet)
        </p>
        {showExistingPicker && (
          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={existingSearch}
              onChange={(e) => setExistingSearch(e.target.value)}
              placeholder="Marka ara..."
              className="w-full px-3 py-1.5 border border-slate-300 rounded text-sm"
            />
            {availableBrands.length === 0 ? (
              <p className="text-sm text-emerald-600 py-2">✅ Tüm markalar zaten bu kategoride</p>
            ) : filteredAvailable.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">Sonuç bulunamadı</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 max-h-60 overflow-y-auto">
                {filteredAvailable.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => addExistingMut.mutate(b.id)}
                    disabled={addExistingMut.isPending}
                    className="text-left px-2 py-1.5 text-sm border border-slate-200 rounded hover:bg-red-50 hover:border-red-300 hover:text-red-700 transition disabled:opacity-50"
                  >
                    + {b.name}
                  </button>
                ))}
              </div>
            )}
            {addExistingMut.isError && (
              <p className="text-xs text-red-600">Hata: {(addExistingMut.error as any)?.message}</p>
            )}
          </div>
        )}
      </div>

      {isLoading || brandCats.isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu kategoride henüz marka yok</p>
          <p className="text-xs text-slate-400">Yukarıdan yeni marka ekleyin veya mevcut markalardan bu kategoriye ekleyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="font-semibold truncate">{b.name}</div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={async () => {
                  setEditing(b); setName(b.name);
                  const { data: bc } = await supabase.from('brand_categories').select('category_id').eq('brand_id', b.id);
                  setSelectedCats((bc ?? []).map((x) => x.category_id));
                }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => { if (confirm(`"${b.name}" markasını silmek istediğine emin misin?`)) deleteMut.mutate(b.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
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

/* ---------- MODELLER (kategoriye özel) ---------- */
function ModelsPanel({ category }: { category: Category }) {
  const qc = useQueryClient();
  const brandCats = useBrandCategories();
  const [name, setName] = useState('');
  const [brandId, setBrandId] = useState('');
  const [editing, setEditing] = useState<Model | null>(null);
  const [showExistingPicker, setShowExistingPicker] = useState(false);
  const [existingSearch, setExistingSearch] = useState('');
  const [pickBrandId, setPickBrandId] = useState('');
  const [filterModelBrand, setFilterModelBrand] = useState('');

  // Kategoriye ait markalar
  const categoryBrandIds = brandCats.data
    ?.filter((bc) => bc.category_id === category.id)
    .map((bc) => bc.brand_id) ?? [];

  // Kategoriye ait modelleri al (brand_id IN categoryBrandIds)
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-models-in-category', category.id],
    queryFn: async () => {
      if (categoryBrandIds.length === 0) return [] as (Model & { brand_name: string })[];
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, is_active, sort_order, brand:vehicle_brands(name)')
        .in('brand_id', categoryBrandIds)
        .order('sort_order');
      if (error) throw error;
      return ((data ?? []) as any[]).map((m) => ({ ...m, brand_name: m.brand?.name ?? '—' }));
    },
    enabled: categoryBrandIds.length > 0,
  });

  // Marka listesi (kategoriye ait)
  const { data: brands } = useQuery({
    queryKey: ['vehicle-brands-in-cat-for-models', category.id],
    queryFn: async () => {
      if (categoryBrandIds.length === 0) return [] as Brand[];
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, logo_url, is_active, sort_order')
        .in('id', categoryBrandIds)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
    enabled: categoryBrandIds.length > 0,
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
      qc.invalidateQueries({ queryKey: ['vehicle-models-in-category'] });
      setName(''); setBrandId(''); setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-models-in-category'] }),
  });

  // TÜM modeller (mevcut listeden seçmek için)
  const { data: allModels } = useQuery({
    queryKey: ['vehicle-models-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, brand:vehicle_brands(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; brand_id: string; brand: { name: string } | null }[];
    },
  });

  // Kategoriye ait markaların modelleri zaten var (üstte var), availableModels bunun disindaki
  const existingModelIds = (data ?? []).map((m) => m.id);
  const availableModels = (allModels ?? []).filter((m) => !existingModelIds.includes(m.id));
  const filteredAvailable = availableModels
    .filter((m) => !pickBrandId || m.brand_id === pickBrandId)
    .filter((m) => {
      if (!existingSearch) return true;
      const q = existingSearch.toLowerCase();
      return m.name.toLowerCase().includes(q) || (m.brand?.name ?? '').toLowerCase().includes(q);
    });

  // Mevcut modeli bu markanın altına ekle (modeli güncelle, brand_id degistir)
  const addExistingMut = useMutation({
    mutationFn: async ({ modelId, targetBrandId }: { modelId: string; targetBrandId: string }) => {
      // Modeli sil, yeni marka altinda olustur (CASCADE temizlik)
      const old = allModels?.find((m) => m.id === modelId);
      if (!old) throw new Error('Model bulunamadı');
      // INSERT yeni, eskiyi sil
      const { error: insertErr } = await supabase.from('vehicle_models').insert({ name: old.name, brand_id: targetBrandId, is_active: true });
      if (insertErr) throw insertErr;
      const { error: delErr } = await supabase.from('vehicle_models').delete().eq('id', modelId);
      if (delErr) throw delErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicle-models-in-category'] });
      qc.invalidateQueries({ queryKey: ['vehicle-models-all'] });
      setShowExistingPicker(false);
      setExistingSearch('');
      setPickBrandId('');
    },
  });

  return (
    <div>
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Model Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Model Ekle</>}
        </h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !brandId) return; saveMut.mutate(editing ? { id: editing.id, name: name.trim(), brand_id: brandId } : { name: name.trim(), brand_id: brandId }); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg" required>
            <option value="">{brands?.length ? 'Marka seçin' : 'Önce marka ekleyin'}</option>
            {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Model adı (örn. 3 Serisi, A4, Focus)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={saveMut.isPending || (brands?.length ?? 0) === 0} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setName(''); setBrandId(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
      </div>

      {/* Bu kategorideki modeller + Marka filtresi */}
      <div className="mb-3 flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
        <label className="text-sm font-semibold text-slate-700">Marka:</label>
        <select value={filterModelBrand} onChange={(e) => setFilterModelBrand(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tüm markalar</option>
          {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          {filterModelBrand ? (data ?? []).filter((m) => m.brand_id === filterModelBrand).length : data?.length ?? 0} / {data?.length ?? 0} model
        </span>
      </div>

      {/* MEVCUT MODELLERİ BU KATEGORİYE EKLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold flex items-center gap-2 text-sm">📋 Mevcut Modellerden Bu Kategoriye Ekle</h3>
          <button type="button" onClick={() => setShowExistingPicker((v) => !v)} className="text-xs bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded font-semibold">
            {showExistingPicker ? 'Kapat' : 'Aç'}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Bu kategoride olmayan tüm modeller ({availableModels.length} adet) - farklı markalardan
        </p>
        {showExistingPicker && (
          <div className="mt-3 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={pickBrandId} onChange={(e) => setPickBrandId(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
                <option value="">Tüm markalar</option>
                {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <input type="text" value={existingSearch} onChange={(e) => setExistingSearch(e.target.value)} placeholder="Model ara..." className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-sm" />
            </div>
            {availableModels.length === 0 ? (
              <p className="text-sm text-emerald-600 py-2">✅ Tüm modeller zaten bu kategoride</p>
            ) : filteredAvailable.length === 0 ? (
              <p className="text-sm text-slate-500 py-2">Sonuç bulunamadı</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-60 overflow-y-auto">
                {filteredAvailable.map((m) => (
                  <div key={m.id} className="flex items-center gap-1">
                    <span className="text-xs text-slate-500 truncate flex-1">{m.brand?.name} {m.name}</span>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addExistingMut.mutate({ modelId: m.id, targetBrandId: e.target.value });
                          e.target.value = '';
                        }
                      }}
                      disabled={addExistingMut.isPending}
                      className="text-xs border border-slate-300 rounded px-1 py-0.5"
                      defaultValue=""
                    >
                      <option value="" disabled>Ekle →</option>
                      {brands?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
            {addExistingMut.isError && (
              <p className="text-xs text-red-600">Hata: {(addExistingMut.error as any)?.message}</p>
            )}
            <p className="text-xs text-slate-400">💡 Modeli başka bir markaya taşımak için: marka seç → model eski yerinden silinip yeni markanın altına eklenir</p>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu kategoride henüz model yok</p>
          <p className="text-xs text-slate-400">Önce "Markalar" tab'ından marka ekleyin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.filter((m) => !filterModelBrand || m.brand_id === filterModelBrand).map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">{m.brand_name}</div>
                <div className="font-semibold truncate">{m.name}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setEditing({ id: m.id, name: m.name, brand_id: m.brand_id, is_active: m.is_active, sort_order: m.sort_order }); setName(m.name); setBrandId(m.brand_id); }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => { if (confirm(`"${m.name}" modelini silmek istediğine emin misin?`)) deleteMut.mutate(m.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
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

/* ---------- PAKETLER (kategoriye özel) ---------- */
function TrimsPanel({ category }: { category: Category }) {
  const qc = useQueryClient();
  const brandCats = useBrandCategories();
  const [name, setName] = useState('');
  const [modelId, setModelId] = useState('');
  const [editing, setEditing] = useState<Trim | null>(null);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');

  const categoryBrandIds = brandCats.data
    ?.filter((bc) => bc.category_id === category.id)
    .map((bc) => bc.brand_id) ?? [];

  // Kategoriye ait modeller
  const { data: models } = useQuery({
    queryKey: ['vehicle-models-in-cat-for-trims', category.id],
    queryFn: async () => {
      if (categoryBrandIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, brand:vehicle_brands(name)')
        .in('brand_id', categoryBrandIds)
        .order('name');
      if (error) throw error;
      return ((data ?? []) as any[]);
    },
    enabled: categoryBrandIds.length > 0,
  });

  // Kategoriye ait paketler
  const modelIds = models?.map((m) => m.id) ?? [];
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-trims-in-category', category.id],
    queryFn: async () => {
      if (modelIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vehicle_trims')
        .select('id, name, model_id, is_active, sort_order, model:vehicle_models(name, brand:vehicle_brands(name))')
        .in('model_id', modelIds)
        .order('sort_order');
      if (error) throw error;
      return ((data ?? []) as any[]).map((t) => ({
        ...t,
        label: `${t.model?.brand?.name ?? '—'} ${t.model?.name ?? '—'}`,
      }));
    },
    enabled: modelIds.length > 0,
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
      qc.invalidateQueries({ queryKey: ['vehicle-trims-in-category'] });
      setName(''); setModelId(''); setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_trims').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-trims-in-category'] }),
  });

  return (
    <div>
      {/* Marka + Model Filtreleri */}
      <div className="mb-3 flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
        <label className="text-sm font-semibold text-slate-700">Marka:</label>
        <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setFilterModel(''); }} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tüm markalar</option>
          {(() => {
            const uniqueBrands = new Map<string, { id: string; name: string }>();
            (models ?? []).forEach((m) => { if (m.brand) uniqueBrands.set(m.brand_id, { id: m.brand_id, name: m.brand.name }); });
            return Array.from(uniqueBrands.values()).map((b) => <option key={b.id} value={b.id}>{b.name}</option>);
          })()}
        </select>
        <label className="text-sm font-semibold text-slate-700 ml-2">Model:</label>
        <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tüm modeller</option>
          {(models ?? []).filter((m) => !filterBrand || m.brand_id === filterBrand).map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          {data?.filter((t) => !filterModel || t.model_id === filterModel).length ?? 0} / {data?.length ?? 0} paket
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Paket Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Paket Ekle</>}
        </h3>
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim() || !modelId) return; saveMut.mutate(editing ? { id: editing.id, name: name.trim(), model_id: modelId } : { name: name.trim(), model_id: modelId }); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg flex-1" required>
            <option value="">{models?.length ? 'Model seçin' : 'Önce model ekleyin'}</option>
            {models?.map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
          </select>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Paket adı (örn. Comfort, Sport, M Sport, AMG)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={saveMut.isPending || (models?.length ?? 0) === 0} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setName(''); setModelId(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg text-slate-500">
          Bu kategoride paket yok. Önce "Modeller" tab'ından model ekleyin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.filter((t) => !filterModel || t.model_id === filterModel).map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500">{t.label}</div>
                <div className="font-semibold truncate">{t.name}</div>
              </div>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { setEditing({ id: t.id, name: t.name, model_id: t.model_id, is_active: t.is_active, sort_order: t.sort_order }); setName(t.name); setModelId(t.model_id); }} className="p-1.5 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => { if (confirm(`"${t.name}" paketini silmek istediğine emin misin?`)) deleteMut.mutate(t.id); }} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil">
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

/* ---------- MOTOR HP'LERİ (kategoriye özel) ---------- */
function EnginePowersPanel({ category }: { category: Category }) {
  const qc = useQueryClient();
  const brandCats = useBrandCategories();
  const [hp, setHp] = useState('');
  const [modelId, setModelId] = useState('');
  const [editing, setEditing] = useState<EnginePower | null>(null);
  const [filterBrand, setFilterBrand] = useState('');
  const [filterModel, setFilterModel] = useState('');

  const categoryBrandIds = brandCats.data
    ?.filter((bc) => bc.category_id === category.id)
    .map((bc) => bc.brand_id) ?? [];

  const { data: models } = useQuery({
    queryKey: ['vehicle-models-in-cat-for-hp', category.id],
    queryFn: async () => {
      if (categoryBrandIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, brand:vehicle_brands(name)')
        .in('brand_id', categoryBrandIds)
        .order('name');
      if (error) throw error;
      return ((data ?? []) as any[]);
    },
    enabled: categoryBrandIds.length > 0,
  });

  const modelIds = models?.map((m) => m.id) ?? [];
  const { data, isLoading } = useQuery({
    queryKey: ['vehicle-engine-powers-in-category', category.id],
    queryFn: async () => {
      if (modelIds.length === 0) return [];
      const { data, error } = await supabase
        .from('vehicle_engine_powers')
        .select('id, hp, model_id, is_active, sort_order, model:vehicle_models(name, brand:vehicle_brands(name))')
        .in('model_id', modelIds)
        .order('hp');
      if (error) throw error;
      return ((data ?? []) as any[]).map((p) => ({
        ...p,
        label: `${p.model?.brand?.name ?? '—'} ${p.model?.name ?? '—'}`,
      }));
    },
    enabled: modelIds.length > 0,
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
      qc.invalidateQueries({ queryKey: ['vehicle-engine-powers-in-category'] });
      setHp(''); setModelId(''); setEditing(null);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_engine_powers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vehicle-engine-powers-in-category'] }),
  });

  return (
    <div>
      {/* Marka + Model Filtreleri */}
      <div className="mb-3 flex flex-wrap items-center gap-2 p-3 bg-white border border-slate-200 rounded-lg">
        <label className="text-sm font-semibold text-slate-700">Marka:</label>
        <select value={filterBrand} onChange={(e) => { setFilterBrand(e.target.value); setFilterModel(''); }} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tüm markalar</option>
          {(() => {
            const uniqueBrands = new Map<string, { id: string; name: string }>();
            (models ?? []).forEach((m) => { if (m.brand) uniqueBrands.set(m.brand_id, { id: m.brand_id, name: m.brand.name }); });
            return Array.from(uniqueBrands.values()).map((b) => <option key={b.id} value={b.id}>{b.name}</option>);
          })()}
        </select>
        <label className="text-sm font-semibold text-slate-700 ml-2">Model:</label>
        <select value={filterModel} onChange={(e) => setFilterModel(e.target.value)} className="px-3 py-1.5 border border-slate-300 rounded text-sm">
          <option value="">Tüm modeller</option>
          {(models ?? []).filter((m) => !filterBrand || m.brand_id === filterBrand).map((m) => <option key={m.id} value={m.id}>{m.brand?.name} {m.name}</option>)}
        </select>
        <span className="text-sm text-slate-500 ml-auto">
          {data?.filter((p) => !filterModel || p.model_id === filterModel).length ?? 0} / {data?.length ?? 0} motor
        </span>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          {editing ? <><Pencil className="h-4 w-4" /> Motor HP Düzenle</> : <><Plus className="h-4 w-4" /> Yeni Motor HP Ekle</>}
        </h3>
        <form
          onSubmit={(e) => { e.preventDefault(); const n = parseInt(hp); if (!n || !modelId) return; saveMut.mutate(editing ? { id: editing.id, hp: n, model_id: modelId } : { hp: n, model_id: modelId }); }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <select value={modelId} onChange={(e) => setModelId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg flex-1" required>
            <option value="">{models?.length ? 'Model seçin' : 'Önce model ekleyin'}</option>
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
          <button type="submit" disabled={saveMut.isPending || (models?.length ?? 0) === 0} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {saveMut.isPending ? 'Kaydediliyor...' : editing ? 'Güncelle' : 'Ekle'}
          </button>
          {editing && (
            <button type="button" onClick={() => { setEditing(null); setHp(''); setModelId(''); }} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">
              İptal
            </button>
          )}
        </form>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg text-slate-500">
          Bu kategoride motor yok. Önce "Modeller" tab'ından model ekleyin.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {data?.filter((p) => !filterModel || p.model_id === filterModel).map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-slate-500 truncate">{p.label}</div>
                <div className="font-bold text-lg">{p.hp} <span className="text-sm text-slate-500">HP</span></div>
              </div>
              <div className="flex flex-col items-center gap-1">
                <button type="button" onClick={() => { setEditing({ id: p.id, hp: p.hp, model_id: p.model_id, is_active: p.is_active, sort_order: p.sort_order }); setHp(String(p.hp)); setModelId(p.model_id); }} className="p-1 text-slate-600 hover:bg-slate-100 rounded" title="Düzenle">
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={() => { if (confirm(`"${p.hp} HP" motorunu silmek istediğine emin misin?`)) deleteMut.mutate(p.id); }} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Sil">
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
