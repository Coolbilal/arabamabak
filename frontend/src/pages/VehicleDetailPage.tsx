import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SoldStamp } from '../components/SoldStamp';
import { cn, formatDate, formatDateOnly, formatKm, formatPrice, pad, timeUntil } from '../lib/utils';
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
        .eq('id', id);
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

  // Realtime bids
  useEffect(() => {
    const auctionId = vehicle.data?.auction?.id;
    if (!auctionId) return;
    const channel = supabase
      .channel(`bids-${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bids', auctionId] });
          queryClient.invalidateQueries({ queryKey: qcKey });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [vehicle.data?.auction?.id, queryClient, qcKey]);

  // Banner + otomatik tetikleme AuctionStartBanner componentinde
  const bannerAuction = vehicle.data?.auction ?? null;

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

  // Banner state'i artık 182'de (erken return'den önce) tanımlı
  if (!vehicle.data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-center text-slate-500">İlan bulunamadı.</div>
    );
  }

  const v = vehicle.data;
  const auction = bannerAuction; // geriye dönük uyumluluk
  const isOwnListing = user?.id === v.seller_id;
  const contactHiddenForUser =
    !!auction &&
    v.contact_hidden &&
    v.contact_revealed_to !== user?.id &&
    !(auction.winner_id && auction.winner_id === user?.id);

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
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                Açık arttırmayı kazandığınızda iletişim bilgileri açılır.
              </div>
            ) : (
              <div className="space-y-1.5 text-sm">
                <div className="font-semibold text-slate-900">
                  {v.seller?.full_name || 'İsimsiz Satıcı'}
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

  const minNextBid = Number(auction.current_price) + Number(auction.bid_increment);

  const placeBid = useMutation({
    mutationFn: async (amount: number) => {
      if (!user) throw new Error('Teklif vermek için giriş yapmalısınız');
      if (isOwn) throw new Error('Kendi ilanınıza teklif veremezsiniz');
      if (auction.status !== 'live') throw new Error('Bu açık arttırma şu anda aktif değil');
      if (amount < minNextBid) {
        throw new Error(
          `Teklif en az ${formatPrice(minNextBid)} olmalıdır`,
        );
      }
      const { error } = await supabase
        .from('bids')
        .insert({ auction_id: auction.id, bidder_id: user.id, amount });
      if (error) throw error;
    },
    onSuccess: () => {
      setError(null);
      setSuccess('Teklifiniz başarıyla kaydedildi!');
      setBidAmount('');
      queryClient.invalidateQueries({ queryKey: ['bids', auction.id] });
      queryClient.invalidateQueries({ queryKey: ['vehicle', auction.vehicle_id] });
      setTimeout(() => setSuccess(null), 4000);
    },
    onError: (e: Error) => setError(e.message),
  });

  const t = useMemo(() => (auction.end_at ? timeUntil(auction.end_at) : null), [auction.end_at]);
  const isLive = auction.status === 'live';
  const isScheduled = auction.status === 'scheduled';
  const isCancelled = auction.status === 'cancelled';
  const isEnded = auction.status === 'ended' || (isLive && t !== null && t.total <= 0);

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-r from-red-600 to-red-700 p-5 text-white">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">Açık Arttırma</h3>
          <span
            className={cn(
              'badge',
              isLive ? 'bg-white text-red-700' : isScheduled ? 'bg-amber-300 text-amber-900' : 'bg-slate-200 text-slate-700',
            )}
          >
            {isLive ? 'CANLI' : isScheduled ? 'PLANLANDI' : 'SONA ERDİ'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] uppercase opacity-80">Açılış Fiyatı</div>
            <div className="text-lg font-bold">{formatPrice(auction.opening_price)}</div>
          </div>
          <div>
            <div className="text-[11px] uppercase opacity-80">Son Teklif</div>
            <div className="text-lg font-bold">{formatPrice(auction.current_price)}</div>
          </div>
        </div>
        <div className="mt-3">
          <div className="text-[11px] uppercase opacity-80 mb-1">
            {isLive ? 'Mezat Bitişine' : isScheduled ? 'Başlangıca' : 'Süre Doldu'}
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
            <div className="text-2xl font-bold">⏱ Süre Doldu</div>
          )}
        </div>
      </div>

      <div className="p-5 space-y-4">
        {isScheduled && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Bu açık arttırma henüz başlamadı. Başlangıç: {formatDate(auction.start_at)}
          </div>
        )}
        {isEnded && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
            <div className="font-bold text-base flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Bu araç satıldı!
            </div>
            <div className="mt-1">
              <strong>Satış Fiyatı:</strong> {formatPrice((auction as any).final_price || auction.current_price)}
            </div>
            {auction.winner_id && (
              <div className="text-xs mt-1">Kazanan belirlendi.</div>
            )}
          </div>
        )}
        {isCancelled && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            Bu açık arttırma iptal edildi.
          </div>
        )}

        {!isOwn && isLive && user && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = parseFloat(bidAmount.replace(/\./g, '').replace(',', '.'));
              if (Number.isNaN(v) || v <= 0) {
                setError('Geçerli bir tutar girin');
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
              Artış: {formatPrice(auction.bid_increment)} · Adım: {pad(auction.bid_increment, 0)}
            </p>
          </form>
        )}

        {!user && isLive && (
          <Link
            to={`/giris?next=${encodeURIComponent(window.location.pathname)}`}
            className="btn-primary w-full justify-center"
          >
            Teklif vermek için giriş yapın
          </Link>
        )}

        {isOwn && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
            Bu sizin ilanınız.
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

        {contactHidden && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <AlertCircle className="inline h-4 w-4 mr-1" />
            Kazanan teklif verince iletişim bilgileri açılır.
          </div>
        )}

        <div className="border-t border-slate-200 pt-3">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-900">
              Teklif Geçmişi ({auction.total_bids})
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
            <p className="text-sm text-slate-500">Yükleniyor…</p>
          ) : bids.length === 0 ? (
            <p className="text-sm text-slate-500">Henüz teklif verilmedi.</p>
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {bids.map((b) => (
                <li
                  key={b.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm',
                    b.is_winning && 'border-amber-200 bg-amber-50',
                  )}
                >
                  <div>
                    <div className="font-semibold text-slate-800">
                      {b.bidder?.full_name || b.bidder?.email || 'Kullanıcı'}
                    </div>
                    <div className="text-[11px] text-slate-500">{formatDate(b.created_at)}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-brand-600">{formatPrice(b.amount)}</div>
                    {b.is_winning && <span className="text-[10px] text-amber-700">EN YÜKSEK</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Suppress unused listingPrice warning - kept for future reference */}
        <span className="hidden">{listingPrice}</span>
      </div>
    </div>
  );
}
