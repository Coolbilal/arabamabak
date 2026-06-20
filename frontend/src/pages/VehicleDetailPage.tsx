import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SoldStamp } from '../components/SoldStamp';
import { cn, formatDate, formatDateOnly, formatKm, formatPrice, timeUntil } from '../lib/utils';
import CountdownTimer from '../components/CountdownTimer';
import type {
  Auction,
  Bid,
  Conversation,
  Favorite,
  Profile,
  Vehicle,
  VehicleBrand,
  VehicleImage,
  VehicleModel,
} from '../lib/types';
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Fuel,
  Gavel,
  Heart,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Palette,
  Phone,
  Settings2,
  ShieldCheck,
  X,
  XCircle,
} from 'lucide-react';

type FullVehicle = Vehicle & {
  brand: VehicleBrand | null;
  model: VehicleModel | null;
  images: VehicleImage[];
  seller: Profile | null;
  auction: Auction | null;
};

type BidWithBidder = Bid & { bidder: Pick<Profile, 'id' | 'full_name' | 'email'> | null };

export default function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [galleryIdx, setGalleryIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const qcKey = useMemo(() => ['vehicle', id] as const, [id]);

  const vehicle = useQuery({
    queryKey: qcKey,
    enabled: !!id,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vehicles')
        .select(
          '*, brand:vehicle_brands(*), model:vehicle_models(*), images:vehicle_images(*), seller:profiles!vehicles_seller_id_fkey(*), auction:auctions!auctions_vehicle_id_fkey(*)',
        )
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as FullVehicle | null;
    },
  });

  // Increment view count once per page load
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data: current } = await supabase
        .from('vehicles')
        .select('view_count')
        .eq('id', id)
        .maybeSingle();
      const currentCount = (current as unknown as { view_count: number } | null)?.view_count ?? 0;
      if (cancelled) return;
      await supabase
        .from('vehicles')
        .update({ view_count: currentCount + 1 })
        .eq('id', id)
        .select('view_count')
        .single();
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const isFavorite = useQuery({
    queryKey: ['favorite', id, user?.id],
    enabled: !!user && !!id,
    staleTime: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user!.id)
        .eq('vehicle_id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Favorite | null) ?? null;
    },
  });

  const favoriteMut = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Giriş yapmalısınız');
      if (isFavorite.data) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('vehicle_id', id!);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, vehicle_id: id! });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorite', id, user?.id] });
    },
  });

  const bids = useQuery({
    queryKey: ['bids', vehicle.data?.auction?.id],
    enabled: !!vehicle.data?.auction?.id,
    staleTime: 5_000,
    queryFn: async () => {
      const auctionId = vehicle.data!.auction!.id;
      const { data, error } = await supabase
        .from('bids')
        .select('*, bidder:profiles!bids_bidder_id_fkey(id, full_name, email)')
        .eq('auction_id', auctionId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as BidWithBidder[];
    },
  });

  // Realtime bids + auction + seat changes
  const realtimeAuctionId = vehicle.data?.auction?.id;
  useEffect(() => {
    const auctionId = realtimeAuctionId;
    if (!auctionId) return;
    const channel = supabase
      .channel(`auction-live-${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bids', auctionId] });
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'auction_seat_holds', filter: `auction_id=eq.${auctionId}` },
        () => {
          if (user) queryClient.invalidateQueries({ queryKey: ['my-seat', auctionId, user.id] });
          queryClient.invalidateQueries({ queryKey: ['seat-count', auctionId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeAuctionId]);

  const startConversation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Giriş yapmalısınız');
      if (!vehicle.data?.seller) throw new Error('Satıcı bilgisi bulunamadı');
      const sellerId = vehicle.data.seller.id;
      if (sellerId === user.id) throw new Error('Kendi ilanınıza mesaj gönderemezsiniz');
      const [a, b] = [user.id, sellerId].sort();
      // Try existing
      const { data: existing } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_a', a)
        .eq('participant_b', b)
        .eq('vehicle_id', vehicle.data.id)
        .maybeSingle();
      if (existing) return existing as unknown as Conversation;
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          participant_a: a,
          participant_b: b,
          vehicle_id: vehicle.data.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Conversation;
    },
    onSuccess: () => navigate('/profil/mesajlar'),
  });

  if (vehicle.isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-500">
        <Loader2 className="inline h-6 w-6 animate-spin mr-2" /> Yükleniyor…
      </div>
    );
  }
  if (vehicle.isError) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="card p-6 text-center text-red-600">
          <AlertCircle className="mx-auto h-8 w-8" />
          <p className="mt-2">İlan yüklenirken hata oluştu: {(vehicle.error as Error).message}</p>
        </div>
      </div>
    );
  }
  if (!vehicle.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-500">İlan bulunamadı.</div>
    );
  }

  const v = vehicle.data;
  const auction = v.auction;
  const isOwnListing = user?.id === v.seller_id;

  // Auto-reveal RPC çağrısı kaldırıldı — Supabase trigger ile yapılacak

  // İletişim sadece onaylanmış kazanan kullanıcıya açılır
  // Açık arttırma süresince (live/scheduled) HERKES İÇİN GİZLİ
  const isAuctionActive = auction?.status === 'live' || auction?.status === 'scheduled';
  const isApprovedWinner = Boolean(
    auction?.winner_id === user?.id &&
    (auction?.contact_reveal_approved_at || auction?.seller_confirmed) &&
    !auction?.seller_rejected_at
  );
  const contactHiddenForUser =
    !!auction &&
    v.contact_hidden &&
    (isAuctionActive || !isApprovedWinner) &&
    v.contact_revealed_to !== user?.id;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to="/" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ChevronLeft className="h-4 w-4" /> Geri
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">
        {/* Gallery + Content */}
        <div className="space-y-4">
          <Gallery
            images={v.images}
            activeIdx={galleryIdx}
            setActive={setGalleryIdx}
            onOpenLightbox={() => setLightbox(true)}
            title={v.title}
            isSold={v.status === 'sold'}
          />
          <div className="card p-5">
            <div className="text-sm text-slate-500">
              {v.brand?.name ?? 'Marka'} {v.model?.name ? `· ${v.model.name}` : ''} · {v.year}
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{v.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {v.is_premium && <span className="badge bg-amber-500 text-white">PREMIUM</span>}
              {v.listing_type !== 'free' && (
                <span className="badge bg-red-600 text-white">AÇIK ARTTIRMA</span>
              )}
              {v.listing_type === 'free' && <span className="badge bg-emerald-600 text-white">ÜCRETSİZ</span>}
              {v.damage_record && <span className="badge bg-orange-100 text-orange-700">Hasar Kaydı Var</span>}
              {v.exchange_accepted && <span className="badge bg-blue-100 text-blue-700">Takas Kabul</span>}
              <span className="badge bg-slate-100 text-slate-700">
                <Eye className="h-3 w-3 mr-1" /> {v.view_count} görüntülenme
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <SpecRow icon={<Calendar className="h-4 w-4" />} label="Yıl" value={String(v.year)} />
              <SpecRow icon={<Settings2 className="h-4 w-4" />} label="KM" value={formatKm(v.km)} />
              <SpecRow icon={<Fuel className="h-4 w-4" />} label="Yakıt" value={v.fuel} />
              <SpecRow icon={<Settings2 className="h-4 w-4" />} label="Vites" value={v.transmission} />
              <SpecRow icon={<Car className="h-4 w-4" />} label="Kasa" value={v.body} />
              <SpecRow icon={<Palette className="h-4 w-4" />} label="Renk" value={v.color ?? '-'} />
              <SpecRow icon={<MapPin className="h-4 w-4" />} label="Şehir" value={v.city} />
              {v.district && <SpecRow icon={<MapPin className="h-4 w-4" />} label="İlçe" value={v.district} />}
              <SpecRow
                icon={<ShieldCheck className="h-4 w-4" />}
                label="Hasar"
                value={v.damage_record ? 'Var' : 'Yok'}
              />
            </div>

            <div className="mt-5">
              <h3 className="font-semibold text-slate-900">Açıklama</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {v.description || 'Açıklama girilmemiş.'}
              </p>
              {v.damage_record && v.damage_detail && (
                <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                  <strong>Hasar Detayı:</strong> {v.damage_detail}
                </div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-slate-500">
              <span>İlan No: <span className="font-mono text-slate-700">{v.id.slice(0, 8)}</span></span>
              <span>Yayın: {formatDateOnly(v.published_at ?? v.created_at)}</span>
              {v.expires_at && <span>Bitiş: {formatDateOnly(v.expires_at)}</span>}
              <span>Oluşturma: {formatDate(v.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Side: auction + seller + actions */}
        <aside className="space-y-4">
          {auction && (
            <AuctionPanel
              auction={auction}
              listingPrice={v.price}
              isOwn={isOwnListing}
              bids={bids.data ?? []}
              bidsLoading={bids.isLoading}
              contactHidden={contactHiddenForUser}
              onRefreshBids={() => bids.refetch()}
            />
          )}

          {auction && isOwnListing && (auction.status === 'sold_pending_confirmation' || (auction.status === 'ended' && auction.winning_bid_id && !auction.seller_confirmed)) && (
            <SellerApprovalPanel auction={auction} bids={bids.data ?? []} />
          )}

          {!auction && (
            <div className="card p-5">
              <div className="text-xs text-slate-500">Fiyat</div>
              <div className="text-3xl font-extrabold text-brand-600">{formatPrice(v.price)}</div>
              <div className="mt-2 text-xs text-slate-500">
                <Clock className="inline h-3.5 w-3.5 mr-1" /> Yayında: {formatDateOnly(v.published_at ?? v.created_at)}
              </div>
            </div>
          )}

          <div className="card p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">Satıcı</h3>
            {contactHiddenForUser ? (
              <div className="space-y-1.5 text-sm">
                <div className="font-semibold text-slate-900">
                  {v.seller?.full_name || 'İsimsiz Satıcı'}
                </div>
                <div className="relative rounded-lg border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50 to-amber-100 p-4 text-center">
                  <div className="select-none blur-sm">
                    <div className="flex items-center gap-2 text-slate-700">
                      <Phone className="h-4 w-4" /> 05XX XXX XX XX
                    </div>
                    <div className="flex items-center gap-2 text-slate-700 mt-1">
                      <Mail className="h-4 w-4" /> xxx@xxx.com
                    </div>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-amber-700 mb-1" />
                    <div className="text-xs font-semibold text-amber-900">
                      İletişim Bilgileri Gizli
                    </div>
                    <div className="text-[10px] text-amber-700 mt-0.5">
                      Son teklif sahibine açılır
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <div className="font-semibold text-slate-900 flex items-center gap-2">
                  {v.seller?.full_name || 'İsimsiz Satıcı'}
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" /> İLETİŞİM AÇIK
                  </span>
                </div>
                {v.seller?.phone && (
                  <a
                    href={`tel:${v.seller.phone}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-brand-600"
                  >
                    <Phone className="h-4 w-4" /> {v.seller.phone}
                  </a>
                )}
                {v.seller?.email && (
                  <a
                    href={`mailto:${v.seller.email}`}
                    className="flex items-center gap-2 text-slate-700 hover:text-brand-600"
                  >
                    <Mail className="h-4 w-4" /> {v.seller.email}
                  </a>
                )}
                {v.seller?.city && (
                  <div className="flex items-center gap-2 text-slate-700">
                    <MapPin className="h-4 w-4" /> {v.seller.city}
                    {v.seller.district ? ` / ${v.seller.district}` : ''}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    navigate('/giris?next=' + encodeURIComponent(window.location.pathname));
                    return;
                  }
                  favoriteMut.mutate();
                }}
                className={cn(
                  'btn-secondary',
                  isFavorite.data && '!bg-rose-50 !border-rose-200 !text-rose-600',
                )}
                disabled={favoriteMut.isPending}
              >
                <Heart
                  className={cn('h-4 w-4', isFavorite.data && 'fill-rose-500 stroke-rose-500')}
                />
                {isFavorite.data ? 'Favoride' : 'Favori'}
              </button>
              {!isOwnListing && (
                <button
                  type="button"
                  onClick={() => {
                    if (!user) {
                      navigate('/giris?next=' + encodeURIComponent(window.location.pathname));
                      return;
                    }
                    startConversation.mutate();
                  }}
                  className="btn-primary"
                  disabled={startConversation.isPending}
                >
                  <MessageSquare className="h-4 w-4" /> Mesaj
                </button>
              )}
            </div>
            {(favoriteMut.error || startConversation.error) && (
              <p className="text-xs text-red-600">
                {(favoriteMut.error as Error | null)?.message ||
                  (startConversation.error as Error | null)?.message}
              </p>
            )}
          </div>

          <div className="card p-4 text-xs text-slate-500 space-y-1">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Güvenli alışveriş
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> 7/24 müşteri desteği
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Ekspertiz raporu ile güvence
            </div>
          </div>
        </aside>
      </div>

      {lightbox && (
        <Lightbox
          images={v.images}
          idx={galleryIdx}
          setIdx={setGalleryIdx}
          onClose={() => setLightbox(false)}
        />
      )}
    </div>
  );
}

