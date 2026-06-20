import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * AuctionTicker: Her 30 saniyede bir tick_auction_lifecycle RPC'sini çağırır.
 * pg_cron olmadığı için bu yöntemle scheduled → live, live → ended geçişleri tetiklenir.
 * Idempotent: sadece zamanı gelmişse status değiştirir.
 */
export default function AuctionTicker() {
  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        await supabase.rpc('tick_auction_lifecycle');
      } catch {
        // sessizce yoksay, network hatası olabilir
      }
    };

    // İlk yüklemede bir kere çalıştır
    tick();
    // Sonra her 10 saniyede bir (daha hızlı tepki için)
    const interval = setInterval(tick, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return null;
}
