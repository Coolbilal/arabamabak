import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// 13 parça - senin PNG'nin gerçek şekillerine uygun SVG path'ler
// PNG'siz, sadece path ile gerçek araba parçası şekli (kare/dikdörtgen değil)
// viewBox 400x500 (senin PNG oranı)

const PARTS: { code: string; label: string; d: string }[] = [
  // === ÖN TAMPON (en üst) ===
  // yatay ince, alt dudağı dalgalı (M şeklinde)
  {
    code: 'front_bumper',
    label: 'Ön Tampon',
    d: 'M 110 12 L 290 12 Q 300 12 300 25 L 300 70 Q 300 80 290 82 L 270 82 Q 265 90 260 90 Q 255 90 250 82 L 230 82 Q 225 90 220 90 Q 215 90 210 82 L 190 82 Q 185 90 180 90 Q 175 90 170 82 L 150 82 Q 145 90 140 90 Q 135 90 130 82 L 110 82 Q 100 80 100 70 L 100 25 Q 100 12 110 12 Z',
  },
  // === SOL ÖN ÇAMURLUK (yarım ay) ===
  {
    code: 'left_front_fender',
    label: 'Sol Ön Çamurluk',
    d: 'M 20 100 Q 20 90 30 88 L 100 88 L 100 195 L 50 195 Q 25 195 18 175 Q 10 150 12 130 Q 15 110 20 100 Z',
  },
  // === SAĞ ÖN ÇAMURLUK ===
  {
    code: 'right_front_fender',
    label: 'Sağ Ön Çamurluk',
    d: 'M 380 100 Q 380 90 370 88 L 300 88 L 300 195 L 350 195 Q 375 195 382 175 Q 390 150 388 130 Q 385 110 380 100 Z',
  },
  // === KAPUT (orta üst, dikdörtgen hafif kavisli) ===
  {
    code: 'hood',
    label: 'Kaput',
    d: 'M 130 90 L 270 90 L 270 195 L 130 195 Z',
  },
  // === SOL ÖN KAPI (sol orta üst) ===
  {
    code: 'left_front_door',
    label: 'Sol Ön Kapı',
    d: 'M 20 200 L 100 200 L 100 280 L 50 280 Q 30 280 22 270 L 20 250 Z',
  },
  // === SAĞ ÖN KAPI ===
  {
    code: 'right_front_door',
    label: 'Sağ Ön Kapı',
    d: 'M 380 200 L 300 200 L 300 280 L 350 280 Q 370 280 378 270 L 380 250 Z',
  },
  // === TAVAN (en orta) ===
  {
    code: 'roof',
    label: 'Tavan',
    d: 'M 130 205 L 270 205 L 270 290 L 130 290 Z',
  },
  // === SOL ARKA KAPI (sol orta alt) ===
  {
    code: 'left_rear_door',
    label: 'Sol Arka Kapı',
    d: 'M 20 290 L 100 290 L 100 365 L 50 365 Q 30 365 22 355 L 20 340 Z',
  },
  // === SAĞ ARKA KAPI ===
  {
    code: 'right_rear_door',
    label: 'Sağ Arka Kapı',
    d: 'M 380 290 L 300 290 L 300 365 L 350 365 Q 370 365 378 355 L 380 340 Z',
  },
  // === SOL ARKA ÇAMURLUK (alt-sol, yarım ay) ===
  {
    code: 'left_rear_fender',
    label: 'Sol Arka Çamurluk',
    d: 'M 20 375 L 100 375 L 100 460 L 50 460 Q 25 460 18 445 Q 10 425 12 410 Q 15 390 20 380 Z',
  },
  // === SAĞ ARKA ÇAMURLUK ===
  {
    code: 'right_rear_fender',
    label: 'Sağ Arka Çamurluk',
    d: 'M 380 375 L 300 375 L 300 460 L 350 460 Q 375 460 382 445 Q 390 425 388 410 Q 385 390 380 380 Z',
  },
  // === BAGAJ (orta alt) ===
  {
    code: 'trunk',
    label: 'Bagaj',
    d: 'M 130 375 L 270 375 L 270 460 L 130 460 Z',
  },
  // === ARKA TAMPON (en alt) ===
  {
    code: 'rear_bumper',
    label: 'Arka Tampon',
    d: 'M 110 470 L 290 470 Q 300 470 300 480 L 300 490 Q 300 500 290 500 L 110 500 Q 100 500 100 490 L 100 480 Q 100 470 110 470 Z',
  },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: 'stripes' }> = {
  none: { label: 'Belirtilmemiş', color: 'transparent' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.6)' },
  painted: { label: 'Boyalı', color: 'rgba(250, 204, 21, 0.65)' },
  local_painted: { label: 'Lokal Boyalı', color: 'rgba(253, 230, 138, 0.75)' },
  changed: { label: 'Değişen', color: 'rgba(239, 68, 68, 0.65)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.65)' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  width?: number;
  readOnly?: boolean;
};

export default function CarDiagramSVG({ value, onChange, width = 400, readOnly = false }: Props) {
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
      viewBox="0 0 400 500"
      width={width}
      height={width * (500 / 400)}
      className="select-none"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <pattern id="stripes-pattern" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
          <rect width="10" height="10" fill="rgba(253, 230, 138, 0.5)" />
          <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(202, 138, 4, 0.7)" strokeWidth="4" />
        </pattern>
      </defs>

      {/* Arka plan - açık gri */}
      <rect x="0" y="0" width="400" height="500" fill="#f1f5f9" />

      {/* PARÇALAR - her biri gerçek araba parçası şeklinde */}
      {PARTS.map((part) => {
        const status = value[part.code] ?? 'none';
        const meta = STATUS_META[status];
        const baseFill = '#cbd5e1'; // açık gri (parçaların baz rengi)
        const fillColor = status === 'none' ? baseFill :
                          status === 'local_painted' ? 'url(#stripes-pattern)' :
                          meta.color;
        return (
          <path
            key={part.code}
            d={part.d}
            fill={fillColor}
            stroke="#475569"
            strokeWidth="2"
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
    </svg>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
