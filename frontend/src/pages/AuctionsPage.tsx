import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Gavel, Search, Clock, Calendar,
  Gauge, Fuel, Settings2, Loader2, Sparkles, Trophy, Play,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatPrice, cn } from '../lib/utils';
import { Countdown } from '../components/Countdown';
import { LiveBidPill } from '../components/LiveBidPill';
import { SoldStamp } from '../components/SoldStamp';

interface AuctionRow {
  id: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  opening_price: number;
  current_price: number;
  bid_increment: number;
  total_bids: number;
  start_at: string;
  end_at: string;
  live_started_at: string | null;
  live_ends_at: string | null;
  ended_at: string | null;
  final_price: number | null;
  vehicle: {
    id: string;
    title: string;
    year: number;
    km: number;
    fuel: string;
    transmission: string;
    city: string;
    price: number;
    status: string;
    listing_type: string;
    sold_at: string | null;
    brand?: { name: string } | null;
    model?: { name: string } | null;
    images?: { url: string; sort_order: number }[];
  } | null;
  slot?: { slot_date: string; start_time: string; end_time: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Yakında',
  live: 'Canlı',
  ended: 'Onay Bekliyor',
  sold: 'Satıldı',
  sold_pending_confirmation: 'Onay Sürecinde',
  cancelled: 'İptal',
};
const STATUS_CLASS: Record<string, string> = {
  scheduled: 'bg-sky-100 text-sky-700',
  live: 'bg-red-100 text-red-700',
  ended: 'bg-amber-100 text-amber-700',
  sold: 'bg-emerald-100 text-emerald-700',
  sold_pending_confirmation: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-slate-100 text-slate-500',
};

type Tab = 'incoming' | 'live' | 'sold';

export default function AuctionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // ?tab=sold, ?tab=live, ?tab=incoming ile URL'den tab al (default 'live')
  const initialTab = (searchParams.get('tab') as Tab) || 'live';
  const [tab, setTab] = useState<Tab>(
    ['incoming', 'live', 'sold'].includes(initialTab) ? initialTab : 'live'
  );
  const [search, setSearch] = useState('');

  // Tab değiştiğinde URL'yi güncelle
  function handleTabChange(newTab: Tab) {
    setTab(newTab);
    setSearchParams({ tab: newTab }, { replace: true });
  }

  const statusMap: Record<Tab, string[]> = {
    incoming: ['scheduled'],
    live: ['live'],
    sold: ['ended', 'sold', 'sold_pending_confirmation'],
  };

  const auctionsQ = useQuery({
    queryKey: ['public-auctions', tab],
    queryFn: async () => {
      const statuses = statusMap[tab];
      const { data, error } = await supabase
        .from('auctions')
        .select(`
          id, status, opening_price, current_price, bid_increment, total_bids,
          start_at, end_at, live_started_at, live_ends_at, ended_at, final_price,
          vehicle:vehicles(
            id, title, year, km, fuel, transmission, city, price, status, listing_type, sold_at,
            brand:vehicle_brands(name),
            model:vehicle_models(name),
            images:vehicle_images(url, sort_order)
          ),
          slot:auction_slots(slot_date, start_time, end_time)
        `)
        .in('status', statuses)
        .order(tab === 'incoming' ? 'start_at' : tab === 'live' ? 'live_ends_at' : 'ended_at', { ascending: tab !== 'sold' });
      if (error) throw error;
      return (data ?? []) as unknown as AuctionRow[];
    },
    refetchInterval: tab === 'live' ? 30_000 : 60_000,
  });

