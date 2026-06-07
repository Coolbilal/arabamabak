import { cn } from '../lib/utils';
import { CheckCircle2 } from 'lucide-react';

interface SoldStampProps {
  variant?: 'full' | 'corner';
  className?: string;
}

/**
 * "SATILDI" damga/mühür rozeti.
 * - variant='full': görselin tamamını kaplayan diyagonal büyük mühür
 * - variant='corner': sağ üst köşede küçük yatay badge
 */
export function SoldStamp({ variant = 'full', className }: SoldStampProps) {
  if (variant === 'corner') {
    return (
      <div className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-extrabold tracking-wider',
        'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30',
        className,
      )}>
        <CheckCircle2 className="h-3.5 w-3.5" />
        SATILDI
      </div>
    );
  }

  return (
    <div className={cn('absolute inset-0 pointer-events-none flex items-center justify-center', className)}>
      <div
        className="relative select-none"
        style={{ transform: 'rotate(-18deg)' }}
      >
        <div
          className="px-6 py-3 border-[6px] border-double border-red-600 rounded-lg shadow-2xl"
          style={{
            background: 'rgba(220, 38, 38, 0.85)',
          }}
        >
          <div
            className="text-4xl md:text-5xl font-black text-white tracking-widest text-center"
            style={{ textShadow: '2px 2px 0 #b91c1c, -1px -1px 0 #b91c1c' }}
          >
            SATILDI
          </div>
          <div className="text-[10px] text-white/80 text-center mt-0.5 font-bold tracking-wide">
            ✦ arabamabak ✦
          </div>
        </div>
      </div>
    </div>
  );
}
