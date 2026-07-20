import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

type InfoPage = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  icon: string | null;
  sort_order: number;
};

export default function InfoCards() {
  const [pages, setPages] = useState<InfoPage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPages() {
      try {
        const { data, error } = await supabase
          .from('info_pages')
          .select('id, slug, title, excerpt, icon, sort_order')
          .eq('is_published', true)
          .order('sort_order', { ascending: true })
          .limit(8);

        if (error) throw error;
        setPages((data as InfoPage[]) || []);
      } catch (err) {
        console.error('InfoCards fetch error:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPages();
  }, []);

  if (loading) return null;
  if (pages.length === 0) return null;

  return (
    <section className="bg-slate-50 border-t border-slate-200">
      <div className="container mx-auto px-4 py-12">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 rounded-full px-3 py-1 text-sm font-semibold mb-2">
            <FileText className="h-4 w-4" />
            Bilgi Bankası
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">Nasıl Yapılır?</h2>
          <p className="text-slate-600 mt-2">arabamabak kullanımı ile ilgili tüm rehberler burada</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pages.map((p) => (
            <Link
              key={p.id}
              to={`/bilgi/${p.slug}`}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-red-400 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl flex-shrink-0">{p.icon || '📚'}</span>
                <h3 className="font-bold text-slate-900 group-hover:text-red-600 transition-colors line-clamp-2">
                  {p.title}
                </h3>
              </div>
              {p.excerpt && (
                <p className="text-sm text-slate-600 line-clamp-2 mb-3">{p.excerpt}</p>
              )}
              <div className="flex items-center gap-1 text-sm font-semibold text-red-600">
                Devamını Oku
                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
