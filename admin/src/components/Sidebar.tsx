import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import {
  LayoutDashboard, ListChecks, ClipboardCheck, Settings,
  CreditCard, Shield, Store, Users, Wallet, Calendar, ChevronLeft, ChevronRight, LogOut, Car,
  Inbox, Clock, Play, CheckCircle2,
} from 'lucide-react';

interface Item {
  to: string;
  label: string;
  icon: React.ReactNode;
  area?: string;
  end?: boolean;
}

const ITEMS: Item[] = [
  { to: '/', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, end: true },
  { to: '/auction-applications', label: 'Açık Arttırma Başvuruları', icon: <Inbox className="h-5 w-5" />, area: 'auctions' },
  { to: '/auctions-incoming', label: 'Açık Arttırmaya Çıkacaklar', icon: <Clock className="h-5 w-5" />, area: 'auctions' },
  { to: '/auctions-live', label: 'Devam Eden Açık Arttırmalar', icon: <Play className="h-5 w-5" />, area: 'auctions' },
  { to: '/auctions-sold', label: 'Satılan Araçlar', icon: <CheckCircle2 className="h-5 w-5" />, area: 'auctions' },
  { to: '/free-listings', label: 'Ücretsiz İlanlar', icon: <ListChecks className="h-5 w-5" />, area: 'free_listings' },
  { to: '/pending-listings', label: 'Onay Bekleyenler', icon: <ClipboardCheck className="h-5 w-5" />, area: 'free_listings' },
  { to: '/expertise', label: 'Ekspertiz Talepleri', icon: <ClipboardCheck className="h-5 w-5" />, area: 'expertise' },
  { to: '/slots', label: 'Açık Arttırma Slotları', icon: <Calendar className="h-5 w-5" />, area: 'auctions' },
  { to: '/users', label: 'Kullanıcılar', icon: <Users className="h-5 w-5" />, area: 'users' },
  { to: '/dealerships', label: 'Bayilikler', icon: <Store className="h-5 w-5" />, area: 'dealerships' },
  { to: '/transactions', label: 'İşlem Geçmişi', icon: <Wallet className="h-5 w-5" />, area: 'transactions' },
  { to: '/settings', label: 'Site Ayarları', icon: <Settings className="h-5 w-5" />, area: 'site_settings' },
  { to: '/payment-methods', label: 'Ödeme Yöntemleri', icon: <CreditCard className="h-5 w-5" />, area: 'site_settings' },
  { to: '/authorization', label: 'Yetkilendirme', icon: <Shield className="h-5 w-5" />, area: 'authorization' },
];

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { admin, hasPermission, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={cn('bg-slate-900 text-slate-100 flex flex-col transition-all', collapsed ? 'w-16' : 'w-64')}>
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-brand-600 text-white flex items-center justify-center shrink-0">
            <Car className="h-5 w-5" />
          </div>
          {!collapsed && <span className="font-extrabold tracking-tight">arabamabak</span>}
        </div>
        <button onClick={onToggle} className="text-slate-400 hover:text-white">
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5">
        {ITEMS.map((it) => {
          if (it.area && !hasPermission(it.area, 'view') && !admin?.is_super_admin) return null;
          return (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 mx-2 px-3 py-2.5 rounded-lg text-sm font-medium transition',
                  isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800',
                  collapsed && 'justify-center'
                )
              }
              title={collapsed ? it.label : undefined}
            >
              {it.icon}
              {!collapsed && <span>{it.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-3">
        {!collapsed && admin && (
          <div className="mb-2 px-2">
            <div className="text-xs text-slate-500">Yönetici</div>
            <div className="text-sm font-semibold text-slate-100 truncate">{admin.full_name || admin.username}</div>
            {admin.is_super_admin && <span className="badge bg-amber-500/20 text-amber-300 mt-1">Süper Admin</span>}
          </div>
        )}
        <button
          onClick={async () => { await signOut(); navigate('/giris'); }}
          className={cn('flex items-center gap-2 w-full px-3 py-2 text-sm text-red-300 hover:bg-red-500/10 rounded-lg', collapsed && 'justify-center')}
        >
          <LogOut className="h-4 w-4" /> {!collapsed && 'Çıkış Yap'}
        </button>
      </div>
    </aside>
  );
}
