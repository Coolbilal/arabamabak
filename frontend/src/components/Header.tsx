import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatPrice } from '../lib/utils';
import {
  Car, ChevronDown, LogIn, UserPlus, FileEdit, ClipboardCheck,
  User, Wallet, Heart, MessageSquare, ListChecks, LogOut, Menu, X, Gavel,
} from 'lucide-react';
import type { SiteSettings } from '../lib/types';
import SmartLogo from './SmartLogo';

const CATEGORIES = [
  { key: 'live', label: 'Açık Arttırması Devam Eden Araçlar', href: '/kategori/live', color: 'bg-red-50 text-red-700' },
  { key: 'upcoming', label: 'Açık Arttırmaya Çıkacak Araçlar', href: '/kategori/upcoming', color: 'bg-amber-50 text-amber-700' },
  { key: 'free', label: 'Ücretsiz İlanlar', href: '/kategori/free', color: 'bg-emerald-50 text-emerald-700' },
];

export default function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [catOpen, setCatOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => {
      if (data) setSettings(data as unknown as SiteSettings);
    });
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
        {/* Logo (site name hidden when logo exists; size from settings) */}
        <Link to="/" className="flex items-center shrink-0 h-full">
          {settings?.logo_url ? (
            <SmartLogo
              src={settings.logo_url}
              alt={settings.site_name || 'Logo'}
              size={(settings.logo_size as 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | undefined) ?? 'md'}
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white">
                <Car className="h-5 w-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                {settings?.site_name ?? 'arabamabak'}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-2 flex-1 ml-6">
          <div className="relative" onMouseLeave={() => setCatOpen(false)}>
            <button
              onMouseEnter={() => setCatOpen(true)}
              onClick={() => setCatOpen((v) => !v)}
              className="btn-ghost"
            >
              Kategoriler <ChevronDown className={cn('h-4 w-4 transition', catOpen && 'rotate-180')} />
            </button>
            {catOpen && (
              <div className="absolute left-0 top-full pt-2 w-80 animate-fade-in">
                <div className="card overflow-hidden">
                  {CATEGORIES.map((c) => (
                    <Link
                      key={c.key}
                      to={c.href}
                      onClick={() => setCatOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 border-b last:border-0 border-slate-100"
                    >
                      <span className={cn('badge', c.color)}>{c.key === 'live' ? 'CANLI' : c.key === 'upcoming' ? 'YAKINDA' : 'ÜCRETSİZ'}</span>
                      <span className="text-sm font-medium text-slate-800">{c.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Link to="/muzayedeler" className="btn-ghost font-semibold text-rose-600">
            <Gavel className="h-4 w-4" /> Açık Arttırmalar
          </Link>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/ekspertiz" className="btn-ghost hidden md:inline-flex">
            <ClipboardCheck className="h-4 w-4" /> Ekspertiz Yaptır
          </Link>
          <Link to="/ilan-ver" className="btn-primary hidden md:inline-flex">
            <FileEdit className="h-4 w-4" /> İlan Ver
          </Link>

          {user ? (
            <div className="relative" onMouseLeave={() => setUserOpen(false)}>
              <button
                onMouseEnter={() => setUserOpen(true)}
                onClick={() => setUserOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 hover:bg-slate-50"
              >
                <div className="h-7 w-7 rounded-full bg-brand-600 text-white flex items-center justify-center text-xs font-bold">
                  {(profile?.full_name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                </div>
                <span className="hidden md:inline text-sm font-medium text-slate-700">
                  {profile?.full_name?.split(' ')[0] ?? 'Hesabım'}
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full pt-2 w-72 animate-fade-in">
                  <div className="card overflow-hidden">
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                      <div className="text-xs text-slate-500">Bakiye</div>
                      <div className="text-lg font-bold text-slate-900">
                        {formatPrice(profile?.wallet_balance ?? 0)}
                      </div>
                    </div>
                    <MenuItem to="/profil" icon={<User className="h-4 w-4" />} setOpen={setUserOpen}>Profilim</MenuItem>
                    <MenuItem to="/profil/cuzdan" icon={<Wallet className="h-4 w-4" />} setOpen={setUserOpen}>Cüzdanım</MenuItem>
                    <MenuItem to="/profil/ilanlarim" icon={<ListChecks className="h-4 w-4" />} setOpen={setUserOpen}>İlanlarım</MenuItem>
                    <MenuItem to="/profil/favoriler" icon={<Heart className="h-4 w-4" />} setOpen={setUserOpen}>Favorilerim</MenuItem>
                    <MenuItem to="/profil/mesajlar" icon={<MessageSquare className="h-4 w-4" />} setOpen={setUserOpen}>Mesajlarım</MenuItem>
                    <MenuItem to="/profil/ekspertiz" icon={<ClipboardCheck className="h-4 w-4" />} setOpen={setUserOpen}>Ekspertiz</MenuItem>
                    {isAdmin && (
                      <a href={(import.meta.env.VITE_ADMIN_URL as string) || 'https://admin.example.com'} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-slate-50">
                        <ListChecks className="h-4 w-4" /> Admin Panel
                      </a>
                    )}
                    <button
                      onClick={async () => { await signOut(); setUserOpen(false); navigate('/'); }}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 border-t border-slate-100"
                    >
                      <LogOut className="h-4 w-4" /> Çıkış Yap
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/giris" className="btn-ghost hidden sm:inline-flex">
                <LogIn className="h-4 w-4" /> Giriş
              </Link>
              <Link to="/kayit" className="btn-secondary hidden sm:inline-flex">
                <UserPlus className="h-4 w-4" /> Kayıt Ol
              </Link>
            </>
          )}

          <button onClick={() => setMobile((v) => !v)} className="lg:hidden btn-ghost p-2">
            {mobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobile && (
        <div className="lg:hidden border-t border-slate-200 bg-white px-4 py-3 space-y-1">
          {CATEGORIES.map((c) => (
            <Link key={c.key} to={c.href} onClick={() => setMobile(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50">
              <span className={cn('badge', c.color)}>{c.key === 'live' ? 'CANLI' : c.key === 'upcoming' ? 'YAKINDA' : 'ÜCRETSİZ'}</span>
              <span className="text-sm font-medium">{c.label}</span>
            </Link>
          ))}
          <Link to="/muzayedeler" onClick={() => setMobile(false)} className="btn-secondary w-full justify-center text-rose-600">
            <Gavel className="h-4 w-4" /> Açık Arttırmalar
          </Link>
          <Link to="/ilan-ver" onClick={() => setMobile(false)} className="btn-primary w-full justify-center">
            <FileEdit className="h-4 w-4" /> İlan Ver
          </Link>
          <Link to="/ekspertiz" onClick={() => setMobile(false)} className="btn-secondary w-full justify-center">
            <ClipboardCheck className="h-4 w-4" /> Ekspertiz Yaptır
          </Link>
          {!user && (
            <>
              <Link to="/giris" onClick={() => setMobile(false)} className="btn-secondary w-full justify-center">Giriş Yap</Link>
              <Link to="/kayit" onClick={() => setMobile(false)} className="btn-primary w-full justify-center">Kayıt Ol</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function MenuItem({ to, icon, children, setOpen }: { to: string; icon: React.ReactNode; children: React.ReactNode; setOpen: (v: boolean) => void }) {
  return (
    <Link to={to} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
      {icon} {children}
    </Link>
  );
}
