import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// 13 parça - birebir PNG'deki gibi dikey araba
// Üstten görünüm, ön (kaput) ÜSTTE, arka (bagaj) ALTTA
const PARTS: { code: string; label: string; d: string }[] = [
  // Ön Tampon (en üst)
  {
    code: 'front_bumper',
    label: 'Ön Tampon',
    d: 'M 240 20 L 560 20 Q 580 20 580 40 L 580 95 Q 580 110 560 110 L 240 110 Q 220 110 220 95 L 220 40 Q 220 20 240 20 Z',
  },
  // Kaput
  {
    code: 'hood',
    label: 'Kaput',
    d: 'M 250 110 L 550 110 L 550 260 L 250 260 Z',
  },
  // Tavan
  {
    code: 'roof',
    label: 'Tavan',
    d: 'M 250 280 L 550 280 L 550 720 L 250 720 Z',
  },
  // Bagaj
  {
    code: 'trunk',
    label: 'Bagaj',
    d: 'M 250 740 L 550 740 L 550 880 Q 550 900 530 900 L 270 900 Q 250 900 250 880 Z',
  },
  // Arka Tampon (en alt)
  {
    code: 'rear_bumper',
    label: 'Arka Tampon',
    d: 'M 240 900 L 560 900 Q 580 900 580 920 L 580 970 Q 580 985 565 985 L 235 985 Q 220 985 220 970 L 220 920 Q 220 900 240 900 Z',
  },
  // Sol Ön Çamurluk (bombeli, tekerlek yuvası)
  {
    code: 'left_front_fender',
    label: 'Sol Ön Çamurluk',
    d: 'M 230 110 L 230 260 L 80 260 Q 30 260 30 220 L 30 150 Q 30 110 80 110 Z',
  },
  // Sol Ön Kapı
  {
    code: 'left_front_door',
    label: 'Sol Ön Kapı',
    d: 'M 230 280 L 230 500 L 70 500 Q 30 500 30 460 L 30 280 Z',
  },
  // Sol Arka Kapı
  {
    code: 'left_rear_door',
    label: 'Sol Arka Kapı',
    d: 'M 230 520 L 230 720 L 70 720 Q 30 720 30 680 L 30 520 Z',
  },
  // Sol Arka Çamurluk
  {
    code: 'left_rear_fender',
    label: 'Sol Arka Çamurluk',
    d: 'M 230 740 L 230 900 L 80 900 Q 30 900 30 860 L 30 790 Q 30 740 80 740 Z',
  },
  // Sağ Ön Çamurluk
  {
    code: 'right_front_fender',
    label: 'Sağ Ön Çamurluk',
    d: 'M 570 110 L 570 260 L 720 260 Q 770 260 770 220 L 770 150 Q 770 110 720 110 Z',
  },
  // Sağ Ön Kapı
  {
    code: 'right_front_door',
    label: 'Sağ Ön Kapı',
    d: 'M 570 280 L 570 500 L 730 500 Q 770 500 770 460 L 770 280 Z',
  },
  // Sağ Arka Kapı
  {
    code: 'right_rear_door',
    label: 'Sağ Arka Kapı',
    d: 'M 570 520 L 570 720 L 730 720 Q 770 720 770 680 L 770 520 Z',
  },
  // Sağ Arka Çamurluk
  {
    code: 'right_rear_fender',
    label: 'Sağ Arka Çamurluk',
    d: 'M 570 740 L 570 900 L 720 900 Q 770 900 770 860 L 770 790 Q 770 740 720 740 Z',
  },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: 'stripes' }> = {
  none: { label: 'Belirtilmemiş', color: 'transparent' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.55)' },
  painted: { label: 'Boyalı', color: 'rgba(250, 204, 21, 0.6)' },
  local_painted: { label: 'Lokal Boyalı', color: 'rgba(253, 230, 138, 0.7)', pattern: 'stripes' },
  changed: { label: 'Değişen', color: 'rgba(239, 68, 68, 0.6)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.6)' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  width?: number;
  readOnly?: boolean;
};

export default function CarDiagramSVG({ value, onChange, width = 500, readOnly = false }: Props) {
  const order: PaintStatus[] = ['none', 'original', 'painted', 'local_painted', 'changed', 'repaired', 'none'];

  function cycleStatus(code: string) {
    if (readOnly) return;
    const current = value[code] ?? 'none';
    const idx = order.indexOf(current);
    const next = order[idx + 1] ?? 'none';
    onChange({ ...value, [code]: next });
  }

  return (
    <svg
      viewBox="0 0 800 1000"
      width={width}
      height={width * (1000 / 800)}
      className="select-none"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <pattern id="stripes-pattern" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="rgba(253, 230, 138, 0.5)" />
          <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(202, 138, 4, 0.7)" strokeWidth="6" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="800" height="1000" fill="#f8fafc" />

      {/* TEKERLEKLER (dekoratif) */}
      <ellipse cx="55" cy="185" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="185" rx="22" ry="38" fill="#cbd5e1" />
      <ellipse cx="55" cy="820" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="820" rx="22" ry="38" fill="#cbd5e1" />
      <ellipse cx="745" cy="185" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="185" rx="22" ry="38" fill="#cbd5e1" />
      <ellipse cx="745" cy="820" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="820" rx="22" ry="38" fill="#cbd5e1" />

      {/* PARÇALAR */}
      {PARTS.map((part) => {
        const status = value[part.code] ?? 'none';
        const meta = STATUS_META[status];
        const baseFill = '#e2e8f0';
        const fillColor = status === 'none' ? baseFill :
                          status === 'local_painted' ? 'url(#stripes-pattern)' :
                          meta.color;
        return (
          <path
            key={part.code}
            d={part.d}
            fill={fillColor}
            stroke="#475569"
            strokeWidth="3"
            strokeLinejoin="round"
            className={cn(
              'transition-all duration-200',
              !readOnly && 'cursor-pointer hover:brightness-95'
            )}
            onClick={() => cycleStatus(part.code)}
          >
            <title>{part.label}</title>
          </path>
        );
      })}

      {/* CAMLAR (dekoratif) */}
      <path d="M 260 260 L 290 280 L 510 280 L 540 260 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 260 720 L 290 740 L 510 740 L 540 720 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 60 300 L 220 300 L 220 400 L 60 400 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 60 540 L 220 540 L 220 640 L 60 640 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 740 300 L 580 300 L 580 400 L 740 400 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 740 540 L 580 540 L 580 640 L 740 640 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
    </svg>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
