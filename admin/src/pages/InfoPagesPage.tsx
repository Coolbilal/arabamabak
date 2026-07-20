import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, FileText, ExternalLink, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

type InfoPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  icon: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

export default function InfoPagesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: pages, isLoading } = useQuery({
    queryKey: ['info-pages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('info_pages')
        .select('id, slug, title, excerpt, icon, sort_order, is_published, updated_at')
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as InfoPage[];
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('info_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['info-pages'] }),
  });

  const togglePublishMut = useMutation({
    mutationFn: async ({ id, current }: { id: string; current: boolean }) => {
      const { error } = await supabase
        .from('info_pages')
        .update({ is_published: !current })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['info-pages'] }),
  });

  const filtered = pages?.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <FileText className="h-6 w-6" /> Bilgi Bankası
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Anasayfada gösterilen bilgilendirme sayfaları. Yeni sayfa ekleyebilir veya mevcut sayfaları düzenleyebilirsin.
          </p>
        </div>
        <Link
          to="/info-pages/new"
          className="inline-flex items-center gap-1 bg-red-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Yeni Sayfa
        </Link>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Sayfa ara..."
        className="w-full mb-4 px-4 py-2 border border-slate-300 rounded-lg"
      />

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 bg-white border border-slate-200 rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500">Henüz bilgi sayfası yok</p>
          <Link to="/info-pages/new" className="text-red-600 hover:underline mt-2 inline-block">
            İlk sayfayı oluştur
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered?.map((p) => (
            <div
              key={p.id}
              className={cn(
                'bg-white border rounded-lg p-4 flex items-start gap-3',
                p.is_published ? 'border-slate-200' : 'border-amber-200 bg-amber-50/30'
              )}
            >
              <span className="text-3xl flex-shrink-0">{p.icon || '📚'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold truncate">{p.title}</h3>
                  {!p.is_published && (
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded">Taslak</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">/bilgi/{p.slug}</p>
                {p.excerpt && (
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.excerpt}</p>
                )}
                <div className="flex items-center gap-2 mt-3">
                  <Link
                    to={`/info-pages/${p.id}/edit`}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                  >
                    <Pencil className="h-3 w-3" /> Düzenle
                  </Link>
                  <a
                    href={`/bilgi/${p.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                  >
                    <ExternalLink className="h-3 w-3" /> Görüntüle
                  </a>
                  <button
                    type="button"
                    onClick={() => togglePublishMut.mutate({ id: p.id, current: p.is_published })}
                    className="inline-flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                  >
                    {p.is_published ? <><EyeOff className="h-3 w-3" /> Yayından Kaldır</> : <><Eye className="h-3 w-3" /> Yayınla</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`"${p.title}" sayfasını silmek istediğine emin misin?`)) {
                        deleteMut.mutate(p.id);
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs bg-red-50 text-red-700 hover:bg-red-100 px-2 py-1 rounded ml-auto"
                  >
                    <Trash2 className="h-3 w-3" /> Sil
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
