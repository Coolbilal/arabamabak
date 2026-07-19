import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// Üstten görünüm, dikey araba (PNG'deki gibi)
// 13 parça, gerçek araba şekilleri (yuvarlak hatlar, bombeli çamurluklar, pencereli kapılar)
const PARTS: { code: string; label: string; d: string }[] = [
  // Ön Tampon (en üst) - yatay, ince, bombeli
  {
    code: 'front_bumper',
    label: 'Ön Tampon',
    d: 'M 230 30 Q 230 20 245 20 L 555 20 Q 570 20 570 30 L 570 95 Q 570 110 555 110 L 245 110 Q 230 110 230 95 Z',
  },
  // Kaput - dikdörtgen
  {
    code: 'hood',
    label: 'Kaput',
    d: 'M 250 130 Q 250 115 270 115 L 530 115 Q 550 115 550 130 L 550 280 L 250 280 Z',
  },
  // Tavan - büyük dikdörtgen
  {
    code: 'roof',
    label: 'Tavan',
    d: 'M 250 290 L 550 290 L 550 700 L 250 700 Z',
  },
  // Bagaj
  {
    code: 'trunk',
    label: 'Bagaj',
    d: 'M 250 720 L 550 720 L 550 870 Q 550 885 530 885 L 270 885 Q 250 885 250 870 Z',
  },
  // Arka Tampon (en alt)
  {
    code: 'rear_bumper',
    label: 'Arka Tampon',
    d: 'M 230 905 Q 230 890 245 890 L 555 890 Q 570 890 570 905 L 570 970 Q 570 985 555 985 L 245 985 Q 230 985 230 970 Z',
  },
  // SOL TARAF (yolcu)
  {
    code: 'left_front_fender',
    label: 'Sol Ön Çamurluk',
    d: 'M 30 115 Q 30 95 60 95 L 230 115 L 230 280 L 60 280 Q 30 280 30 250 L 30 115 Z',
  },
  {
    code: 'left_front_door',
    label: 'Sol Ön Kapı',
    d: 'M 30 290 L 230 290 L 230 490 L 60 490 Q 30 490 30 460 L 30 290 Z',
  },
  {
    code: 'left_rear_door',
    label: 'Sol Arka Kapı',
    d: 'M 30 500 L 230 500 L 230 700 L 60 700 Q 30 700 30 670 L 30 500 Z',
  },
  {
    code: 'left_rear_fender',
    label: 'Sol Arka Çamurluk',
    d: 'M 30 710 L 230 710 L 230 885 L 60 885 Q 30 880 30 850 L 30 710 Z',
  },
  // SAĞ TARAF (sürücü)
  {
    code: 'right_front_fender',
    label: 'Sağ Ön Çamurluk',
    d: 'M 770 115 Q 770 95 740 95 L 570 115 L 570 280 L 740 280 Q 770 280 770 250 L 770 115 Z',
  },
  {
    code: 'right_front_door',
    label: 'Sağ Ön Kapı',
    d: 'M 770 290 L 570 290 L 570 490 L 740 490 Q 770 490 770 460 L 770 290 Z',
  },
  {
    code: 'right_rear_door',
    label: 'Sağ Arka Kapı',
    d: 'M 770 500 L 570 500 L 570 700 L 740 700 Q 770 700 770 670 L 770 500 Z',
  },
  {
    code: 'right_rear_fender',
    label: 'Sağ Arka Çamurluk',
    d: 'M 770 710 L 570 710 L 570 885 L 740 885 Q 770 880 770 850 L 770 710 Z',
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
      <ellipse cx="20" cy="200" rx="35" ry="55" fill="#1e293b" />
      <ellipse cx="20" cy="200" rx="18" ry="32" fill="#cbd5e1" />
      <ellipse cx="20" cy="800" rx="35" ry="55" fill="#1e293b" />
      <ellipse cx="20" cy="800" rx="18" ry="32" fill="#cbd5e1" />
      <ellipse cx="780" cy="200" rx="35" ry="55" fill="#1e293b" />
      <ellipse cx="780" cy="200" rx="18" ry="32" fill="#cbd5e1" />
      <ellipse cx="780" cy="800" rx="35" ry="55" fill="#1e293b" />
      <ellipse cx="780" cy="800" rx="18" ry="32" fill="#cbd5e1" />

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

      {/* ÖN CAM (kaput-tavan arası, trapez) */}
      <path d="M 260 280 L 290 290 L 510 290 L 540 280 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* ARKA CAM (tavan-bagaj arası, trapez) */}
      <path d="M 260 700 L 290 715 L 510 715 L 540 700 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* Sol cam (kapı üstlerinde) */}
      <path d="M 50 310 L 215 310 L 215 400 L 50 400 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 50 520 L 215 520 L 215 610 L 50 610 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* Sağ cam */}
      <path d="M 750 310 L 585 310 L 585 400 L 750 400 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      <path d="M 750 520 L 585 520 L 585 610 L 750 610 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
    </svg>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
