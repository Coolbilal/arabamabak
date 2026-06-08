import { useEffect, useRef, useState } from 'react';
import { cn, formatPrice } from '../lib/utils';
import { Hammer, TrendingUp } from 'lucide-react';

interface LiveBidPillProps {
  amount: number;
  totalBids: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Canlı açık arttırmalarda gösterilen "Son Teklif" rozeti.
 * - Trafik yeşili (yeşil-500) arka plan, siyah yazı
 * - Yeni teklif gelince 2.5 sn kırmızı flash
 */
export function LiveBidPill({ amount, totalBids, size = 'md', className }: LiveBidPillProps) {
  const [isNew, setIsNew] = useState(false);
  const prevAmount = useRef(amount);

  useEffect(() => {
    if (amount !== prevAmount.current) {
      prevAmount.current = amount;
      setIsNew(true);
      const id = setTimeout(() => setIsNew(false), 2500);
      return () => clearTimeout(id);
    }
  }, [amount]);

  const sizeCls = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  }[size];
  const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';

  return (
    <div className={cn('inline-flex items-center', sizeCls, className)}>
      <div
        className={cn(
          'relative flex items-center gap-1.5 rounded-md text-black font-extrabold px-3 py-1.5 overflow-hidden',
          'border-2',
          isNew
            ? 'bg-red-500 border-red-700 shadow-lg shadow-red-500/50 animate-pulse'
            : 'bg-green-500 border-green-700 shadow-md shadow-green-500/30 animate-pulse-green',
        )}
      >
        {/* shimmer efekti */}
        <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer pointer-events-none" />
        <Hammer className={cn(iconSize, 'relative z-10')} />
        <div className="relative z-10 flex flex-col leading-tight">
          <span className="text-[9px] uppercase tracking-wide font-black opacity-80">
            {isNew ? 'YENİ TEKLİF!' : 'Son Teklif'}
          </span>
          <span className="font-black tabular-nums">{formatPrice(amount)}</span>
        </div>
      </div>
      {totalBids > 0 && (
        <div className="ml-1 inline-flex items-center gap-1 rounded-md bg-slate-900/90 text-white px-2 py-1.5 text-xs font-bold tabular-nums">
          <TrendingUp className="h-3 w-3 text-emerald-300" />
          {totalBids}
        </div>
      )}
    </div>
  );
}
