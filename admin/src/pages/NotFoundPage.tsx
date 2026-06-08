import { Link, useLocation } from 'react-router-dom';
import {
  ShieldAlert, Home, ArrowLeft, Compass, Gavel, ListChecks,
  Users, Store, Wallet, Calendar, Settings, Shield, ClipboardCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface QuickLink {
  to: string;
  label: string;
  icon: React.ReactNode;
  area?: string;
  end?: boolean;
}

export default function NotFoundPage() {
  const location = useLocation();
  const { hasPermission, admin } = useAuth();
  const path = location.pathname;
  const isSuperAdmin = !!admin?.is_super_admin;

  const ALL_QUICK_LINKS: QuickLink[] = [
    { to: '/', label: 'Dashboard', icon: <Home className="h-4 w-4" />, end: true },
    { to: '/auctions', label: 'Açık Arttırmalar', icon: <Gavel className="h-4 w-4" />, area: 'auctions' },
    { to: '/free-listings', label: 'Ücretsiz İlanlar', icon: <ListChecks className="h-4 w-4" />, area: 'free_listings' },
    { to: '/slots', label: 'Slotlar', icon: <Calendar className="h-4 w-4" />, area: 'auctions' },
    { to: '/expertise', label: 'Ekspertiz', icon: <ClipboardCheck className="h-4 w-4" />, area: 'expertise' },
    { to: '/users', label: 'Kullanıcılar', icon: <Users className="h-4 w-4" />, area: 'users' },
    { to: '/dealerships', label: 'Bayilikler', icon: <Store className="h-4 w-4" />, area: 'dealerships' },
    { to: '/transactions', label: 'İşlemler', icon: <Wallet className="h-4 w-4" />, area: 'transactions' },
    { to: '/settings', label: 'Site Ayarları', icon: <Settings className="h-4 w-4" />, area: 'site_settings' },
    { to: '/authorization', label: 'Yetkilendirme', icon: <Shield className="h-4 w-4" />, area: 'authorization' },
  ];

  const visibleLinks = ALL_QUICK_LINKS.filter(
    (l) => !l.area || hasPermission(l.area, 'view') || isSuperAdmin,
  );

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full text-center">
        <div className="mx-auto h-24 w-24 rounded-2xl bg-gradient-to-br from-amber-100 to-red-100 text-amber-600 flex items-center justify-center shadow-inner">
          <ShieldAlert className="h-12 w-12" strokeWidth={1.5} />
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Sayfa bulunamadı
        </h1>
        <p className="mt-2 text-base text-slate-500 max-w-md mx-auto">
          Aradığınız sayfa kaldırılmış, taşınmış ya da hiç var olmamış olabilir.
        </p>

        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-mono text-slate-600">
          <Compass className="h-3.5 w-3.5" />
          <span>{path}</span>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link to="/" className="btn-primary">
            <Home className="h-4 w-4" /> Dashboard'a dön
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft className="h-4 w-4" /> Önceki Sayfa
          </button>
        </div>

        <div className="mt-12">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Hızlı Erişim
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {visibleLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="card flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-sky-300 hover:text-sky-700 transition"
              >
                <span className="text-slate-400">{l.icon}</span>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-10 text-[11px] text-slate-400">
          HTTP 404 · <span className="font-mono">{path}</span>
        </div>
      </div>
    </div>
  );
}
