import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import InfoIcon from '../components/InfoIcon';

type InfoPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_image: string | null;
  icon: string | null;
  created_at: string;
  updated_at: string;
};

export default function InfoPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<InfoPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPage() {
      if (!slug) return;
      setLoading(true);
      try {
        const { data, error: err } = await supabase
          .from('info_pages')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (err) throw err;
        setPage(data as InfoPage);
      } catch (err: any) {
        setError(err.message || 'Sayfa yüklenemedi');
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [slug]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center py-12 text-slate-500">Yükleniyor...</div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4">
          <ChevronLeft className="h-4 w-4" /> Anasayfa
        </Link>
        <div className="text-center py-12 text-slate-500">
          {error || 'Sayfa bulunamadı'}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 mb-4">
        <ChevronLeft className="h-4 w-4" /> Anasayfa
      </Link>

      <article className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-10">
        {page.cover_image && (
          <img
            src={page.cover_image}
            alt={page.title}
            className="w-full h-64 object-cover rounded-lg mb-6"
          />
        )}

        <div className="flex items-center gap-3 mb-2">
          {page.icon && (
            <span className="text-slate-700" style={{ width: '3rem', height: '3rem' }}>
              <InfoIcon icon={page.icon} className="w-12 h-12" />
            </span>
          )}
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900">{page.title}</h1>
        </div>

        {page.excerpt && (
          <p className="text-slate-600 text-lg mb-6">{page.excerpt}</p>
        )}

        <div className="flex items-center gap-2 text-xs text-slate-400 mb-8 pb-6 border-b">
          <Calendar className="h-3 w-3" />
          <span>Son güncelleme: {new Date(page.updated_at).toLocaleDateString('tr-TR')}</span>
        </div>

        {/* Quill'den gelen HTML içeriği güvenli şekilde render */}
        <div
          className="prose prose-slate max-w-none
            prose-headings:font-extrabold prose-headings:text-slate-900
            prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
            prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
            prose-p:text-slate-700 prose-p:leading-relaxed prose-p:my-3
            prose-ul:my-4 prose-ol:my-4
            prose-li:text-slate-700
            prose-strong:text-slate-900
            prose-a:text-red-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </article>
    </div>
  );
}
