import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Filter, ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

// Admin'in sub_area yetkilerine göre hangi kategorileri görebileceğini belirle
// AREA_SUB_AREAS'daki sub_area key'leri (catalog için) kategori slug'larına eşlenir
const CATALOG_SUB_AREA_TO_SLUG: Record<string, string> = {
  otomobil: 'otomobil',
  arazi_suv_pickup: 'arazi-suv-pikup',
  minivan_panelvan: 'minivan-panelvan',
  ticari: 'ticari',
  motosiklet_utv_atv: 'motosiklet-utv-atv',
};

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

type SubTrim = {
  id: string;
  name: string;
  trim_id: string;
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

// Navigation state
type NavLevel = 'category' | 'brand' | 'model' | 'trim' | 'engine-power';

export default function CatalogPage() {
  const [navCategory, setNavCategory] = useState<Category | null>(null);
  const [navBrand, setNavBrand] = useState<Brand | null>(null);
  const [navModel, setNavModel] = useState<Model | null>(null);
  const [navTrim, setNavTrim] = useState<Trim | null>(null);
  const [navSubTrim, setNavSubTrim] = useState<SubTrim | null>(null);

  // 1. Seviye: Kategori listesi
  if (!navCategory) return <CategoriesLevel onSelect={setNavCategory} />;

  // 2. Seviye: Kategori altında markalar
  if (!navBrand) return (
    <BrandsLevel
      category={navCategory}
      onSelect={setNavBrand}
      onBack={() => setNavCategory(null)}
    />
  );

  // 3. Seviye: Marka altında modeller
  if (!navModel) return (
    <ModelsLevel
      category={navCategory}
      brand={navBrand}
      onSelect={setNavModel}
      onBack={() => setNavBrand(null)}
    />
  );

  // 4. Seviye: Model altında paketler
  if (!navTrim) return (
    <TrimsLevel
      category={navCategory}
      brand={navBrand}
      model={navModel}
      onSelect={setNavTrim}
      onBack={() => setNavModel(null)}
    />
  );

  // 5. Seviye: Paket altında alt paketler (YENİ)
  if (!navSubTrim) return (
    <SubTrimsLevel
      category={navCategory}
      brand={navBrand}
      model={navModel}
      trim={navTrim}
      onSelect={setNavSubTrim}
      onBack={() => setNavTrim(null)}
    />
  );

  // 6. Seviye: Alt paket altında motor HP'leri
  return (
    <EnginePowersLevel
      category={navCategory}
      brand={navBrand}
      model={navModel}
      trim={navTrim}
      subTrim={navSubTrim}
      onBack={() => setNavSubTrim(null)}
    />
  );
}

/* ---------- BREADCRUMB ---------- */
function Breadcrumb({ items, onBack }: { items: { label: string; icon?: string }[]; onBack?: () => void }) {
  return (
    <div className="flex items-center gap-2 text-sm mb-3 text-slate-600 flex-wrap">
      {onBack && (
        <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-slate-600 hover:text-red-600 font-semibold">
          <ChevronLeft className="h-4 w-4" /> Geri
        </button>
      )}
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1">
          {i > 0 && <span className="text-slate-400 mx-1">/</span>}
          {it.icon && <span>{it.icon}</span>}
          <span className={i === items.length - 1 ? 'font-bold text-slate-900' : ''}>{it.label}</span>
        </span>
      ))}
    </div>
  );
}

function DeleteButton({ onConfirm, message }: { onConfirm: () => void; message: string }) {
  const [confirming, setConfirming] = useState(false);
  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-red-600 font-semibold">Emin misin?</span>
        <button
          type="button"
          onClick={() => { onConfirm(); setConfirming(false); }}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
        >
          <Check className="h-3 w-3" /> Evet
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
        >
          <X className="h-3 w-3" /> Hayır
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 rounded hover:bg-red-100"
      title="Sil"
    >
      <Trash2 className="h-3 w-3" /> Sil
    </button>
  );
}

function AddToggle({ open, setOpen, label, icon }: { open: boolean; setOpen: (v: boolean) => void; label: string; icon?: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      className={cn(
        'inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-semibold transition',
        open ? 'bg-slate-200 text-slate-700' : 'bg-red-600 text-white hover:bg-red-700'
      )}
    >
      {icon || <Plus className="h-4 w-4" />}
      {open ? 'Kapat' : label}
    </button>
  );
}

