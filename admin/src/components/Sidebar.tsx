import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import {
  LayoutDashboard, ListChecks, ClipboardCheck, Settings,
  CreditCard, Shield, Store, Users, Wallet, Calendar, ChevronLeft, ChevronRight, LogOut, Car,
  Inbox, Clock, Play, CheckCircle2, Palette, Megaphone, Image, Building2,
  CarFront, Banknote, ChevronDown, Briefcase, FileCheck, Activity, FileText, Filter, Tags,
} from 'lucide-react';
import { useState } from 'react';

interface Item {
  to: string;
  label: string;
  icon: React.ReactNode;
  area?: string;
  end?: boolean;
}

interface Group {
  id: string;
  label: string;
  icon: React.ReactNode;
  area?: string;
  items: Item[];
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
  { to: '/corporate-applications', label: 'Kurumsal Başvurular', icon: <Building2 className="h-5 w-5" />, area: 'corporate_applications' },
  { to: '/transactions', label: 'İşlem Geçmişi', icon: <Wallet className="h-5 w-5" />, area: 'transactions' },
  { to: '/payments', label: '💰 Hakediş ve Ödemeler', icon: <Banknote className="h-5 w-5" />, area: 'payments' },
  { to: '/settings', label: 'Site Ayarları', icon: <Settings className="h-5 w-5" />, area: 'site_settings' },
  { to: '/site/tema', label: 'Tema', icon: <Palette className="h-5 w-5" />, area: 'site_settings' },
  { to: '/site/reklamlar', label: 'Reklamlar', icon: <Megaphone className="h-5 w-5" />, area: 'site_settings' },
  { to: '/eids-settings', label: 'EİDS Yapılandırma', icon: <FileCheck className="h-5 w-5" />, area: 'site_settings' },
  { to: '/eids-logs', label: 'EİDS Sorgu Logları', icon: <Activity className="h-5 w-5" />, area: 'site_settings' },
  { to: '/info-pages', label: 'Bilgi Bankası', icon: <FileText className="h-5 w-5" />, area: 'site_settings' },
  { to: '/catalog', label: 'Filtreleme Yönetimi', icon: <Filter className="h-5 w-5" />, area: 'catalog' },
  { to: '/site/logolar', label: 'Logolar', icon: <Image className="h-5 w-5" />, area: 'site_settings' },
  { to: '/payment-methods', label: 'Ödeme Yöntemleri', icon: <CreditCard className="h-5 w-5" />, area: 'site_settings' },
  { to: '/authorization', label: 'Yetkilendirme', icon: <Shield className="h-5 w-5" />, area: 'authorization' },
];

// Gruplu alt menüler (expand/collapse)
const GROUPS: Group[] = [
  {
    id: 'valet',
    label: 'Eksper Valeler',
    icon: <CarFront className="h-5 w-5" />,
    area: 'valet_applications',
    items: [
      { to: '/expert-valet-applications', label: 'Vale Başvuruları', icon: <Inbox className="h-4 w-4" />, area: 'valet_applications' },
      { to: '/expert-valets', label: 'Aktif Valeler', icon: <Users className="h-4 w-4" />, area: 'valet_applications' },
      { to: '/payments?type=valet', label: 'Vale Ödemeleri', icon: <Banknote className="h-4 w-4" />, area: 'payments' },
    ],
  },
  {
    id: 'franchise',
    label: 'Ekspertiz Bayileri',
    icon: <Briefcase className="h-5 w-5" />,
    area: 'franchise_applications',
    items: [
      { to: '/expertise-dealership-applications', label: 'Bayi Başvuruları', icon: <Inbox className="h-4 w-4" />, area: 'franchise_applications' },
      { to: '/expertise-dealerships', label: 'Aktif Bayiler', icon: <Store className="h-4 w-4" />, area: 'franchise_applications' },
      { to: '/payments?type=franchise', label: 'Bayi Ödemeleri', icon: <Banknote className="h-4 w-4" />, area: 'payments' },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const { admin, hasPermission, signOut } = useAuth();
  const navigate = useNavigate();

  // Aktif gruplar (expand/collapse)
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    valet: false,
    franchise: false,
  });

  function toggleGroup(id: string) {
    setOpenGroups(prev => ({ ...prev, [id]: !prev[id] }));
  }

  // Permission check helper
  function canSeeItem(it: Item): boolean {
    if (!it.area) return true;
    if (admin?.is_super_admin) return true;
    return hasPermission(it.area, 'view');
  }

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
        {/* Standart menü öğeleri */}
        {ITEMS.filter(canSeeItem).map((it) => (
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
        ))}

        {/* Gruplu menüler */}
        {!collapsed && GROUPS.map((g) => {
          if (g.area && !admin?.is_super_admin && !hasPermission(g.area, 'view')) return null;
          const visibleItems = g.items.filter(canSeeItem);
          if (visibleItems.length === 0) return null;
          return (
            <div key={g.id} className="mt-2">
              <button
                onClick={() => toggleGroup(g.id)}
                className="w-full mx-2 px-3 py-2.5 flex items-center justify-between rounded-lg text-sm font-bold text-slate-200 hover:bg-slate-800 transition"
                style={{ width: 'calc(100% - 1rem)' }}
              >
                <span className="flex items-center gap-3">
                  {g.icon}
                  <span>{g.label}</span>
                </span>
                {openGroups[g.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {openGroups[g.id] && (
                <div className="mt-1 space-y-0.5">
                  {visibleItems.map((it) => (
                    <NavLink
                      key={it.to}
                      to={it.to}
                      className={({ isActive }) =>
                        cn(
                          'flex items-center gap-3 mx-2 pl-11 pr-3 py-2 rounded-lg text-sm transition',
                          isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                        )
                      }
                    >
                      {it.icon}
                      <span>{it.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
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
