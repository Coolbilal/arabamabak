import { useEffect, useState } from 'react';
import { cn } from '../lib/utils';

interface CountdownProps {
  target: string | Date | null;
  prefix?: string;
  showCentiseconds?: boolean;
  /** 'inline' = kısa tek satır · 'default' = kart içi · 'large' = hero */
  variant?: 'inline' | 'default' | 'large';
  /**
   * 'auto'  = hedef > 1 saat ise saat dahil, kısa ise sadece dk:sn:salise
   * 'full'  = her zaman saat dahil (saat:dk:sn:salise)
   * 'short' = hiç saat gösterme (dk:sn:salise)
   */
  format?: 'auto' | 'full' | 'short';
  /** Geçtiğinde çağrılır */
  onElapsed?: () => void;
  className?: string;
}

function pad(n: number) {
  return String(Math.max(0, Math.floor(n))).padStart(2, '0');
}

function diff(target: Date) {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, centiseconds: 0, total: 0 };
  return {
    days: Math.floor(ms / 86400000),
    hours: Math.floor((ms % 86400000) / 3600000),
    minutes: Math.floor((ms % 3600000) / 60000),
    seconds: Math.floor((ms % 60000) / 1000),
    centiseconds: Math.floor((ms % 1000) / 10),
    total: ms,
  };
}

export function Countdown({
  target, prefix, showCentiseconds = true,
  variant = 'default', format = 'auto',
  onElapsed, className,
}: CountdownProps) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setTick((t) => t + 1), 50);
    return () => clearInterval(id);
  }, [target]);

  if (!target) return <span className="text-slate-400">—</span>;
  const d = diff(new Date(target));
  const elapsed = d.total === 0;
  useEffect(() => { if (elapsed) onElapsed?.(); }, [elapsed, onElapsed]);

  // Format kararı
  const showHours =
    format === 'full' ? true :
    format === 'short' ? false :
    (d.hours > 0 || d.days > 0);

  // Salise her zaman gösterilecek
  const cs = showCentiseconds
    ? <><span className="text-slate-400">:</span><span className="text-slate-500">{pad(d.centiseconds)}</span></>
    : null;

  // ---- inline (yan yana) ----
  if (variant === 'inline') {
    return (
      <span className={cn('font-mono tabular-nums', elapsed ? 'text-slate-400' : 'text-rose-600', className)}>
        {prefix && <span className="font-sans mr-1">{prefix}</span>}
        {elapsed ? 'Süre Doldu' : (
          <>
            {d.days > 0 && <span>{d.days}g </span>}
            {showHours ? `${pad(d.hours)}:${pad(d.minutes)}:${pad(d.seconds)}` : `${pad(d.minutes)}:${pad(d.seconds)}`}
            {cs}
          </>
        )}
      </span>
    );
  }

  // ---- large (hero) ----
  if (variant === 'large') {
    return (
      <div className={cn('inline-flex flex-col items-center', className)}>
        {prefix && <div className="text-xs text-slate-500 mb-1">{prefix}</div>}
        <div className={cn('font-mono tabular-nums font-bold text-2xl md:text-3xl flex items-baseline gap-1',
          elapsed ? 'text-slate-400' : 'text-rose-600')}>
          {d.days > 0 && <span>{d.days}<span className="text-xs text-slate-500 ml-0.5">g</span></span>}
          {showHours && (
            <>
              {pad(d.hours)}<span className="text-slate-400">:</span>
            </>
          )}
          {pad(d.minutes)}<span className="text-slate-400">:</span>
          {pad(d.seconds)}
          {cs && (
            <>
              <span className="text-slate-400">:</span>
              <span className="text-slate-500">{pad(d.centiseconds)}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  // ---- default (kart içi) ----
  return (
    <div className={cn('inline-flex items-center gap-2 font-mono tabular-nums',
      elapsed ? 'text-slate-400' : 'text-rose-600', className)}>
      {prefix && <span className="font-sans text-slate-600 text-xs">{prefix}</span>}
      {elapsed ? (
        <span className="text-xs">⏱ Süre Doldu</span>
      ) : (
        <span className="font-bold">
          {d.days > 0 && <span className="mr-1">{d.days}g</span>}
          {showHours && <>{pad(d.hours)}:</>}
          {pad(d.minutes)}:{pad(d.seconds)}
          {cs}
        </span>
      )}
    </div>
  );
}
