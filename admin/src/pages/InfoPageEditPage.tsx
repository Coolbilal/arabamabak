import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, ArrowLeft, FileText, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import RichTextEditor from '../components/RichTextEditor';

const ICON_OPTIONS = ['📚', '🏗', '🔨', '📞', '🛡️', '💼', '🚗', '📋', '💡', '❓', '⭐', '🔔'];

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[ıİ]/g, 'i')
    .replace(/[şŞ]/g, 's')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[üÜ]/g, 'u')
    .replace(/[öÖ]/g, 'o')
    .replace(/[çÇ]/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

export default function InfoPageEditPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [icon, setIcon] = useState('📚');
  const [sortOrder, setSortOrder] = useState(0);
  const [isPublished, setIsPublished] = useState(true);
  const [uploading, setUploading] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['info-page', id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase
        .from('info_pages')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  // Mevcut sayfayı forma yükle
  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSlug(existing.slug);
      setExcerpt(existing.excerpt || '');
      setContent(existing.content || '');
      setCoverImage(existing.cover_image || '');
      setIcon(existing.icon || '📚');
      setSortOrder(existing.sort_order || 0);
      setIsPublished(existing.is_published);
    }
  }, [existing]);

  // Başlıktan otomatik slug
  useEffect(() => {
    if (isNew && title) {
      setSlug(slugify(title));
    }
  }, [title, isNew]);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload = {
        title,
        slug,
        excerpt: excerpt || null,
        content,
        cover_image: coverImage || null,
        icon,
        sort_order: sortOrder,
        is_published: isPublished,
        updated_at: new Date().toISOString(),
      };
      if (isNew) {
        const { error } = await supabase.from('info_pages').insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('info_pages').update(payload).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['info-pages'] });
      qc.invalidateQueries({ queryKey: ['info-page', id] });
      navigate('/info-pages');
    },
  });

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `info-covers/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('info-pages')
        .upload(path, file);
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from('info-pages').getPublicUrl(path);
      setCoverImage(pub.publicUrl);
    } catch (err: any) {
      alert('Görsel yüklenemedi: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (!isNew && isLoading) {
    return <div className="p-6 text-center text-slate-500">Yükleniyor...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => navigate('/info-pages')}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Listeye Dön
      </button>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2 mb-6">
          <FileText className="h-6 w-6" />
          {isNew ? 'Yeni Bilgi Sayfası' : 'Sayfayı Düzenle'}
        </h1>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Başlık *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
                placeholder="Açık Arttırma İlanı Nasıl Verilir?"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">İkon</label>
              <div className="flex gap-1 mt-1">
                {ICON_OPTIONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setIcon(ic)}
                    className={`text-2xl p-1 rounded ${icon === ic ? 'bg-red-100 ring-2 ring-red-500' : 'hover:bg-slate-100'}`}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">URL Slug *</label>
              <div className="flex items-center mt-1">
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-2 border border-r-0 border-slate-300 rounded-l-lg">/bilgi/</span>
                <input
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg font-mono text-sm"
                  placeholder="acik-arttirma-nasil-verilir"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Sıralama</label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Kısa Özet</label>
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-lg"
              placeholder="Anasayfadaki kartta görünecek kısa açıklama"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">Kapak Görseli</label>
            <div className="mt-1 flex items-center gap-2">
              {coverImage && (
                <img src={coverImage} alt="" className="h-16 w-24 object-cover rounded" />
              )}
              <label className="cursor-pointer inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded text-sm">
                <Upload className="h-4 w-4" />
                {uploading ? 'Yükleniyor...' : 'Görsel Yükle'}
                <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} disabled={uploading} />
              </label>
              {coverImage && (
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="text-xs text-red-600 hover:underline"
                >
                  Kaldır
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700">İçerik *</label>
            <div className="mt-1 border border-slate-300 rounded-lg overflow-hidden">
              <RichTextEditor value={content} onChange={setContent} placeholder="Sayfa içeriğini yazın..." />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Başlık, kalın/italik, listeler, linkler, görseller ekleyebilirsiniz.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_published"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="h-4 w-4 accent-red-600"
            />
            <label htmlFor="is_published" className="text-sm">
              Yayında (Yayından kaldırırsanız anasayfada görünmez)
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate('/info-pages')}
            className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={() => saveMut.mutate()}
            disabled={!title || !slug || !content || saveMut.isPending}
            className="inline-flex items-center gap-1 bg-red-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saveMut.isPending ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </div>
        {saveMut.isError && (
          <p className="text-sm text-red-600 mt-2">
            Hata: {(saveMut.error as any)?.message}
          </p>
        )}
      </div>
    </div>
  );
}
