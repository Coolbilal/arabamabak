import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, Car, Gavel, BadgePlus, Banknote, Store,
  TrendingUp, TrendingDown, RefreshCw, Loader2, AlertCircle,
  ShieldCheck, Wallet,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatPrice, formatDate, cn } from '../lib/utils';
import type { Transaction, AuctionStatus, TxStatus, TxType } from '../lib/types';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number | null; // yüzde
  iconClass?: string;
  loading?: boolean;
}

function StatCard({ label, value, icon, trend, iconClass, loading }: StatCardProps) {
  const positive = (trend ?? 0) >= 0;
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : value}
          </p>
          {trend !== undefined && trend !== null && (
            <div className={cn(
              'mt-2 inline-flex items-center gap-1 text-xs font-semibold',
              positive ? 'text-emerald-600' : 'text-red-600',
            )}>
              {positive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(trend).toFixed(1)}% <span className="text-slate-400 font-normal">son 7 gün</span>
            </div>
          )}
        </div>
        <div className={cn(
          'h-11 w-11 rounded-xl flex items-center justify-center text-white shrink-0',
          iconClass || 'bg-sky-600',
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
}

interface TxWithUser extends Transaction {
  user?: { full_name: string | null; email: string | null } | null;
}

const TX_TYPE_LABELS: Record<TxType, string> = {
  deposit: 'Yatırma', withdraw: 'Çekme', payment: 'Ödeme', refund: 'İade',
  auction_payment: 'Açık Arttırma Ödemesi',
  premium_payment: 'Premium Ödemesi',
  expertise_payment: 'Ekspertiz Ödemesi',
  corporate_listing_fee: 'Kurumsal İlan Geliri',
  excess_listing_fee: 'Kota Aşımı Geliri',
};

const TX_STATUS_LABELS: Record<TxStatus, string> = {
  pending: 'Beklemede', completed: 'Tamamlandı', failed: 'Başarısız', cancelled: 'İptal',
};

const TX_STATUS_CLASS: Record<TxStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-200 text-slate-700',
};

function getDateKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function last7Days(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
}

