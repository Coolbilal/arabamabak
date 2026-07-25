import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface SeatHold {
  id: string;
  auction_id: string;
  user_id: string;
  bid_id: string | null;
  amount: number;
  status: 'holding' | 'won' | 'released' | 'left';
  seat_number: number | null;
  created_at: string;
  left_at: string | null;
  released_at: string | null;
  updated_at: string;
}

export interface HighestBidder {
  user_id: string;
  amount: number;
  bid_id: string;
}

/**
 * Kullanıcının belirli bir açık arttırmadaki koltuk durumunu getir
 */
export function useMySeat(auctionId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['my-seat', auctionId, user?.id],
    enabled: !!auctionId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_seat_holds')
        .select('*')
        .eq('auction_id', auctionId!)
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as SeatHold | null;
    },
  });
}

/**
 * Açık arttırmadaki en yüksek teklif sahibini getir
 */
export function useHighestBidder(auctionId: string | undefined) {
  return useQuery({
    queryKey: ['highest-bidder', auctionId],
    enabled: !!auctionId,
    refetchInterval: 3000, // 3 saniyede bir yenile (realtime yedek)
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bids')
        .select('id, amount, bidder_id')
        .eq('auction_id', auctionId!)
        .order('amount', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        user_id: data.bidder_id,
        amount: Number(data.amount),
        bid_id: data.id,
      } as HighestBidder;
    },
  });
}

/**
 * Açık arttırmadaki mevcut tüm koltukları getir (kimler masada)
 */
export function useAuctionSeats(auctionId: string | undefined) {
  return useQuery({
    queryKey: ['auction-seats', auctionId],
    enabled: !!auctionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auction_seat_holds')
        .select('*')
        .eq('auction_id', auctionId!)
        .eq('status', 'holding')
        .order('seat_number', { ascending: true });
      if (error) throw error;
      return (data ?? []) as SeatHold[];
    },
  });
}

/**
 * Kullanıcının cüzdan bakiyesini getir
 */
export function useWalletBalance() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['wallet-balance', user?.id],
    enabled: !!user,
    staleTime: 0, // Her mount'ta fresh data
    gcTime: 1000 * 60 * 5, // 5 dakika cache'le
    queryFn: async () => {
      // profile.wallet_balance her zaman gerçek cüzdandaki para (kaynak: DB)
      // transactions.balance_after sadece audit, yanlış olabilir
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('id', user!.id)
        .maybeSingle();
      const balance = Number(data?.wallet_balance ?? 0);
      // DEBUG: tespit amaçlı, hatayı bulunca kaldırılacak
      console.log('[useWalletBalance DEBUG]', {
        userId: user?.id,
        userEmail: user?.email,
        supabaseData: data,
        supabaseError: error?.message || null,
        returnedBalance: balance,
      });
      if (error) throw error;
      return balance;
    },
  });
}/**
 * Masaya otur (cüzdandan bloke)
 * Kullanıcı seat_hold kaydı oluşturur veya var olanı döner
 */
export function useJoinSeat() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ auctionId, fee }: { auctionId: string; fee: number }) => {
      if (!user) throw new Error('Giriş yapmalısınız');

      // Mevcut aktif seat_hold var mı? (status='holding' ve left_at NULL)
      const { data: existing } = await supabase
        .from('auction_seat_holds')
        .select('*')
        .eq('auction_id', auctionId)
        .eq('user_id', user.id)
        .eq('status', 'holding')
        .is('left_at', null)
        .maybeSingle();

      if (existing) {
        // Zaten aktif masada
        return existing as SeatHold;
      }

      // Cüzdan bakiyesi kontrol
      const { data: lastTx } = await supabase
        .from('transactions')
        .select('balance_after')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const balance = Number(lastTx?.balance_after ?? 0);
      if (balance < fee) {
        throw new Error(`Yetersiz bakiye. ${fee} TL gerekli, bakiyeniz: ${balance} TL`);
      }

      // Yeni seat_hold oluştur
      const { data: seats } = await supabase
        .from('auction_seat_holds')
        .select('seat_number')
        .eq('auction_id', auctionId)
        .order('seat_number', { ascending: false })
        .limit(1);
      const nextSeat = (seats?.[0]?.seat_number ?? 0) + 1;

      const { data, error } = await supabase
        .from('auction_seat_holds')
        .insert({
          auction_id: auctionId,
          user_id: user.id,
          amount: fee,
          status: 'holding',
          seat_number: nextSeat,
        })
        .select()
        .single();
      if (error) throw error;

      // Audit
      await supabase.from('auction_seat_transactions').insert({
        auction_id: auctionId,
        user_id: user.id,
        seat_hold_id: data.id,
        amount: fee,
        transaction_type: 'hold',
        balance_after: balance - fee,
        metadata: { reason: 'user_joined_seat' },
      });

      return data as SeatHold;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-seat', vars.auctionId] });
      qc.invalidateQueries({ queryKey: ['auction-seats', vars.auctionId] });
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
      qc.invalidateQueries({ queryKey: ['highest-bidder', vars.auctionId] });
    },
  });
}

/**
 * Masadan ayrıl (bloke çözülür)
 * Eğer son teklif veren ise ayrılamaz
 */
export function useLeaveSeat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ seatId }: { auctionId: string; seatId: string }) => {
      const { data, error } = await supabase
        .from('auction_seat_holds')
        .update({
          status: 'released',
          left_at: new Date().toISOString(),
          released_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', seatId)
        .select()
        .single();
      if (error) throw error;
      return data as SeatHold;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['my-seat', vars.auctionId] });
      qc.invalidateQueries({ queryKey: ['auction-seats', vars.auctionId] });
      qc.invalidateQueries({ queryKey: ['wallet-balance'] });
    },
  });
}
