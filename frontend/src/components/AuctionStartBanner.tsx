import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { timeUntil } from '../lib/utils';

type AuctionLike = {
  id: string;
  status: string;
  start_at: string | null;
};

type Props = {
  auction: AuctionLike | null;
  qcKey: readonly unknown[];
};

/**
 * Slot saatine 20 saniye kala banner gösterir + saati gelince açık arttırmayı tetikler.
 * Kendi hook'larını içerir — parent'ın hook sırasını etkilemez.
 */
export default function AuctionStartBanner({ auction, qcKey }: Props) {
  const queryClient = useQueryClient();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (auction?.status === 'scheduled') {
      const id = setInterval(() => setTick((n) => n + 1), 1000);
      return () => clearInterval(id);
    }
  }, [auction?.status]);

  // tick değişince tStart yeniden hesaplanır
  const tStart = tick >= 0 && auction?.start_at ? timeUntil(auction.start_at) : null;

  // 20 saniye kala banner
  if (
    auction?.status === 'scheduled' &&
    tStart !== null &&
    tStart.total > 0 &&
    tStart.total <= 20
  ) {
    return (
      <div className="mb-4 rounded-lg border-2 border-amber-400 bg-amber-50 p-4 text-center">
        <span className="font-bold text-amber-800">AÇIK ARTTIRMA BAŞLIYOR!</span>
        <p className="text-sm text-amber-700 mt-1">
          {tStart.total} saniye içinde masaya oturabilirsiniz
        </p>
      </div>
    );
  }

  // Saati geldi → tetikle
  useEffect(() => {
    if (
      auction?.status === 'scheduled' &&
      tStart &&
      tStart.total === 0 &&
      auction.id
    ) {
      (async () => {
        try {
          await supabase.rpc('tick_auction_lifecycle');
          queryClient.invalidateQueries({ queryKey: qcKey });
        } catch {
          // sessizce yoksay
        }
      })();
    }
  }, [auction?.status, tStart?.total, auction?.id, queryClient, qcKey]);

  return null;
}
