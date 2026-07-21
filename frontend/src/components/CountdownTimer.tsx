import { useEffect, useState } from 'react';
import { pad, timeUntil } from '../lib/utils';
import { cn } from '../lib/utils';

interface Props {
  target: string | null | undefined;
  showMs?: boolean;
  className?: string;
  endedLabel?: string;
  /** "hmsm" → saat:dk:sn, "msm" → dk:sn, "auto" → süre > 1 saat ise saat:dk:sn, yoksa dk:sn */
  format?: 'hmsm' | 'msm' | 'auto';
  /** ışık efekti aktif mi */
  glow?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CountdownTimer({
  target, showMs = false, className, endedLabel = 'Süre Doldu',
  format = 'hmsm', glow = false, size = 'md',
}: Props) {
  const [t, setT] = useState(() => (target ? timeUntil(target) : null));

  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setT(timeUntil(target)), showMs ? 31 : 1000);
    return () => clearInterval(id);
  }, [target, showMs]);

  if (!t) return <span className={cn('text-slate-400 text-xs', className)}>—</span>;

  if (t.total <= 0) {
    return (
      <div className={cn('inline-flex items-center rounded-md bg-slate-200 px-2 py-1 text-xs font-bold text-slate-600', className)}>
        {endedLabel}
      </div>
    );
  }

  const sizeCls = size === 'sm' ? 'text-xs px-1.5 py-0.5' : size === 'lg' ? 'text-lg px-2.5 py-1.5' : 'text-sm px-2 py-1';

  // auto: süre 1 saatten fazla ise saat:dk:sn, az ise dk:sn
  const showHours = format === 'auto' ? (t.days * 24 + t.hours > 0) : format === 'hmsm';

  return (
    <div className={cn('inline-flex items-center gap-1 font-mono font-bold tabular-nums', className)}>
      {showHours && (
        <>
          <Box v={pad(t.days * 24 + t.hours, 2)} label="saat" sizeCls={sizeCls} glow={glow} />
          <span className={cn(glow && 'animate-pulse-glow rounded text-red-500')}>:</span>
        </>
      )}
      <Box v={pad(t.minutes, 2)} label="dk" sizeCls={sizeCls} glow={glow} />
      <span className={cn(glow && 'animate-pulse-glow rounded text-red-500')}>:</span>
      <Box v={pad(t.seconds, 2)} label="sn" sizeCls={sizeCls} glow={glow} />
      {showMs && (
        <>
          <span className={cn(glow && 'animate-pulse-glow rounded text-red-500')}>:</span>
          <Box v={pad(t.ms, 3)} label="ms" sizeCls={sizeCls} glow={glow} />
        </>
      )}
    </div>
  );
}

function Box({ v, label, sizeCls, glow }: { v: string; label: string; sizeCls: string; glow: boolean }) {
  return (
    <span className={cn(
      'rounded-md bg-slate-900 text-white tracking-wider',
      sizeCls,
      glow && 'shadow-[0_0_10px_rgba(239,68,68,0.7)]'
    )} title={label}>{v}</span>
  );
}
