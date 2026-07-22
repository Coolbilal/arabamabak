import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Armchair, Wallet, LogIn, LogOut, Loader2, CheckCircle2, X } from 'lucide-react';
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
  className?: string;
}

/**
 * Canlı açık arttırmada koltuk paneli:
 * - Cüzdan bakiyesi
 * - Masaya otur / ayrıl
 * - Son teklif veren ise ayrıl kapalı
 * - Koltuk listesi
 */
export default function SeatPanel({ auctionId, seatFee, className }: SeatPanelProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: mySeat, isLoading: seatLoading } = useMySeat(auctionId);
  const { data: highestBidder } = useHighestBidder(auctionId);
  const { data: balance = 0 } = useWalletBalance();
  const { data: seats = [] } = useAuctionSeats(auctionId);

  const joinMut = useJoinSeat();
  const leaveMut = useLeaveSeat();

  // site_settings'ten fee'yi al (verilen seatFee fallback)
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

  const isWinner = highestBidder?.user_id === user?.id;
  const isInSeat = !!mySeat && mySeat.status === 'holding';
  const canLeave = isInSeat && !isWinner;
  const canJoin = !isInSeat && balance >= fee;
  const insufficientBalance = !user ? false : balance < fee;

  async function handleJoin() {
    if (!user) {
      navigate(`/giris?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    try {
      await joinMut.mutateAsync({ auctionId, fee });
    } catch (e: any) {
      alert(e?.message || 'Masaya oturulamadı');
    }
  }

  async function handleLeave() {
    if (!mySeat) return;
    if (isWinner) {
      alert('Son teklifi veren kullanıcı masadan ayrılamaz. Önce daha düşük bir teklif gelmesini bekleyin.');
      return;
    }
    if (!confirm('Masadan ayrılmak istediğinize emin misiniz? Bloke edilen tutar cüzdanınıza iade edilecek.')) return;
    try {
      await leaveMut.mutateAsync({ auctionId, seatId: mySeat.id });
    } catch (e: any) {
      alert(e?.message || 'Ayrılınamadı');
    }
  }

  return (
    <div className={cn('rounded-xl border border-slate-200 bg-white p-4 space-y-3', className)}>
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

      {/* Cüzdan bakiyesi */}
      {user ? (
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
      ) : (
        <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded">
          Masaya oturmak için <Link to="/giris" className="text-sky-600 font-semibold">giriş yapın</Link>
        </div>
      )}

      {/* Bloke tutarı */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">Masa Bloke Ücreti</span>
        <span className="font-semibold text-slate-700">{formatPrice(fee)} TL</span>
      </div>

      {/* Ana aksiyon butonu */}
      {!user ? (
        <button
          type="button"
          onClick={() => navigate(`/giris?next=${encodeURIComponent(window.location.pathname)}`)}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 transition"
        >
          <LogIn className="h-4 w-4" /> Giriş Yap
        </button>
      ) : seatLoading ? (
        <button disabled className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor...
        </button>
      ) : isInSeat ? (
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
          title={!canLeave ? 'Son teklif veren kullanıcı masadan ayrılamaz' : 'Masadan ayrıl'}
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
      ) : (
        <button
          type="button"
          onClick={handleJoin}
          disabled={!canJoin || joinMut.isPending}
          className={cn(
            'w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold transition',
            canJoin
              ? 'bg-emerald-600 text-white hover:bg-emerald-700'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          )}
          title={!canJoin ? `Yetersiz bakiye. ${fee} TL gerekli.` : 'Masaya otur'}
        >
          {joinMut.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Armchair className="h-4 w-4" />
          )}
          {insufficientBalance ? `Yetersiz Bakiye (${formatPrice(fee)} TL)` : 'Masaya Otur'}
        </button>
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