/* ---------------- Gallery ---------------- */

function Gallery({
  images,
  activeIdx,
  setActive,
  onOpenLightbox,
  title,
  isSold = false,
}: {
  images: VehicleImage[];
  activeIdx: number;
  setActive: (i: number) => void;
  onOpenLightbox: () => void;
  title: string;
  isSold?: boolean;
}) {
  const safeImages = images.length > 0 ? images : [];
  if (safeImages.length === 0) {
    return (
      <div className="card aspect-[16/10] w-full flex items-center justify-center text-slate-300">
        <Car className="h-16 w-16" />
      </div>
    );
  }
  const main = safeImages[activeIdx] ?? safeImages[0];
  return (
    <div>
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl bg-slate-100 cursor-zoom-in"
        onClick={onOpenLightbox}
      >
        <img src={main.url} alt={title} className="h-full w-full object-cover" />
        {isSold && <SoldStamp variant="full" />}
        {safeImages.length > 1 && (
          <>
            <button
              type="button"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation();
                setActive((activeIdx - 1 + safeImages.length) % safeImages.length);
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation();
                setActive((activeIdx + 1) % safeImages.length);
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white">
              {activeIdx + 1} / {safeImages.length}
            </div>
          </>
        )}
      </div>
      {safeImages.length > 1 && (
        <div className="mt-2 grid grid-cols-6 sm:grid-cols-8 gap-2">
          {safeImages.slice(0, 8).map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(i)}
              className={cn(
                'aspect-[4/3] overflow-hidden rounded-lg border-2',
                i === activeIdx ? 'border-brand-500' : 'border-transparent',
              )}
            >
              <img src={img.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Lightbox({
  images,
  idx,
  setIdx,
  onClose,
}: {
  images: VehicleImage[];
  idx: number;
  setIdx: (i: number) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIdx((idx - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIdx((idx + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, images.length, onClose, setIdx]);
  const main = images[idx];
  if (!main) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Kapat"
      >
        <X className="h-5 w-5" />
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((idx - 1 + images.length) % images.length); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setIdx((idx + 1) % images.length); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
      <img
        src={main.url}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] max-w-[90vw] object-contain"
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
        {idx + 1} / {images.length}
      </div>
    </div>
  );
}

/* ---------------- Spec row ---------------- */

function SpecRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex items-center gap-1 text-[11px] uppercase text-slate-500">
        {icon} {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold capitalize text-slate-800">{value}</div>
    </div>
  );
}

/* ---------------- Auction panel ---------------- */
/* ---------------- Auction panel ---------------- */

function AuctionPanel({
  auction,
  listingPrice,
  isOwn,
  bids,
  bidsLoading,
  contactHidden,
  onRefreshBids,
}: {
  auction: Auction;
  listingPrice: number;
  isOwn: boolean;
  bids: BidWithBidder[];
  bidsLoading: boolean;
  contactHidden: boolean;
  onRefreshBids: () => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [bidAmount, setBidAmount] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAllBids, setShowAllBids] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [lastBidId, setLastBidId] = useState<string | null>(null);

  const minNextBid = Number(auction.current_price) + Number(auction.bid_increment);

  const wallet = useQuery({
    queryKey: ['wallet', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data?.wallet_balance ?? 0;
    },
  });

  const mySeat = useQuery({
    queryKey: ['my-seat', auction.id, user?.id],
    enabled: !!user && !!auction.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_seat_holds')
        .select('id, status, amount, bid_id')
        .eq('auction_id', auction.id)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as { id: string; status: string; amount: number; bid_id: string | null } | null;
    },
  });

  const seatCount = useQuery({
    queryKey: ['seat-count', auction.id],
    enabled: !!auction.id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('auction_seat_holds')
        .select('id', { count: 'exact', head: true })
        .eq('auction_id', auction.id)
        .eq('status', 'holding');
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Yeni teklif geldi mi? (animasyon için)
  const topBidId = bids[0]?.id;
  useEffect(() => {
    if (!topBidId) return;
    if (topBidId !== lastBidId) {
      setLastBidId(topBidId);
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 1500);
      return () => clearTimeout(t);
    }
  }, [topBidId, lastBidId]);

  const isAtTable = mySeat.data?.status === 'holding';
  const isWinningBidder = Boolean(
    isAtTable && auction.winning_bid_id && bids[0]?.id === auction.winning_bid_id &&
    bids[0]?.bidder?.id === user?.id
  );

  const joinTable = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('join_table', {
        p_auction_id: auction.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seat', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['seat-count', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      setSuccess('Masaya oturdunuz!');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const leaveTable = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('leave_table', {
        p_auction_id: auction.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-seat', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['seat-count', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['wallet', user?.id] });
      setSuccess('Masadan ayrildiniz.');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const placeBid = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Teklif vermek icin giris yapmalisiniz');
      if (!isAtTable) throw new Error('Teklif vermek icin masaya oturmali siniz');
      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auction.id,
        p_amount: amount,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setError(null);
      setSuccess('Teklifiniz basariyla kaydedildi!');
      setBidAmount('');
      queryClient.invalidateQueries({ queryKey: ['bids', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', auction.vehicle_id] });
      queryClient.invalidateQueries({ queryKey: ['my-seat', auction.id] });
      setTimeout(() => setSuccess(null), 4000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const t = useMemo(() => (auction.end_at ? timeUntil(auction.end_at) : null), [auction.end_at]);
  const isLive = auction.status === 'live';
  const isScheduled = auction.status === 'scheduled';
  const isCancelled = auction.status === 'cancelled';
  const tStart = useMemo(() => (auction.start_at ? timeUntil(auction.start_at) : null), [auction.start_at]);
  // 2 dakika kala veya süre geldi/geçtiyse (henüz live olmamışsa) banner göster
  const isStartingSoon = isScheduled && tStart && tStart.total <= 120;
  const isEnded = auction.status === 'ended' || auction.status === 'sold_pending_confirmation' ||
    (auction.status as string) === 'sold' ||
    (isLive && t !== null && t.total <= 0);

  const maskName = (fullName: string | null | undefined): string => {
    if (!fullName) return 'Kullanici';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const first = parts[0];
    const last = parts[parts.length - 1];
    return first + ' ' + last.charAt(0) + '.';
  };

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Acik Arttirma</h3>
          <span
            className={cn(
              'badge',
              isLive ? 'bg-white text-red-700' : isScheduled ? 'bg-amber-300 text-amber-900' : 'bg-slate-200 text-slate-700',
            )}
          >
            {isLive ? 'CANLI' : isScheduled ? 'PLANLANDI' : isEnded ? 'SATILDI' : 'IPTAL'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase opacity-80">Acilis Fiyati</div>
            <div className="text-lg font-bold">{formatPrice(auction.opening_price)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase opacity-80">Son Teklif</div>
            <div
              className={cn(
                'text-lg font-bold transition-all duration-500',
                pulse && 'animate-pulse text-yellow-200 drop-shadow-[0_0_8px_rgba(250,204,21,0.9)] scale-110',
              )}
            >
              {formatPrice(auction.current_price)}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[11px] uppercase opacity-80 mb-1">
            {isLive ? 'Mezat Bitisine' : isScheduled ? 'Baslangica' : 'Sure Doldu'}
          </div>
          {isLive ? (
            <CountdownTimer
              target={(auction as any).live_ends_at || auction.end_at}
              size="lg"
              glow
              format="msm"
            />
          ) : isScheduled ? (
            <CountdownTimer
              target={auction.start_at ?? undefined}
              size="lg"
              glow={false}
              format="hmsm"
            />
          ) : (
            <div className="text-2xl font-bold">Sure Doldu</div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isScheduled && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Bu acik arttirma henuz baslamadi. Baslangic: {formatDate(auction.start_at)}
          </div>
        )}
        {isStartingSoon && (
          <div className="rounded-lg border-2 border-rose-400 bg-gradient-to-r from-rose-500 to-red-600 p-4 text-white shadow-lg animate-pulse">
            <div className="flex items-center gap-2 font-bold text-base">
              <span className="inline-block h-3 w-3 rounded-full bg-white animate-ping" />
              AÇIK ARTTIRMA BAŞLIYOR!
            </div>
            <div className="text-sm mt-1 opacity-90">
              {tStart && tStart.total > 0
                ? `${tStart.total} saniye içinde masaya oturabilirsiniz`
                : 'Süre geldi! Sayfa otomatik canlı moda geçecek.'}
            </div>
          </div>
        )}
        {isEnded && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="font-bold text-base flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" />
              {auction.status === 'sold_pending_confirmation' ? 'Onay Bekleniyor...' : 'Bu arac satildi!'}
            </div>
            <div className="mt-1">
              <strong>Satis Fiyati:</strong> {formatPrice((auction as any).final_price || auction.current_price)}
            </div>
            {auction.status === 'sold_pending_confirmation' && (
              <div className="text-xs mt-1">İlan sahibi onayı bekleniyor. 5 saniye içinde otomatik onaylanacak.</div>
            )}
            {auction.status !== 'sold_pending_confirmation' && auction.winner_id && (
              <div className="text-xs mt-1">Kazanan belirlendi.</div>
            )}
          </div>
        )}
        {isCancelled && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Bu acik arttirma iptal edildi.
          </div>
        )}

        {!isEnded && !isCancelled && user && !isOwn && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Masa:</span>
                <span className="inline-flex items-center gap-1 text-slate-700">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  {seatCount.data ?? 0} kisi oturuyor
                </span>
              </div>
              {wallet.data !== undefined && (
                <span className="text-xs text-slate-600">
                  Cuzdan: <strong>{formatPrice(wallet.data)}</strong>
                </span>
              )}
            </div>
            {isAtTable ? (
              <button
                type="button"
                onClick={() => leaveTable.mutate()}
                disabled={leaveTable.isPending || isWinningBidder}
                className={cn(
                  'w-full rounded-lg px-4 py-2 text-sm font-semibold transition',
                  isWinningBidder
                    ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                    : 'bg-red-100 text-red-700 hover:bg-red-200',
                )}
              >
                {leaveTable.isPending ? (
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                ) : null}
                {isWinningBidder ? 'Son teklif sahibisiniz - masada kalmalisiniz' : 'Masadan Ayril'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => joinTable.mutate()}
                disabled={joinTable.isPending || !isLive}
                className={cn(
                  'w-full rounded-lg px-4 py-2 text-sm font-semibold transition',
                  (wallet.data ?? 0) < Number(auction.seat_hold_fee)
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700',
                )}
              >
                {joinTable.isPending ? (
                  <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
                ) : null}
                {(wallet.data ?? 0) < (auction.seat_hold_fee ?? 0)
                  ? 'Cuzdana Para Yukle (Modul: ' + formatPrice(auction.seat_hold_fee ?? 0) + ')'
                  : 'Masaya Otur (' + formatPrice(auction.seat_hold_fee ?? 0) + ' bloke)'}
              </button>
            )}
          </div>
        )}

        {!isOwn && isLive && user && isAtTable && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(bidAmount.replace(/\./g, '').replace(',', '.'));
              if (Number.isNaN(v) || v <= 0) {
                setError('Gecerli bir tutar girin');
                return;
              }
              placeBid.mutate(v);
            }}
            className="space-y-2"
          >
            <label className="text-xs font-semibold uppercase text-slate-500">
              Teklif Ver (en az {formatPrice(minNextBid)})
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={minNextBid}
                step={auction.bid_increment}
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="input flex-1"
                placeholder={String(minNextBid)}
                required
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={placeBid.isPending}
              >
                {placeBid.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Gavel className="h-4 w-4" />
                )}
                Teklif Ver
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Artis: {formatPrice(auction.bid_increment)}
            </p>
          </form>
        )}

        {!user && isLive && (
          <Link
            to={`/giris?next=${encodeURIComponent(window.location.pathname)}`}
            className="btn-primary w-full justify-center"
          >
            Teklif vermek icin giris yapin
          </Link>
        )}

        {isOwn && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Bu sizin ilaniniz.
          </div>
        )}

        {!isAtTable && !isOwn && isLive && user && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            Teklif verebilmek icin masaya oturmaniz ve modul ucreti ({formatPrice(auction.seat_hold_fee ?? 0)}) bloke edilmesi gerekir.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <XCircle className="inline h-4 w-4 mr-1" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            <CheckCircle2 className="inline h-4 w-4 mr-1" /> {success}
          </div>
        )}

        {contactHidden && !isWinningBidder && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Iletisim bilgileri sadece kazanan teklif sahibine acilir.
          </div>
        )}

        <div className="border-t border-slate-200 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">
              Son Teklifler ({auction.total_bids})
            </h4>
            <button
              type="button"
              onClick={onRefreshBids}
              className="text-xs text-slate-500 hover:text-slate-700"
            >
              Yenile
            </button>
          </div>
          {bidsLoading ? (
            <p className="text-sm text-slate-500">Yukleniyor...</p>
          ) : bids.length === 0 ? (
            <p className="text-sm text-slate-500">Henuz teklif verilmedi.</p>
          ) : (
            <>
              <ul className="space-y-1.5">
                {(showAllBids ? bids : bids.slice(0, 5)).map((b) => (
                  <li
                    key={b.id}
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm',
                      b.is_winning && 'border-amber-200 bg-amber-50',
                    )}
                  >
                    <div>
                      <div className="font-semibold text-slate-800">
                        {maskName(b.bidder?.full_name)}
                      </div>
                      <div className="text-[11px] text-slate-500">{formatDate(b.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-brand-600">{formatPrice(b.amount)}</div>
                      {b.is_winning && <span className="text-[10px] text-amber-700">EN YUKSEK</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {bids.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllBids((v) => !v)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  {showAllBids ? '▲ Daha az goster' : '▼ Tum teklifleri gor (' + bids.length + ')'}
                </button>
              )}
            </>
          )}
        </div>
        <span className="hidden">{listingPrice}</span>
      </div>
    </div>
  );
}

/* ---------------- Seller Approval Panel (ilan sahibi onay) ---------------- */

function SellerApprovalPanel({
  auction,
  bids,
}: {
  auction: Auction;
  bids: BidWithBidder[];
}) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const winningBid = bids.find((b) => b.id === auction.winning_bid_id);
  const winnerProfile = winningBid?.bidder;

  const approve = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('seller_approve_winner', {
        p_auction_id: auction.id,
        p_approve: true,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', auction.vehicle_id] });
      setSuccess('Kazanan onaylandı! İletişim bilgileri açıldı.');
      setError(null);
      setTimeout(() => setSuccess(null), 4000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const reject = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('seller_approve_winner', {
        p_auction_id: auction.id,
        p_approve: false,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicle', auction.vehicle_id] });
      setSuccess('Kazanan reddedildi.');
      setError(null);
      setTimeout(() => setSuccess(null), 4000);
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="card overflow-hidden border-2 border-amber-300">
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-4 text-white">
        <h3 className="font-bold flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Açık Arttırma Onayınızı Bekliyor
        </h3>
      </div>
      <div className="p-5 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs uppercase text-slate-500 mb-1">Son Teklif (Kazanan)</div>
          <div className="text-2xl font-extrabold text-brand-600">
            {formatPrice(auction.current_price)}
          </div>
          {winnerProfile && (
            <div className="mt-2 text-sm">
              <div className="font-semibold text-slate-800">
                {winnerProfile.full_name || 'Kazanan'}
              </div>
            </div>
          )}
          <div className="text-[11px] text-slate-500 mt-2">
            Mezat: {formatDate(auction.ended_at ?? auction.end_at)}
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            <XCircle className="inline h-4 w-4 mr-1" /> {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-sm text-emerald-700">
            <CheckCircle2 className="inline h-4 w-4 mr-1" /> {success}
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              if (confirm('Kazanan teklifi onaylıyor musunuz? Onaylarsanız iletişim bilgileriniz kazanan kullanıcıya açılır.')) {
                approve.mutate();
              }
            }}
            disabled={approve.isPending || Boolean(auction.seller_confirmed)}
            className="rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {approve.isPending ? (
              <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
            ) : (
              <CheckCircle2 className="inline h-4 w-4 mr-1" />
            )}
            Onayla
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm('Kazanan teklifi reddediyor musunuz? İlan satışa kapatılacak ve blokeler çözülecek.')) {
                reject.mutate();
              }
            }}
            disabled={reject.isPending || Boolean(auction.seller_rejected_at)}
            className="rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {reject.isPending ? (
              <Loader2 className="inline h-4 w-4 animate-spin mr-1" />
            ) : (
              <XCircle className="inline h-4 w-4 mr-1" />
            )}
            Reddet
          </button>
        </div>

        {auction.seller_confirmed && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            <CheckCircle2 className="inline h-4 w-4 mr-1" />
            Onaylandı: {formatDate(auction.seller_confirmed_at)}
          </div>
        )}

        {auction.seller_rejected_at && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle className="inline h-4 w-4 mr-1" />
            Reddedildi: {formatDate(auction.seller_rejected_at)}
          </div>
        )}
      </div>
    </div>
  );
}
