import { Link } from 'react-router-dom';
import { FileQuestion, Home, Search, ChevronRight } from 'lucide-react';

const POPULAR_CATEGORIES = [
  { label: 'Devam Eden Açık Arttırmalar', href: '/kategori/live', color: 'bg-red-50 text-red-700' },
  { label: 'Yaklaşan Açık Arttırmalar', href: '/kategori/upcoming', color: 'bg-amber-50 text-amber-700' },
  { label: 'Ücretsiz İlanlar', href: '/kategori/free', color: 'bg-emerald-50 text-emerald-700' },
  { label: 'Ekspertiz Yaptır', href: '/ekspertiz', color: 'bg-blue-50 text-blue-700' },
];

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-slate-100 text-slate-300">
        <FileQuestion className="h-14 w-14" />
      </div>
      <span className="badge bg-slate-100 text-slate-600">404</span>
      <h1 className="mt-3 text-3xl font-extrabold text-slate-900 md:text-4xl">
        Aradığınız sayfa bulunamadı
      </h1>
      <p className="mt-3 max-w-md text-sm text-slate-500 md:text-base">
        Aradığınız sayfa kaldırılmış, taşınmış ya da hiç var olmamış olabilir. Aşağıdaki bağlantılardan devam edebilirsiniz.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="btn-primary">
          <Home className="h-4 w-4" /> Ana Sayfaya Dön
        </Link>
        <Link to="/kategori/free" className="btn-secondary">
          <Search className="h-4 w-4" /> İlanlara Göz At
        </Link>
      </div>

      <div className="mt-10 w-full max-w-xl">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
          Popüler Kategoriler
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {POPULAR_CATEGORIES.map((c) => (
            <li key={c.href}>
              <Link
                to={c.href}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-brand-300 hover:bg-slate-50"
              >
                <span className={('badge mr-3 ' + c.color).trim()}>{c.label.split(' ')[0]}</span>
                <span className="flex-1 text-left">{c.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
