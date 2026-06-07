import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '../lib/utils';

export type StatCardColor = 'red' | 'green' | 'blue' | 'amber' | 'slate';

const COLOR_STYLES: Record<
  StatCardColor,
  { bg: string; ring: string; text: string; trend: string }
> = {
  red: {
    bg: 'bg-red-100',
    ring: 'ring-red-200',
    text: 'text-red-600',
    trend: 'text-red-600',
  },
  green: {
    bg: 'bg-emerald-100',
    ring: 'ring-emerald-200',
    text: 'text-emerald-600',
    trend: 'text-emerald-600',
  },
  blue: {
    bg: 'bg-sky-100',
    ring: 'ring-sky-200',
    text: 'text-sky-600',
    trend: 'text-sky-600',
  },
  amber: {
    bg: 'bg-amber-100',
    ring: 'ring-amber-200',
    text: 'text-amber-600',
    trend: 'text-amber-600',
  },
  slate: {
    bg: 'bg-slate-100',
    ring: 'ring-slate-200',
    text: 'text-slate-600',
    trend: 'text-slate-600',
  },
};

export interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  trend?: number | string;
  color?: StatCardColor;
  hint?: string;
  loading?: boolean;
}

function parseTrend(trend: number | string | undefined): { value: number; direction: 'up' | 'down' | 'flat' } | null {
  if (trend === null || trend === undefined || trend === '') return null;
  const numeric = typeof trend === 'string' ? parseFloat(String(trend).replace('%', '').replace(',', '.')) : trend;
  if (Number.isNaN(numeric)) return null;
  if (numeric > 0) return { value: numeric, direction: 'up' };
  if (numeric < 0) return { value: Math.abs(numeric), direction: 'down' };
  return { value: 0, direction: 'flat' };
}

export default function StatCard({
  icon,
  label,
  value,
  trend,
  color = 'blue',
  hint,
  loading = false,
}: StatCardProps) {
  const styles = COLOR_STYLES[color];
  const parsedTrend = parseTrend(trend);
  const trendColor =
    parsedTrend?.direction === 'up'
      ? 'text-emerald-600 bg-emerald-50'
      : parsedTrend?.direction === 'down'
        ? 'text-red-600 bg-red-50'
        : 'text-slate-500 bg-slate-100';

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            'h-11 w-11 rounded-xl flex items-center justify-center ring-1',
            styles.bg,
            styles.ring,
            styles.text,
          )}
        >
          {icon}
        </div>
        {parsedTrend && (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full',
              trendColor,
            )}
            title="Önceki döneme göre değişim"
          >
            {parsedTrend.direction === 'up' && <ArrowUp className="h-3 w-3" />}
            {parsedTrend.direction === 'down' && <ArrowDown className="h-3 w-3" />}
            {parsedTrend.value.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-extrabold text-slate-900">
          {loading ? (
            <span className="inline-block h-7 w-24 rounded bg-slate-200 animate-pulse" />
          ) : (
            value
          )}
        </div>
        {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
      </div>
    </div>
  );
}
