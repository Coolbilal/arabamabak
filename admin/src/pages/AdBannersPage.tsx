import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle, CheckCircle2, Edit3, ExternalLink, Image as ImageIcon,
  Loader2, Megaphone, Plus, RefreshCw, Save, Sliders, Trash2, X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatDate } from '../lib/utils';

interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
  display_position: string;
  display_order: number;
  is_active: boolean;
  start_at: string | null;
  end_at: string | null;
  impression_count: number;
  click_count: number;
  created_at: string;
  updated_at: string;
}

const POSITIONS = [
  { value: 'modal_popup', label: 'Modal Popup (Sayfa Açılışı)' },
  { value: 'header_top', label: 'Header Üstü (Sayfa Üstü Banner)' },
  { value: 'vehicle_detail_inline', label: 'İlan Detay Sayfası (İletişim Altı)' },
  { value: 'hero_inline', label: 'Hero Slider (İlan arası)' },
  { value: 'side_left', label: 'Sol Yan' },
  { value: 'side_right', label: 'Sağ Yan' },
  { value: 'bottom', label: 'Alt' },
];

export default function AdBannersPage() {
  const { hasPermission } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Banner | null>(null);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = hasPermission('site_settings', 'edit');

  const banners = useQuery({
    queryKey: ['ad-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('*')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as Banner[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('ad_banners').update({ is_active }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-banners'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ad_banners').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ad-banners'] });
      setDeletingId(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-rose-600" />
            Reklam Yönetimi
          </h1>
          <p className="text-sm text-slate-500">
            Site içi reklam bannerlarını yönet. Hero slider arası, yan paneller ve alt alan.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => banners.refetch()} className="btn-secondary">
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
          {canEdit && (
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus className="h-4 w-4" /> Yeni Banner
            </button>
          )}
        </div>
      </div>

      {!canEdit && (
        <div className="card p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-amber-800 text-sm">
            <AlertCircle className="h-5 w-5" />
            Sadece görüntüleme yetkiniz var. Düzenleme için site_settings alanında yetki gerekir.
          </div>
        </div>
      )}

      <SliderIntervalCard canEdit={canEdit} />

      {error && (
        <div className="card p-3 bg-red-50 border-red-200 text-sm text-red-700">{error}</div>
      )}

      {banners.isLoading ? (
        <div className="card p-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400 mx-auto" />
        </div>
      ) : (banners.data ?? []).length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <Megaphone className="h-12 w-12 mx-auto mb-3 text-slate-300" />
          Henüz banner yok. İlk banner'ı eklemek için "Yeni Banner" butonunu kullan.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">Görsel</th>
                  <th className="px-4 py-3 text-left">Başlık</th>
                  <th className="px-4 py-3 text-left">Pozisyon</th>
                  <th className="px-4 py-3 text-center">Sıra</th>
                  <th className="px-4 py-3 text-center">İstatistik</th>
                  <th className="px-4 py-3 text-left">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {banners.data!.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="h-12 w-20 rounded overflow-hidden bg-slate-100 flex items-center justify-center">
                        {b.image_url ? (
                          <img src={b.image_url} alt={b.title} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">{b.title}</div>
                      {b.description && (
                        <div className="text-xs text-slate-500 line-clamp-1 max-w-xs">{b.description}</div>
                      )}
                      {b.link_url && (
                        <a href={b.link_url} target="_blank" rel="noreferrer" className="text-xs text-sky-600 hover:underline inline-flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" /> {b.link_url.length > 40 ? b.link_url.slice(0, 40) + '...' : b.link_url}
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {POSITIONS.find((p) => p.value === b.display_position)?.label ?? b.display_position}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">{b.display_order}</td>
                    <td className="px-4 py-3 text-center text-xs">
                      <div>Gösterim: <strong>{b.impression_count}</strong></div>
                      <div>Tıklama: <strong>{b.click_count}</strong></div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'badge',
                        b.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600',
                      )}>
                        {b.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                      {b.start_at && (
                        <div className="text-[10px] text-slate-500 mt-1">
                          {formatDate(b.start_at)} - {b.end_at ? formatDate(b.end_at) : '∞'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <button
                              onClick={() => setEditing(b)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
                              title="Düzenle"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => toggleActive.mutate({ id: b.id, is_active: !b.is_active })}
                              className={cn(
                                'rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700',
                              )}
                              title={b.is_active ? 'Devre dışı bırak' : 'Etkinleştir'}
                            >
                              {b.is_active ? <X className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => setDeletingId(b.id)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                              title="Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(editing || creating) && (
        <BannerModal
          banner={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            qc.invalidateQueries({ queryKey: ['ad-banners'] });
          }}
          canEdit={canEdit}
        />
      )}

      {deletingId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDeletingId(null)}
        >
          <div className="card w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-slate-900">Banner'ı sil</h3>
            <p className="text-sm text-slate-600">Bu işlem geri alınamaz. Devam etmek istiyor musun?</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingId(null)} className="btn-secondary">İptal</button>
              <button
                onClick={() => remove.mutate(deletingId)}
                disabled={remove.isPending}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BannerModal({ banner, onClose, onSaved, canEdit }: {
  banner: Banner | null;
  onClose: () => void;
  onSaved: () => void;
  canEdit: boolean;
}) {
  const [title, setTitle] = useState(banner?.title ?? '');
  const [description, setDescription] = useState(banner?.description ?? '');
  const [imageUrl, setImageUrl] = useState(banner?.image_url ?? '');
  const [linkUrl, setLinkUrl] = useState(banner?.link_url ?? '');
  const [position, setPosition] = useState(banner?.display_position ?? 'hero_inline');
  const [order, setOrder] = useState(banner?.display_order ?? 0);
  const [isActive, setIsActive] = useState(banner?.is_active ?? true);
  const [startAt, setStartAt] = useState(banner?.start_at?.slice(0, 16) ?? '');
  const [endAt, setEndAt] = useState(banner?.end_at?.slice(0, 16) ?? '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const ext = f.name.split('.').pop();
      const path = `banners/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('ad-banners').upload(path, f);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('ad-banners').getPublicUrl(path);
      setImageUrl(pub.publicUrl);
    } catch (e: any) {
      setError(e.message || 'Yükleme hatası');
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        description: description || null,
        image_url: imageUrl,
        link_url: linkUrl || null,
        display_position: position,
        display_order: Number(order),
        is_active: isActive,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
      };
      if (banner) {
        const { error } = await supabase.from('ad_banners').update(payload).eq('id', banner.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('ad_banners').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: onSaved,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-rose-600" />
            {banner ? 'Banner Düzenle' : 'Yeni Banner'}
          </h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); save.mutate(); }} className="space-y-3 p-5">
          <div>
            <label className="label">Başlık *</label>
            <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">Açıklama</label>
            <textarea
              className="input min-h-[60px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Görsel URL *</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                required
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://..."
              />
              <label className="btn-secondary cursor-pointer">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                Yükle
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
              </label>
            </div>
            {imageUrl && (
              <img src={imageUrl} alt="preview" className="mt-2 max-h-32 rounded border" />
            )}
          </div>
          <div>
            <label className="label">Link URL</label>
            <input className="input" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Pozisyon</label>
              <select className="input" value={position} onChange={(e) => setPosition(e.target.value)}>
                {POSITIONS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sıra</label>
              <input
                type="number"
                className="input"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Başlangıç Tarihi</label>
              <input type="datetime-local" className="input" value={startAt} onChange={(e) => setStartAt(e.target.value)} />
            </div>
            <div>
              <label className="label">Bitiş Tarihi</label>
              <input type="datetime-local" className="input" value={endAt} onChange={(e) => setEndAt(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <span className="text-sm">Aktif</span>
          </label>

          {error && <div className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</div>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">İptal</button>
            <button type="submit" disabled={save.isPending || !canEdit} className="btn-primary">
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {banner ? 'Güncelle' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
function SliderIntervalCard({ canEdit }: { canEdit: boolean }) {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ['site-settings', 'slider-interval'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('premium_slider_interval_seconds')
        .eq('id', 1)
        .maybeSingle();
      if (error) throw error;
      return Number((data as any)?.premium_slider_interval_seconds ?? 5);
    },
  });
  const [val, setVal] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const current = val ?? settingsQ.data ?? 5;

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .update({ premium_slider_interval_seconds: current })
        .eq('id', 1);
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      qc.invalidateQueries({ queryKey: ['site-settings', 'slider-interval'] });
    } catch (e) {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="h-10 w-10 rounded-lg bg-brand-50 flex items-center justify-center">
          <Sliders className="h-5 w-5 text-brand-600" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-slate-900">Slider Geçiş Süresi</div>
          <div className="text-xs text-slate-500">
            Premium açık arttırma panosu kaç saniyede bir slide geçişi yapsın
          </div>
        </div>
        {saved && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4" /> Kaydedildi
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={2}
          max={30}
          step={1}
          value={current}
          onChange={(e) => setVal(Number(e.target.value))}
          disabled={!canEdit}
          className="flex-1"
        />
        <div className="w-20 text-center">
          <span className="text-2xl font-bold text-brand-600">{current}</span>
          <span className="text-xs text-slate-500 ml-1">sn</span>
        </div>
        {canEdit && (
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </button>
        )}
      </div>
    </div>
  );
}
