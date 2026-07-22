import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Armchair, Wallet, LogIn, LogOut, Loader2, CheckCircle2, X, AlertTriangle, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatPrice } from '../lib/utils';
import {
  useMySeat,
  useJoinSeat,
  useLeaveSeat,
  useHighestBidder,
  useWalletBalance,
  useAuctionSeats,
} from '../hooks/useSeatHold';

interface SeatPanelProps {
  auctionId: string;
  seatFee: number;
  auctionStatus?: 'scheduled' | 'live' | 'ended' | 'sold' | 'sold_pending_confirmation' | 'cancelled';
  className?: string;
}

/**
 * Canlı açık arttırmada koltuk paneli:
 * - Cüzdan bakiyesi
 * - Yetersiz bakiye uyarısı (şık banner)
 * - Masaya Otur / Ayrıl
 * - Son teklif veren ise ayrıl kapalı
 * - Koltuk listesi
 * - Scheduled/ended ise pasif
 */
export default function SeatPanel({ auctionId, seatFee, auctionStatus, className }: SeatPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: mySeat, isLoading: seatLoading } = useMySeat(auctionId);
  const { data: balance = 0, isLoading: balanceLoading } = useWalletBalance();
  const { data: highestBidder } = useHighestBidder(auctionId);
  const { data: seats = [] } = useAuctionSeats(auctionId);

  const joinMut = useJoinSeat();
  const leaveMut = useLeaveSeat();

  // site_settings'ten fee'yi al
  const { data: settings } = useQuery({
    queryKey: ['site-settings-public'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('seat_hold_fee, auction_seat_hold_fee')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  const fee = useMemo(() => {
    return Number(settings?.auction_seat_hold_fee ?? settings?.seat_hold_fee ?? seatFee ?? 500);
  }, [settings, seatFee]);

  // Kullanıcının teklif verip vermediğini kontrol et
  const { data: hasMyBid = false } = useQuery({
    queryKey: ['my-bid-exists', auctionId, user?.id],
    enabled: !!auctionId && !!user,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('bids')
        .select('id', { count: 'exact', head: true })
        .eq('auction_id', auctionId)
        .eq('bidder_id', user!.id);
      if (error) throw error;
      return (count ?? 0) > 0;
    },
  });

  // Açık arttırma durumu
  const isLive = !auctionStatus || auctionStatus === 'live';
  const isEnded = auctionStatus === 'ended' || auctionStatus === 'sold' || auctionStatus === 'sold_pending_confirmation' || auctionStatus === 'cancelled';
  const isScheduled = auctionStatus === 'scheduled';

  // Durum logic
  const isWinner = highestBidder?.user_id === user?.id;
  // left_at set edilmişse veya status 'released' ise masada değil
  const isInSeat = !!mySeat && mySeat.status === 'holding' && !mySeat.left_at;

  // "Masadan Ayrıl" aktif mi?
  // - Masada olmalı
  // - En yüksek teklif veren OLMAMALI (son teklif veren = en yüksek)
  // - Açık arttırma live olmalı
  const canLeave = isInSeat && !isWinner && isLive;

  // "Masaya Otur" aktif mi?
  const canJoin = !isInSeat && isLive && balance >= fee;
  const insufficientBalance: boolean = !!user && balance < fee;

  // DEBUG: Console'a durum bilgisi yaz (sadece ilk render)
  if (typeof window !== 'undefined' && !(window as any).__seatPanelLogged) {
    console.log('[SeatPanel]', {
      auctionId,
      auctionStatus,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      mySeat: mySeat ? { id: mySeat.id, status: mySeat.status, seat: mySeat.seat_number } : null,
      balance,
      fee,
      isLive,
      isInSeat,
      isWinner,
      canLeave,
      canJoin,
      insufficientBalance,
    });
    (window as any).__seatPanelLogged = true;
  }

  async function handleJoin() {
    if (!user) {
      navigate(`/giris?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (insufficientBalance) return;
    try {
      await joinMut.mutateAsync({ auctionId, fee });
    } catch (e: any) {
      alert(e?.message || 'Masaya oturulamadı');
    }
  }

  async function handleLeave() {
    if (!mySeat) return;
    if (isWinner) {
      alert('Yeni son teklif gelene kadar masadan ayrılamazsınız.');
      return;
    }
    if (!isLive) return;
    if (!confirm('Masadan ayrılmak istediğinize emin misiniz? Bloke edilen tutar cüzdanınıza iade edilecek.')) return;
    try {
      console.log('[SeatPanel] handleLeave: leaving seat', mySeat.id);
      const result = await leaveMut.mutateAsync({ auctionId, seatId: mySeat.id });
      console.log('[SeatPanel] leave result:', result);
    } catch (e: any) {
      console.error('[SeatPanel] leave error:', e);
      alert(e?.message || 'Ayrılınamadı');
    }
  }

  // Ana buton içeriği (duruma göre)
  function renderMainButton() {
    if (!user) {
      return (
        <button
          type="button"
          onClick={() => navigate(`/giris?next=${encodeURIComponent(window.location.pathname)}`)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
        >
          <LogIn className="h-4 w-4" /> Giriş Yap
        </button>
      );
    }

    if (seatLoading) {
      return (
        <button disabled className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </button>
      );
    }

    if (isScheduled) {
      return (
        <button disabled className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 cursor-not-allowed">
          <AlertTriangle className="h-4 w-4" /> Henüz Başlamadı
        </button>
      );
    }

    if (isEnded) {
      return (
        <button disabled className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed">
          <X className="h-4 w-4" /> Açık Arttırma Sona Erdi
        </button>
      );
    }

    if (isInSeat) {
      return (
        <button
          type="button"
          onClick={handleLeave}
          disabled={!canLeave || leaveMut.isPending}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition',
            canLeave
              ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
          title={!canLeave ? (isWinner ? 'Son teklif veren ayrılamaz' : 'Yetersiz koşul') : 'Masadan ayrıl'}
        >
          {leaveMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : !canLeave ? (
            <X className="h-4 w-4" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          {!canLeave ? 'Son Teklif Veren (Ayrılamaz)' : 'Masadan Ayrıl'}
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleJoin}
        disabled={!canJoin || joinMut.isPending || insufficientBalance}
        className={cn(
          'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition',
          canJoin
            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
        )}
        title={insufficientBalance ? `Yetersiz bakiye. ${fee} TL gerekli.` : 'Masaya otur'}
      >
        {joinMut.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Armchair className="h-4 w-4" />
        )}
        Masaya Otur
      </button>
    );
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 space-y-3', className)}>
      {balanceLoading && !balance && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cüzdan bakiyesi yükleniyor…
        </div>
      )}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
          <Armchair className="h-4 w-4" /> Açık Arttırma Masası
        </h3>
        {mySeat && (
          <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
            Koltuk #{mySeat.seat_number}
          </span>
        )}
      </div>

      {/* Şık yetersiz bakiye uyarısı */}
      {insufficientBalance && isLive && (
        <div className="rounded-lg bg-gradient-to-br from-red-50 to-amber-50 border-2 border-red-200 p-3 space-y-2">
          <div className="flex items-start gap-2">
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-red-800">Yetersiz Bakiye</div>
              <div className="text-[11px] text-red-700 mt-0.5">
                Masaya oturmak için <b>{formatPrice(fee)} TL</b> gerekli.
                Mevcut: <b>{formatPrice(balance)} TL</b>.
                Eksik: <b>{formatPrice(fee - balance)} TL</b>
              </div>
            </div>
          </div>
          <Link
            to="/profil/cuzdan"
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition"
          >
            <Plus className="h-3.5 w-3.5" /> Cüzdana Bakiye Yükle
          </Link>
        </div>
      )}

      {/* Cüzdan bakiyesi */}
      {user && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> Cüzdan Bakiyesi
          </span>
          <Link to="/profil/cuzdan" className={cn(
            'font-bold',
            insufficientBalance ? 'text-red-600' : 'text-slate-800'
          )}>
            {formatPrice(balance)} TL
          </Link>
        </div>
      )}

      {/* Bloke tutarı */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Masa Bloke Ücreti</span>
        <span className="font-semibold text-slate-700">{formatPrice(fee)} TL</span>
      </div>

      {/* Ana aksiyon butonu */}
      {renderMainButton()}

      {/* Açık arttırma durumu bilgilendirme */}
      {isInSeat && hasMyBid && isLive && (
        <div className={cn(
          'rounded-md p-2 text-[11px]',
          isWinner
            ? 'bg-amber-50 border border-amber-200 text-amber-800'
            : 'bg-sky-50 border border-sky-200 text-sky-800'
        )}>
          {isWinner ? (
            <>👑 Son teklifi verensin. Yeni teklif gelene kadar masadan ayrılamazsın.</>
          ) : (
            <>✓ Teklif verdin. Üstüne yeni teklif geldiği için masadan ayrılabilirsin.</>
          )}
        </div>
      )}

      {/* Masada olan kullanıcılar */}
      {seats.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider mb-1.5">
            Masada {seats.length} {seats.length === 1 ? 'Kişi' : 'Kişi'}
          </div>
          <div className="flex flex-wrap gap-1">
            {seats.slice(0, 8).map((s) => (
              <span
                key={s.id}
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium',
                  s.user_id === highestBidder?.user_id
                    ? 'bg-amber-100 text-amber-700'
                    : s.user_id === user?.id
                    ? 'bg-sky-100 text-sky-700'
                    : 'bg-slate-100 text-slate-600'
                )}
                title={s.user_id === user?.id ? 'Sen' : s.user_id === highestBidder?.user_id ? 'En Yüksek Teklif' : 'Teklif Verdi'}
              >
                {s.user_id === highestBidder?.user_id && <CheckCircle2 className="h-2.5 w-2.5" />}
                #{s.seat_number}
              </span>
            ))}
            {seats.length > 8 && (
              <span className="text-[10px] text-slate-500">+{seats.length - 8}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
