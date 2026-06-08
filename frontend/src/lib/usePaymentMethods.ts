import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  type: 'wallet' | 'card' | 'bank';
  is_active: boolean;
  is_default: boolean;
  fee_percent: number;
  fee_fixed: number;
  description: string | null;
  config: Record<string, any>;
  icon: string;
}

/** Aktif ödeme yöntemlerini getir. */
export function usePaymentMethods() {
  return useQuery({
    queryKey: ['payment-methods'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentMethod[];
    },
    staleTime: 60_000,
  });
}

/** Ödeme sonrası wallet bakiyesini günceller (wallet tipi için). */
export function useProcessPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      methodCode,
      amount,
      description,
      relatedVehicleId,
      relatedAuctionId,
    }: {
      userId: string;
      methodCode: 'wallet' | 'iyzico' | 'bank_transfer' | string;
      amount: number;
      description: string;
      relatedVehicleId?: string | null;
      relatedAuctionId?: string | null;
    }) => {
      // 1) transactions insert
      const txType = amount > 0 ? 'auction_payment' : 'expertise_payment';
      const { data: tx, error: txErr } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          type: txType,
          amount,
          status: 'completed',
          payment_method: methodCode,
          description,
          related_vehicle_id: relatedVehicleId ?? null,
          related_auction_id: relatedAuctionId ?? null,
          completed_at: new Date().toISOString(),
        })
        .select('*')
        .single();
      if (txErr) throw txErr;

      // 2) wallet düş (sadece wallet ödemede)
      if (methodCode === 'wallet' && amount > 0) {
        const { error: walletErr } = await supabase.rpc('decrement_wallet_balance', {
          p_user_id: userId,
          p_amount: amount,
        });
        if (walletErr) {
          // RPC yoksa fallback: profil çek, azalt, yaz
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', userId)
            .single();
          if (profile) {
            await supabase
              .from('profiles')
              .update({ wallet_balance: Number(profile.wallet_balance) - amount })
              .eq('id', userId);
          }
        }
      }

      return tx;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      qc.invalidateQueries({ queryKey: ['auth-user'] });
    },
  });
}
