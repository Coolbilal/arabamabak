import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface CountdownProps {
  /** Hedef tarih (gelecekte) veya geçmiş (negatif sayım) */
  target: string | Date | null;
  /** Geçtiğinde ne gösterileceği */
  onElapsed?: () => void;
  /** Salise dahil mi (varsayılan: true, 50ms refresh) */
  showCentiseconds?: boolean;
  /** "GÜN" de göster */
  showDays?: boolean;
  /** Prefix (örn: "Mezatın başlamasına") */
  prefix?: string;
  /** Variant */
  variant?: 'default' | 'large' | 'inline';
  className?: string;
}

function pad(n: number, len = 2) {
  return String(Math.max(0, Math.floor(n))).padStart(len, '0');
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, centiseconds: 0, total: 0 };
  }
  const total = ms;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const centiseconds = Math.floor((ms % 1000) / 10);
  return { days, hours, minutes, seconds, centiseconds, total };
}

export function Countdown({
  target, onElapsed, showCentiseconds = true, showDays = true,
  prefix, variant = 'default', className,
}: CountdownProps) {
  const [, setTick] = useState(0);
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!target) return;
    setElapsed(false);
    const id = setInterval(() => setTick((t) => t + 1), showCentiseconds ? 50 : 1000);
    return () => clearInterval(id);
  }, [target, showCentiseconds]);

  if (!target) {
    return <span className={cn('text-slate-400', className)}>—</span>;
  }

  const d = diff(new Date(target));
  const isElapsed = d.total === 0;

  useEffect(() => {
    if (isElapsed && !elapsed) {
      setElapsed(true);
      onElapsed?.();
    }
  }, [isElapsed, elapsed, onElapsed]);

  if (variant === 'inline') {
    return (
      <span className={cn('font-mono tabular-nums', isElapsed && 'text-slate-400', className)}>
        {prefix && <span className="font-sans">{prefix} </span>}
        {isElapsed ? 'Süre Doldu' : (
          <>
            {showDays && d.days > 0 && `${d.days}g `}
            {pad(d.hours)}:{pad(d.minutes)}:{pad(d.seconds)}
            {showCentiseconds && <span className="text-slate-400">:{pad(d.centiseconds)}</span>}
          </>
        )}
      </span>
    );
  }

  if (variant === 'large') {
    return (
      <div className={cn('inline-flex flex-col items-center', className)}>
        {prefix && <div className="text-xs text-slate-500 mb-1">{prefix}</div>}
        <div className={cn('inline-flex items-baseline gap-1 font-mono tabular-nums font-bold',
          isElapsed ? 'text-slate-400' : 'text-rose-600')}>
          {showDays && d.days > 0 && (
            <span className="text-2xl">
              {d.days}<span className="text-sm text-slate-500 ml-0.5">g</span>
            </span>
          )}
          <span className="text-3xl">{pad(d.hours)}</span>
          <span className="text-2xl text-slate-400">:</span>
          <span className="text-3xl">{pad(d.minutes)}</span>
          <span className="text-2xl text-slate-400">:</span>
          <span className="text-3xl">{pad(d.seconds)}</span>
          {showCentiseconds && (
            <>
              <span className="text-2xl text-slate-400">:</span>
              <span className="text-2xl text-slate-500">{pad(d.centiseconds)}</span>
            </>
          )}
        </div>
        <div className="text-[10px] text-slate-400 mt-1 font-sans">saat : dakika : saniye : salise</div>
      </div>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-2 font-mono tabular-nums',
      isElapsed ? 'text-slate-400' : 'text-rose-600', className)}>
      {prefix && <span className="font-sans text-slate-600 text-xs">{prefix}</span>}
      {isElapsed ? (
        <span className="text-xs">⏱ Süre Doldu</span>
      ) : (
        <span className="font-bold">
          {showDays && d.days > 0 && <span className="mr-1">{d.days}g</span>}
          {pad(d.hours)}:{pad(d.minutes)}:{pad(d.seconds)}
          {showCentiseconds && <span className="text-slate-400">:{pad(d.centiseconds)}</span>}
        </span>
      )}
    </div>
  );
}
