import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// Arabamabak'ın gerçek parça kodları (13 parça, senin component'inle uyumlu)
const PARTS: { code: string; label: string; x: number; y: number; w: number; h: number }[] = [
  { code: 'front_bumper', label: 'Ön Tampon', x: 100, y: 40, w: 100, h: 60 },
  { code: 'hood', label: 'Kaput', x: 100, y: 100, w: 100, h: 80 },
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk', x: 60, y: 100, w: 40, h: 80 },
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk', x: 200, y: 100, w: 40, h: 80 },
  { code: 'left_front_door', label: 'Sol Ön Kapı', x: 60, y: 180, w: 40, h: 100 },
  { code: 'right_front_door', label: 'Sağ Ön Kapı', x: 200, y: 180, w: 40, h: 100 },
  { code: 'roof', label: 'Tavan', x: 100, y: 180, w: 100, h: 100 },
  { code: 'left_rear_door', label: 'Sol Arka Kapı', x: 60, y: 280, w: 40, h: 100 },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı', x: 200, y: 280, w: 40, h: 100 },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk', x: 60, y: 380, w: 40, h: 80 },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk', x: 200, y: 380, w: 40, h: 80 },
  { code: 'trunk', label: 'Bagaj', x: 100, y: 380, w: 100, h: 80 },
  { code: 'rear_bumper', label: 'Arka Tampon', x: 100, y: 460, w: 100, h: 60 },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string }> = {
  none: { label: 'Belirtilmemiş', color: 'transparent' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.55)' },
  painted: { label: 'Boyalı', color: 'rgba(250, 204, 21, 0.6)' },
  local_painted: { label: 'Lokal Boyalı', color: 'rgba(253, 230, 138, 0.7)' },
  changed: { label: 'Değişen', color: 'rgba(239, 68, 68, 0.6)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.6)' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  width?: number;
  readOnly?: boolean;
};

export default function CarDiagramSVG({ value, onChange, width = 300, readOnly = false }: Props) {
  function handleClick(code: string) {
    if (readOnly) return;
    const current = value[code];
    // Senin component'indeki cycle: original -> painted -> changed -> none
    let next: PaintStatus;
    if (!current || current === 'none') next = 'original';
    else if (current === 'original') next = 'painted';
    else if (current === 'painted') next = 'changed';
    else if (current === 'changed') next = 'repaired';
    else next = 'none';
    onChange({ ...value, [code]: next });
  }

  return (
    <div className="space-y-3">
      <svg
        viewBox="0 0 300 600"
        width={width}
        className="select-none"
        style={{ maxWidth: '100%', height: 'auto' }}
      >
        {/* Tekerlekler (dekoratif) */}
        <ellipse cx="40" cy="140" rx="14" ry="22" fill="#1e293b" />
        <ellipse cx="40" cy="420" rx="14" ry="22" fill="#1e293b" />
        <ellipse cx="260" cy="140" rx="14" ry="22" fill="#1e293b" />
        <ellipse cx="260" cy="420" rx="14" ry="22" fill="#1e293b" />

        {/* Parçalar */}
        {PARTS.map((p) => {
          const status = value[p.code] ?? 'none';
          const fill = status === 'none' ? '#e2e8f0' : STATUS_META[status].color;
          return (
            <g key={p.code}>
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                fill={fill}
                stroke="#475569"
                strokeWidth="2"
                className={cn(
                  'transition-colors duration-150',
                  !readOnly && 'cursor-pointer hover:opacity-80'
                )}
                onClick={() => handleClick(p.code)}
              >
                <title>{p.label}</title>
              </rect>
            </g>
          );
        })}
      </svg>

      {/* Renk listesi (senin component'indeki gibi) */}
      <div className="text-sm space-y-1">
        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: 'rgba(16, 185, 129, 0.55)' }} />
          Orijinal
        </p>
        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: 'rgba(250, 204, 21, 0.6)' }} />
          Boyalı
        </p>
        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: 'rgba(253, 230, 138, 0.7)' }} />
          Lokal Boyalı
        </p>
        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: 'rgba(239, 68, 68, 0.6)' }} />
          Değişmiş
        </p>
        <p className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full inline-block" style={{ background: 'rgba(59, 130, 246, 0.6)' }} />
          Tamir
        </p>
      </div>
    </div>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