  const rows = auctionsQ.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((a) =>
      (a.vehicle?.title || '').toLowerCase().includes(s) ||
      (a.vehicle?.brand?.name || '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  // Tabs stats
  const allQ = useQuery({
    queryKey: ['public-auctions-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('auctions')
        .select('id, status, vehicle:vehicles(status)');
      const rows = (data ?? []) as any[];
      return {
        incoming: rows.filter((r) => r.status === 'scheduled').length,
        live: rows.filter((r) => r.status === 'live').length,
        sold: rows.filter((r) => r.status === 'ended').length,
      };
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-2">
          <Gavel className="h-7 w-7 text-rose-600" /> Açık Arttırmalar
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Mezatlar canlı yayında. Teklif ver, en iyi fiyatı yakala!
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        <TabButton active={tab === 'live'} onClick={() => handleTabChange('live')} icon={<Play className="h-4 w-4" />} count={allQ.data?.live}>
          Canlı Mezatlar
        </TabButton>
        <TabButton active={tab === 'incoming'} onClick={() => handleTabChange('incoming')} icon={<Clock className="h-4 w-4" />} count={allQ.data?.incoming}>
          Çıkacak Olanlar
        </TabButton>
        <TabButton active={tab === 'sold'} onClick={() => handleTabChange('sold')} icon={<Trophy className="h-4 w-4" />} count={allQ.data?.sold}>
          Satılanlar
        </TabButton>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text" placeholder="Marka, model veya başlık ara..."
            value={search} onChange={(e) => setSearch(e.target.value)} className="input pl-9"
          />
        </div>
      </div>

      {auctionsQ.isLoading ? (
        <div className="card p-12 text-center">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400 mx-auto" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Gavel className="h-12 w-12 text-slate-300 mx-auto" />
          <h3 className="text-lg font-semibold text-slate-700 mt-2">
            {tab === 'live' && 'Şu anda canlı mezat yok'}
            {tab === 'incoming' && 'Yakında çıkacak mezat yok'}
            {tab === 'sold' && 'Henüz satılan araç yok'}
          </h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => {
            const v = a.vehicle;
            if (!v) return null;
            const images = (v.images ?? []).sort((x, y) => (x.sort_order || 0) - (y.sort_order || 0));
            const thumb = images[0]?.url;
            return (
              <Link
                key={a.id}
                to={`/ilan/${v.id}`}
                className={cn('card overflow-hidden hover:shadow-lg transition group',
                  a.status === 'live' && 'border-2 border-red-300',
                  a.status === 'ended' && 'border-2 border-emerald-200',
                )}
              >
                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                  {thumb ? (
                    <img src={thumb} alt={v.title} className="h-full w-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                      <Gavel className="h-12 w-12" />
                    </div>
                  )}
                  {(a.status === 'ended' || a.status === 'sold' || a.status === 'sold_pending_confirmation') && <SoldStamp variant="full" />}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold',
                      STATUS_CLASS[a.status])}>
                      {a.status === 'live' && <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
                      {STATUS_LABELS[a.status]}
                    </span>
                    {v.listing_type === 'premium_auction' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                        <Sparkles className="h-3 w-3" /> Premium
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide">
                      {v.brand?.name} {v.model?.name}
                    </div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{v.title}</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {v.year}</div>
                    <div className="flex items-center gap-1"><Gauge className="h-3 w-3" /> {v.km.toLocaleString('tr-TR')} km</div>
                    <div className="flex items-center gap-1"><Fuel className="h-3 w-3" /> {v.fuel}</div>
                    <div className="flex items-center gap-1"><Settings2 className="h-3 w-3" /> {v.transmission}</div>
                  </div>

                  {/* Countdown + fiyat by tab */}
                  {a.status === 'scheduled' && a.start_at && (
                    <div className="pt-2 border-t border-amber-100 bg-amber-50 -mx-4 -mb-4 px-4 py-2 mt-2">
                      <div className="text-[10px] text-amber-700 uppercase font-semibold mb-0.5">Mezat Başlangıcına</div>
                      <Countdown target={a.start_at} format="full" variant="default" />
                    </div>
                  )}
                  {a.status === 'live' && a.live_ends_at && (
                    <div className="pt-2 border-t border-emerald-200 bg-emerald-50 -mx-4 -mb-4 px-4 py-2 mt-2">
                      <div className="text-[10px] text-emerald-700 uppercase font-semibold mb-0.5">Mezat Bitişine</div>
                      <Countdown target={a.live_ends_at} format="short" variant="default" />
                    </div>
                  )}
                  {a.status === 'ended' && (
                    <div className="pt-2 border-t border-emerald-100">
                      <div className="text-[10px] text-slate-500 uppercase">Satış Fiyatı</div>
                      <div className="text-xl font-extrabold text-emerald-600">
                        {formatPrice(a.final_price ?? a.current_price)}
                      </div>
                    </div>
                  )}

                  {/* Fiyat bilgisi */}
                  {a.status === 'scheduled' && (
                    <div className="pt-2 border-t border-slate-100">
                      <div className="text-xs text-slate-500">Açılış Fiyatı</div>
                      <div className="text-base font-extrabold text-slate-800">{formatPrice(a.opening_price)}</div>
                    </div>
                  )}
                  {a.status === 'live' && (
                    <LiveBidPill amount={a.current_price} totalBids={a.total_bids} size="md" />
                  )}

                  {a.slot && (
                    <div className="text-xs text-slate-500 flex items-center gap-1 pt-1">
                      <Calendar className="h-3 w-3" /> {a.slot.slot_date}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active, onClick, icon, count, children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition',
        active ? 'border-rose-600 text-rose-700' : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300',
      )}
    >
      {icon}
      {children}
      {count !== undefined && (
        <span className={cn('rounded-full px-2 py-0.5 text-xs font-bold',
          active ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600')}>
          {count}
        </span>
      )}
    </button>
  );
}