export default function DashboardPage() {
  const { admin } = useAuth();

  // 7 gün pencereleri
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const isoNow = now.toISOString();
  const iso7 = sevenDaysAgo.toISOString();
  const iso14 = fourteenDaysAgo.toISOString();
  const todayStr = now.toISOString().slice(0, 10);

  // ---- Counts ----
  const profilesCount = useQuery({
    queryKey: ['dash', 'profiles-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles').select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const profilesPrev = useQuery({
    queryKey: ['dash', 'profiles-prev'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('profiles').select('*', { count: 'exact', head: true })
        .lt('created_at', iso7);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const vehiclesActive = useQuery({
    queryKey: ['dash', 'vehicles-active'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('vehicles').select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
  });

  const auctionsLive = useQuery({
    queryKey: ['dash', 'auctions-live'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('auctions').select('*', { count: 'exact', head: true })
        .eq('status', 'live' as AuctionStatus);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const vehiclesToday = useQuery({
    queryKey: ['dash', 'vehicles-today'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('vehicles').select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00`)
        .lte('created_at', `${todayStr}T23:59:59`);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const txCompleted = useQuery({
    queryKey: ['dash', 'tx-completed'],
    queryFn: async () => {
      // Ciro = platform gelirleri (kullanıcı cüzdan hareketleri hariç)
      const { data, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'completed')
        .in('type', [
          'premium_payment',         // İlan verme ücreti
          'auction_payment',         // Açık arttırma modül ücreti
          'expertise_payment',       // Ekspertiz talep ücreti
          'corporate_listing_fee',   // Kurumsal/galeri ücretsiz ilan geliri
          'excess_listing_fee',      // Bireysel kota aşımı geliri
        ]);
      if (error) throw error;
      return (data ?? []).reduce((s, r: any) => s + Number(r.amount || 0), 0);
    },
  });

  // Tip bazlı kazançlar (bugün)
  const txByTypeToday = useQuery({
    queryKey: ['dash', 'tx-by-type-today'],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('status', 'completed')
        .gte('completed_at', startOfDay.toISOString());
      if (error) throw error;
      const groups: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        groups[r.type] = (groups[r.type] ?? 0) + Number(r.amount);
      });
      return groups;
    },
  });

  const dealershipsActive = useQuery({
    queryKey: ['dash', 'dealerships-active'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('dealerships').select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      if (error) throw error;
      return count ?? 0;
    },
  });

  // ---- Trend: son 7 gün vs önceki 7 gün (vehicles) ----
  const trendVehicles = useQuery({
    queryKey: ['dash', 'trend-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles').select('created_at')
        .gte('created_at', iso14).lte('created_at', isoNow);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ created_at: string }>;
      const last7 = rows.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length;
      const prev7 = rows.filter((r) => new Date(r.created_at) < sevenDaysAgo).length;
      return { last7, prev7 };
    },
  });

  // ---- Trend: son 7 gün vs önceki 7 gün (bids) ----
  const trendBids = useQuery({
    queryKey: ['dash', 'trend-bids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids').select('created_at')
        .gte('created_at', iso14).lte('created_at', isoNow);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ created_at: string }>;
      const last7 = rows.filter((r) => new Date(r.created_at) >= sevenDaysAgo).length;
      const prev7 = rows.filter((r) => new Date(r.created_at) < sevenDaysAgo).length;
      return { last7, prev7 };
    },
  });

  // ---- 7 günlük yeni ilanlar (bar) ----
  const last7Vehicles = useQuery({
    queryKey: ['dash', 'last7-vehicles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles').select('created_at')
        .gte('created_at', iso7);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ---- 7 günlük yeni teklifler (line) ----
  const last7Bids = useQuery({
    queryKey: ['dash', 'last7-bids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids').select('created_at')
        .gte('created_at', iso7);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ---- Son 10 işlem ----
  const recentTx = useQuery({
    queryKey: ['dash', 'recent-tx'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('id,user_id,type,amount,status,description,created_at, completed_at, profiles:user_id(full_name,email)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return (data ?? []) as unknown as TxWithUser[];
    },
  });

  // Yüzde trend hesaplama
  function pct(curr: number, prev: number): number | null {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  }

  const listingsTrendPct = useMemo(() => {
    if (!trendVehicles.data) return null;
    return pct(trendVehicles.data.last7, trendVehicles.data.prev7);
  }, [trendVehicles.data]);

  const bidsTrendPct = useMemo(() => {
    if (!trendBids.data) return null;
    return pct(trendBids.data.last7, trendBids.data.prev7);
  }, [trendBids.data]);

  // 7 günlük serileri gün bazında doldur
  const days = last7Days();
  const vehicleSeries = days.map((d) => ({
    date: d,
    label: dayLabel(d),
    count: ((last7Vehicles.data ?? []) as Array<{ created_at: string }>)
      .filter((r) => getDateKey(r.created_at) === d).length,
  }));
  const bidSeries = days.map((d) => ({
    date: d,
    label: dayLabel(d),
    count: ((last7Bids.data ?? []) as Array<{ created_at: string }>)
      .filter((r) => getDateKey(r.created_at) === d).length,
  }));

  const isLoadingAny =
    profilesCount.isLoading || vehiclesActive.isLoading || auctionsLive.isLoading ||
    vehiclesToday.isLoading || txCompleted.isLoading || dealershipsActive.isLoading;

  function refreshAll() {
    profilesCount.refetch();
    vehiclesActive.refetch();
    auctionsLive.refetch();
    vehiclesToday.refetch();
    txCompleted.refetch();
    dealershipsActive.refetch();
    trendVehicles.refetch();
    trendBids.refetch();
    last7Vehicles.refetch();
    last7Bids.refetch();
    recentTx.refetch();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Hoş geldin{admin?.is_super_admin ? ' Süper Admin' : ''}{admin?.full_name ? `, ${admin.full_name}` : ''}.
            Sitenin güncel durumuna genel bakış.
          </p>
        </div>
        <button onClick={refreshAll} className="btn-secondary">
          <RefreshCw className="h-4 w-4" /> Yenile
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Toplam Kullanıcı"
          value={(profilesCount.data ?? 0).toLocaleString('tr-TR')}
          icon={<Users className="h-5 w-5" />}
          iconClass="bg-sky-600"
          trend={useMemo(() => {
            const curr = profilesCount.data ?? 0;
            const prev = profilesPrev.data ?? 0;
            return pct(curr, prev);
          }, [profilesCount.data, profilesPrev.data])}
          loading={profilesCount.isLoading}
        />
        <StatCard
          label="Toplam İlan (Aktif)"
          value={(vehiclesActive.data ?? 0).toLocaleString('tr-TR')}
          icon={<Car className="h-5 w-5" />}
          iconClass="bg-emerald-600"
          trend={listingsTrendPct}
          loading={vehiclesActive.isLoading}
        />
        <StatCard
          label="Aktif Açık Arttırma"
          value={(auctionsLive.data ?? 0).toLocaleString('tr-TR')}
          icon={<Gavel className="h-5 w-5" />}
          iconClass="bg-indigo-600"
          loading={auctionsLive.isLoading}
        />
        <StatCard
          label="Bugünkü Yeni İlanlar"
          value={(vehiclesToday.data ?? 0).toLocaleString('tr-TR')}
          icon={<BadgePlus className="h-5 w-5" />}
          iconClass="bg-amber-500"
          loading={vehiclesToday.isLoading}
        />
        <StatCard
          label="Toplam Ciro"
          value={formatPrice(txCompleted.data ?? 0)}
          icon={<Banknote className="h-5 w-5" />}
          iconClass="bg-rose-600"
          loading={txCompleted.isLoading}
        />
        <StatCard
          label="Aktif Bayi"
          value={(dealershipsActive.data ?? 0).toLocaleString('tr-TR')}
          icon={<Store className="h-5 w-5" />}
          iconClass="bg-violet-600"
          loading={dealershipsActive.isLoading}
        />
      </div>

      {/* Günlük Kazanç Dağılımı */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
        <StatCard
          label="İlan Ücreti Gelirleri (Bugün)"
          value={formatPrice(txByTypeToday.data?.premium_payment ?? 0)}
          icon={<BadgePlus className="h-5 w-5" />}
          iconClass="bg-emerald-500"
          loading={txByTypeToday.isLoading}
        />
        <StatCard
          label="Açık Arttırma Modül Ücreti (Bugün)"
          value={formatPrice(txByTypeToday.data?.auction_payment ?? 0)}
          icon={<Gavel className="h-5 w-5" />}
          iconClass="bg-rose-500"
          loading={txByTypeToday.isLoading}
        />
        <StatCard
          label="Ekspertiz Kazançları (Bugün)"
          value={formatPrice(txByTypeToday.data?.expertise_payment ?? 0)}
          icon={<ShieldCheck className="h-5 w-5" />}
          iconClass="bg-sky-500"
          loading={txByTypeToday.isLoading}
        />
        <StatCard
          label="Ücretsiz İlan Gelirleri (Bugün)"
          value={formatPrice(
            (txByTypeToday.data?.corporate_listing_fee ?? 0) +
            (txByTypeToday.data?.excess_listing_fee ?? 0)
          )}
          icon={<BadgePlus className="h-5 w-5" />}
          iconClass="bg-amber-500"
          loading={txByTypeToday.isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Son 7 Gün - Yeni İlanlar</h3>
              <p className="text-xs text-slate-500">Günlük eklenen araç ilanı sayısı</p>
            </div>
            {bidsTrendPct !== null && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                bidsTrendPct >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}>
                {bidsTrendPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(bidsTrendPct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="h-64">
            {last7Vehicles.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yükleniyor…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={vehicleSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    cursor={{ fill: 'rgba(14,165,233,0.08)' }}
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Bar dataKey="count" name="Yeni İlan" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Son 7 Gün - Yeni Teklifler</h3>
              <p className="text-xs text-slate-500">Açık arttırmalara yapılan günlük teklif</p>
            </div>
            {listingsTrendPct !== null && (
              <span className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                listingsTrendPct >= 0 ? 'text-emerald-600' : 'text-red-600',
              )}>
                {listingsTrendPct >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {Math.abs(listingsTrendPct).toFixed(1)}%
              </span>
            )}
          </div>
          <div className="h-64">
            {last7Bids.isLoading ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Yükleniyor…
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={bidSeries} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                  <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Yeni Teklif"
                    stroke="#7c3aed"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#7c3aed' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Son 10 İşlem tablosu kaldırıldı - İşlem Geçmişi için sidebar kullanılıyor */}
    </div>
  );
}