/* ==================== 1. SEVİYE: KATEGORİLER ==================== */
function CategoriesLevel({ onSelect }: { onSelect: (c: Category) => void }) {
  const qc = useQueryClient();
  const { admin, hasPermission } = useAuth();
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

  // Admin'in catalog sub_area yetkileri
  const allowedSlugs = useMemo(() => {
    if (!admin) return new Set<string>();
    if (admin.is_super_admin) return null; // null = hepsi
    const perms = (admin as any).permissions || [];
    console.log('[Catalog] admin perms:', perms);
    const subs = perms
      .filter((p: any) => p.area === 'catalog' && p.sub_area != null)
      .map((p: any) => CATALOG_SUB_AREA_TO_SLUG[p.sub_area] || p.sub_area);
    console.log('[Catalog] sub_area slugs:', subs);
    // Eğer ana catalog (sub_area=null) yetkisi varsa: sub_area varsa onları göster, yoksa tümünü
    const hasMainCatalog = perms.some((p: any) => p.area === 'catalog' && !p.sub_area);
    console.log('[Catalog] hasMainCatalog:', hasMainCatalog);
    if (hasMainCatalog) {
      // Hem parent hem sub_area varsa: sub_area'ları göster (sadece yetkili olanlar)
      if (subs.length > 0) return new Set(subs);
      // Sadece parent varsa: tüm alt kategorileri göster
      return null;
    }
    return new Set(subs);
  }, [admin]);

  // Filtrelenmiş kategoriler
  const filteredData = useMemo(() => {
    if (!data) return [];
    if (allowedSlugs === null) return data; // super admin veya ana yetki
    return data.filter((c) => allowedSlugs.has(c.slug));
  }, [data, allowedSlugs]);

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
          <p className="text-slate-500 text-sm mt-1">Bir kategori seçin, hiyerarşik olarak marka/model/paket/motor ekleyin.</p>
        </div>
        <AddToggle open={showForm} setOpen={setShowForm} label="Yeni Kategori" />
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
            placeholder="slug"
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
      ) : filteredData.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          Bu admin hesabı için yetkili kategori yok. Super admin'den yetki isteyin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => c.is_active && onSelect(c)}
              disabled={!c.is_active}
              className={cn(
                'bg-white border-2 rounded-xl p-5 transition text-left',
                c.is_active ? 'border-slate-200 hover:border-red-400 hover:shadow-md cursor-pointer' : 'border-slate-100 opacity-60 cursor-not-allowed'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-4xl">{c.icon}</span>
                <ChevronRight className="h-5 w-5 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold mb-1">{c.name}</h3>
              <p className="text-xs text-slate-500">/{c.slug}</p>
              {!c.is_active && <p className="text-xs text-amber-600 mt-1">⚠ Pasif</p>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== 2. SEVİYE: MARKALAR ==================== */
function BrandsLevel({ category, onSelect, onBack }: { category: Category; onSelect: (b: Brand) => void; onBack: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  // Bu kategorideki markalar (brand_categories join)
  const { data, isLoading } = useQuery({
    queryKey: ['brands-in-category', category.id],
    queryFn: async () => {
      const { data: bcs } = await supabase
        .from('brand_categories')
        .select('brand_id, vehicle_brands!inner(id, name, is_active, sort_order)')
        .eq('category_id', category.id);
      if (!bcs) return [] as Brand[];
      return bcs.map((bc) => bc.vehicle_brands).filter(Boolean).sort((a: any, b: any) => a.sort_order - b.sort_order) as Brand[];
    },
  });

  // Tüm markalar (mevcut listeden seçmek için)
  const { data: allBrands } = useQuery({
    queryKey: ['vehicle-brands-all-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, is_active, sort_order')
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });

  const existingIds = (data ?? []).map((b) => b.id);
  const availableBrands = (allBrands ?? []).filter((b) => !existingIds.includes(b.id));
  const [search, setSearch] = useState('');
  const filteredAvailable = search
    ? availableBrands.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))
    : availableBrands;

  const addNewMut = useMutation({
    mutationFn: async (newName: string) => {
      const { data: b, error } = await supabase.from('vehicle_brands').insert({ name: newName.trim(), is_active: true }).select('id').single();
      if (error) throw error;
      const { error: e2 } = await supabase.from('brand_categories').insert({ brand_id: b.id, category_id: category.id });
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands-in-category'] });
      qc.invalidateQueries({ queryKey: ['vehicle-brands-all-list'] });
      qc.invalidateQueries({ queryKey: ['brand-categories-all'] });
      setName(''); setShowForm(false);
    },
  });

  const addExistingMut = useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await supabase.from('brand_categories').insert({ brand_id: brandId, category_id: category.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands-in-category'] });
      qc.invalidateQueries({ queryKey: ['brand-categories-all'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (brandId: string) => {
      // Sadece bu kategoriden çıkar (markayı silme, sadece ilişkiyi sil)
      const { error } = await supabase.from('brand_categories').delete().eq('brand_id', brandId).eq('category_id', category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brands-in-category'] });
      qc.invalidateQueries({ queryKey: ['brand-categories-all'] });
    },
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Filtreleme Yönetimi' }, { label: category.name, icon: category.icon }]} onBack={onBack} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <span className="text-3xl">{category.icon}</span>
          {category.name} - Markalar
        </h1>
        <AddToggle open={showForm} setOpen={setShowForm} label="Yeni Marka" />
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addNewMut.mutate(name); }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yeni marka adı (örn. BMW, Audi, Ford)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={addNewMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {addNewMut.isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
          {addNewMut.isError && <p className="text-sm text-red-600">Hata: {(addNewMut.error as any)?.message}</p>}
        </form>
      )}

      {/* Mevcut listeden ekleme */}
      {availableBrands.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm">📋 Mevcut Markalardan Bu Kategoriye Ekle ({availableBrands.length} adet)</h3>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Marka ara..." className="w-full mb-2 px-3 py-1.5 border border-slate-300 rounded text-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1 max-h-60 overflow-y-auto">
            {filteredAvailable.slice(0, 50).map((b) => (
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
          {filteredAvailable.length > 50 && <p className="text-xs text-slate-500 mt-2">İlk 50 gösteriliyor, arama kullanın</p>}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu kategoride henüz marka yok</p>
          <p className="text-xs text-slate-400">Yukarıdan yeni marka ekleyin veya mevcut markalardan seçin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((b) => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelect(b)}
                className="flex-1 min-w-0 text-left hover:text-red-600 transition"
              >
                <div className="font-semibold truncate">{b.name}</div>
                <div className="text-xs text-slate-500">Modelleri gör →</div>
              </button>
              <DeleteButton onConfirm={() => deleteMut.mutate(b.id)} message={`"${b.name}" markasını bu kategoriden çıkarmak istediğine emin misin?`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== 3. SEVİYE: MODELLER ==================== */
function ModelsLevel({ category, brand, onSelect, onBack }: { category: Category; brand: Brand; onSelect: (m: Model) => void; onBack: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');

  // Bu markanın modelleri
  const { data, isLoading } = useQuery({
    queryKey: ['models-of-brand', brand.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, is_active, sort_order')
        .eq('brand_id', brand.id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Model[];
    },
  });

  // Tüm modeller (mevcut listeden seçmek için)
  const { data: allModels } = useQuery({
    queryKey: ['vehicle-models-all-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, name, brand_id, brand:vehicle_brands(name)')
        .order('name');
      if (error) throw error;
      return (data ?? []) as { id: string; name: string; brand_id: string; brand: { name: string } | null }[];
    },
  });

  const existingIds = (data ?? []).map((m) => m.id);
  const availableModels = (allModels ?? []).filter((m) => !existingIds.includes(m.id));
  const filteredAvailable = search
    ? availableModels.filter((m) => m.name.toLowerCase().includes(search.toLowerCase()) || (m.brand?.name ?? '').toLowerCase().includes(search.toLowerCase()))
    : availableModels;

  const addNewMut = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase.from('vehicle_models').insert({ name: newName.trim(), brand_id: brand.id, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['models-of-brand'] });
      setName(''); setShowForm(false);
    },
  });

  const addExistingMut = useMutation({
    mutationFn: async ({ modelId, targetBrandId }: { modelId: string; targetBrandId: string }) => {
      const old = allModels?.find((m) => m.id === modelId);
      if (!old) throw new Error('Model bulunamadı');
      const { error: e1 } = await supabase.from('vehicle_models').insert({ name: old.name, brand_id: targetBrandId, is_active: true });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('vehicle_models').delete().eq('id', modelId);
      if (e2) throw e2;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['models-of-brand'] });
      qc.invalidateQueries({ queryKey: ['vehicle-models-all-list'] });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_models').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['models-of-brand'] }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Filtreleme Yönetimi' }, { label: category.name, icon: category.icon }, { label: brand.name }]} onBack={onBack} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          {brand.name} - Modeller
        </h1>
        <AddToggle open={showForm} setOpen={setShowForm} label="Yeni Model" />
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addNewMut.mutate(name); }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yeni model adı (örn. 3 Serisi, A4, Focus)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={addNewMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {addNewMut.isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
          {addNewMut.isError && <p className="text-sm text-red-600">Hata: {(addNewMut.error as any)?.message}</p>}
        </form>
      )}

      {/* Mevcut modellerden taşı */}
      {availableModels.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
          <h3 className="font-semibold mb-2 text-sm">📋 Mevcut Modellerden {brand.name}'e Taşı ({availableModels.length} adet)</h3>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Model ara..." className="w-full mb-2 px-3 py-1.5 border border-slate-300 rounded text-sm" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 max-h-60 overflow-y-auto">
            {filteredAvailable.slice(0, 50).map((m) => (
              <div key={m.id} className="flex items-center gap-1 text-xs border border-slate-200 rounded px-2 py-1">
                <span className="truncate flex-1">{m.brand?.name} {m.name}</span>
                <button
                  type="button"
                  onClick={() => addExistingMut.mutate({ modelId: m.id, targetBrandId: brand.id })}
                  disabled={addExistingMut.isPending}
                  className="text-red-600 hover:text-red-700 font-bold px-1"
                  title="Bu markaya taşı"
                >
                  + →
                </button>
              </div>
            ))}
          </div>
          {filteredAvailable.length > 50 && <p className="text-xs text-slate-500 mt-2">İlk 50 gösteriliyor</p>}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu markada henüz model yok</p>
          <p className="text-xs text-slate-400">Yukarıdan yeni model ekleyin veya mevcut modellerden taşıyın.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelect(m)}
                className="flex-1 min-w-0 text-left hover:text-red-600 transition"
              >
                <div className="font-semibold truncate">{m.name}</div>
                <div className="text-xs text-slate-500">Paketleri gör →</div>
              </button>
              <DeleteButton onConfirm={() => deleteMut.mutate(m.id)} message={`"${m.name}" modelini silmek istediğine emin misin? Bu modele bağlı paketler ve motor HP'leri de silinir.`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== 4. SEVİYE: PAKETLER ==================== */
function TrimsLevel({ category, brand, model, onSelect, onBack }: { category: Category; brand: Brand; model: Model; onSelect: (t: Trim) => void; onBack: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['trims-of-model', model.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_trims')
        .select('id, name, model_id, is_active, sort_order')
        .eq('model_id', model.id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Trim[];
    },
  });

  const addNewMut = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase.from('vehicle_trims').insert({ name: newName.trim(), model_id: model.id, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trims-of-model'] });
      setName(''); setShowForm(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_trims').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trims-of-model'] }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Filtreleme Yönetimi' }, { label: category.name, icon: category.icon }, { label: brand.name }, { label: model.name }]} onBack={onBack} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          {brand.name} {model.name} - Paketler
        </h1>
        <AddToggle open={showForm} setOpen={setShowForm} label="Yeni Paket" />
      </div>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addNewMut.mutate(name); }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Paket adı (örn. Comfort, Sport, M Sport, AMG)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={addNewMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {addNewMut.isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
          {addNewMut.isError && <p className="text-sm text-red-600">Hata: {(addNewMut.error as any)?.message}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu modelde henüz paket yok</p>
          <p className="text-xs text-slate-400">Yukarıdan yeni paket ekleyin (Comfort, Sport, M Sport, AMG vb.)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((t) => (
            <div key={t.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelect(t)}
                className="flex-1 min-w-0 text-left hover:text-red-600 transition"
              >
                <div className="font-semibold truncate">{t.name}</div>
                <div className="text-xs text-slate-500">Motor HP'leri gör →</div>
              </button>
              <DeleteButton onConfirm={() => deleteMut.mutate(t.id)} message={`"${t.name}" paketini silmek istediğine emin misin? Bu pakete bağlı motor HP'leri de silinir.`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== 5. SEVİYE: ALT PAKETLER ==================== */
function SubTrimsLevel({ category, brand, model, trim, onSelect, onBack }: { category: Category; brand: Brand; model: Model; trim: Trim; onSelect: (st: SubTrim) => void; onBack: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sub-trims-of-trim', trim.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_sub_trims')
        .select('id, name, trim_id, is_active, sort_order')
        .eq('trim_id', trim.id)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as SubTrim[];
    },
  });

  const addNewMut = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase.from('vehicle_sub_trims').insert({ name: newName.trim(), trim_id: trim.id, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sub-trims-of-trim'] });
      setName(''); setShowForm(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_sub_trims').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sub-trims-of-trim'] }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Filtreleme Yönetimi' }, { label: category.name, icon: category.icon }, { label: brand.name }, { label: model.name }, { label: trim.name }]} onBack={onBack} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          {brand.name} {model.name} {trim.name} - Alt Paketler
        </h1>
        <AddToggle open={showForm} setOpen={setShowForm} label="Yeni Alt Paket" />
      </div>

      <p className="text-sm text-slate-500 mb-4">
        ℹ️ Alt paket, paketin alt versiyonudur (örn. <strong>1.4 TFSI</strong>, <strong>2.0 TDI</strong>, <strong>320d</strong>). Motor seçiminden önce gösterilir.
      </p>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; addNewMut.mutate(name); }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-2"
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alt paket adı (örn. 1.4 TFSI, 2.0 TDI, 320d, Hybrid)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={addNewMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {addNewMut.isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
          {addNewMut.isError && <p className="text-sm text-red-600">Hata: {(addNewMut.error as any)?.message}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu pakette henüz alt paket yok</p>
          <p className="text-xs text-slate-400">Yukarıdan yeni alt paket ekleyin veya bu adımı atlayıp direkt Motor HP'ye geçin.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {data?.map((st) => (
            <div key={st.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelect(st)}
                className="flex-1 min-w-0 text-left hover:text-red-600 transition"
              >
                <div className="font-semibold truncate">{st.name}</div>
                <div className="text-xs text-slate-500">Motor HP'leri gör →</div>
              </button>
              <DeleteButton onConfirm={() => deleteMut.mutate(st.id)} message={`"${st.name}" alt paketini silmek istediğine emin misin?`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ==================== 6. SEVİYE: MOTOR HP'LERİ ==================== */
function EnginePowersLevel({ category, brand, model, trim, subTrim, onBack }: { category: Category; brand: Brand; model: Model; trim: Trim; subTrim: SubTrim | null; onBack: () => void }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [hp, setHp] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['engine-powers-of-model', model.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicle_engine_powers')
        .select('id, hp, model_id, is_active, sort_order')
        .eq('model_id', model.id)
        .order('hp');
      if (error) throw error;
      return (data ?? []) as EnginePower[];
    },
  });

  const addNewMut = useMutation({
    mutationFn: async (newHp: number) => {
      const { error } = await supabase.from('vehicle_engine_powers').insert({ hp: newHp, model_id: model.id, is_active: true });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['engine-powers-of-model'] });
      setHp(''); setShowForm(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicle_engine_powers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['engine-powers-of-model'] }),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Breadcrumb items={[{ label: 'Filtreleme Yönetimi' }, { label: category.name, icon: category.icon }, { label: brand.name }, { label: model.name }, { label: trim.name }, ...(subTrim ? [{ label: subTrim.name }] : [])]} onBack={onBack} />
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          {brand.name} {model.name} {trim.name} {subTrim && `· ${subTrim.name}`} - Motor HP'leri
        </h1>
        <AddToggle open={showForm} setOpen={setShowForm} label="Yeni Motor HP" />
      </div>

      <p className="text-sm text-slate-500 mb-4">
        ℹ️ Motor HP'ler model seviyesinde tanımlıdır. Bir modelin tüm paketleri aynı motor HP listesini paylaşır.
      </p>

      {showForm && (
        <form
          onSubmit={(e) => { e.preventDefault(); const v = hp.trim(); if (!v) return; const n = parseInt(v); addNewMut.mutate(isNaN(n) ? 0 : n); }}
          className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex gap-2"
        >
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            placeholder="HP veya motor kodu (örn. 184, 2.0 TDI, 320d)"
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg"
            required
          />
          <button type="submit" disabled={addNewMut.isPending} className="bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50">
            {addNewMut.isPending ? 'Ekleniyor...' : 'Ekle'}
          </button>
          {addNewMut.isError && <p className="text-sm text-red-600">Hata: {(addNewMut.error as any)?.message}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : data?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <p className="text-slate-500 mb-2">Bu modelde henüz motor HP yok</p>
          <p className="text-xs text-slate-400">Yukarıdan yeni motor HP ekleyin (örn. 184, 2.0 TDI, 320d)</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {data?.map((p) => (
            <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-3 flex items-center justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-bold text-lg">{p.hp} {p.hp >= 20 && p.hp <= 2000 ? <span className="text-sm text-slate-500">HP</span> : null}</div>
              </div>
              <DeleteButton onConfirm={() => deleteMut.mutate(p.id)} message={`"${p.hp}" motorunu silmek istediğine emin misin?`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
