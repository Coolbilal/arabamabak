import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

type Props = {
  // her parça icin status (kod -> status)
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  // Genislik (varsayilan 600)
  width?: number;
  // readonly mi (sadece gosterim)
  readOnly?: boolean;
};

// Her parça icin path (gerçek araba üstten görünüm, 13 parça)
// viewBox: 0 0 1000 600 (genişlik 1000, yükseklik 600 oran)
// Her parça ayrı <path> ile, fill stroke ile çizilmiş
// data-part attr ile JS tarafında tıklanır
const PARTS: {
  code: string;
  label: string;
  d: string;
  cx: number; // center x (label için)
  cy: number; // center y
}[] = [
  // Ön Tampon (en altta, ön kısım)
  {
    code: 'front_bumper',
    label: 'Ön Tampon',
    d: 'M 250 540 Q 250 510 280 510 L 720 510 Q 750 510 750 540 L 750 570 Q 750 590 720 590 L 280 590 Q 250 590 250 570 Z',
    cx: 500, cy: 550,
  },
  // Kaput (ön tampon üstü, büyük dikdörtgen)
  {
    code: 'hood',
    label: 'Kaput',
    d: 'M 290 380 L 290 510 L 710 510 L 710 380 Q 700 360 670 360 L 330 360 Q 300 360 290 380 Z',
    cx: 500, cy: 440,
  },
  // Sol Ön Çamurluk (sol taraf, ön)
  {
    code: 'left_front_fender',
    label: 'Sol Ön Çamurluk',
    d: 'M 200 380 Q 200 360 220 350 L 290 350 L 290 510 L 250 510 Q 220 510 210 490 Z',
    cx: 245, cy: 430,
  },
  // Sağ Ön Çamurluk
  {
    code: 'right_front_fender',
    label: 'Sağ Ön Çamurluk',
    d: 'M 800 380 Q 800 360 780 350 L 710 350 L 710 510 L 750 510 Q 780 510 790 490 Z',
    cx: 755, cy: 430,
  },
  // Sol Ön Kapı (sol, orta-ön)
  {
    code: 'left_front_door',
    label: 'Sol Ön Kapı',
    d: 'M 200 380 L 290 380 L 290 380 L 290 240 L 220 240 Q 200 240 200 260 Z',
    cx: 245, cy: 310,
  },
  // Sağ Ön Kapı
  {
    code: 'right_front_door',
    label: 'Sağ Ön Kapı',
    d: 'M 800 380 L 710 380 L 710 240 L 780 240 Q 800 240 800 260 Z',
    cx: 755, cy: 310,
  },
  // Sol Arka Kapı
  {
    code: 'left_rear_door',
    label: 'Sol Arka Kapı',
    d: 'M 200 240 L 290 240 L 290 100 L 230 100 Q 200 100 200 130 Z',
    cx: 245, cy: 170,
  },
  // Sağ Arka Kapı
  {
    code: 'right_rear_door',
    label: 'Sağ Arka Kapı',
    d: 'M 800 240 L 710 240 L 710 100 L 770 100 Q 800 100 800 130 Z',
    cx: 755, cy: 170,
  },
  // Sol Arka Çamurluk
  {
    code: 'left_rear_fender',
    label: 'Sol Arka Çamurluk',
    d: 'M 200 130 Q 200 100 230 90 L 290 100 L 290 240 L 220 240 Q 200 230 200 200 Z',
    cx: 245, cy: 170,
  },
  // Sağ Arka Çamurluk
  {
    code: 'right_rear_fender',
    label: 'Sağ Arka Çamurluk',
    d: 'M 800 130 Q 800 100 770 90 L 710 100 L 710 240 L 780 240 Q 800 230 800 200 Z',
    cx: 755, cy: 170,
  },
  // Tavan (en üst orta, büyük dikdörtgen)
  {
    code: 'roof',
    label: 'Tavan',
    d: 'M 290 100 L 710 100 L 710 360 L 290 360 Z',
    cx: 500, cy: 230,
  },
  // Bagaj (tavan altı arka, dikdörtgen)
  {
    code: 'trunk',
    label: 'Bagaj',
    d: 'M 290 100 L 290 360 L 710 360 L 710 100 Q 700 80 670 80 L 330 80 Q 300 80 290 100 Z',
    cx: 500, cy: 220,
  },
  // Arka Tampon
  {
    code: 'rear_bumper',
    label: 'Arka Tampon',
    d: 'M 250 10 Q 250 0 280 0 L 720 0 Q 750 0 750 10 L 750 80 Q 750 100 720 100 L 280 100 Q 250 100 250 80 Z',
    cx: 500, cy: 50,
  },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: 'stripes' | 'solid' | 'cross' }> = {
  none: { label: 'Belirtilmemiş', color: 'transparent' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.55)' },
  painted: { label: 'Boyalı', color: 'rgba(250, 204, 21, 0.6)' },
  local_painted: { label: 'Lokal Boyalı', color: 'rgba(253, 230, 138, 0.7)', pattern: 'stripes' },
  changed: { label: 'Değişen', color: 'rgba(239, 68, 68, 0.6)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.6)' },
};

export default function CarDiagramSVG({ value, onChange, width = 600, readOnly = false }: Props) {
  function setStatus(code: string, status: PaintStatus) {
    if (readOnly) return;
    onChange({ ...value, [code]: status });
  }

  return (
    <svg
      viewBox="0 0 1000 600"
      width={width}
      height={width * 0.6}
      className="select-none"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        {/* Lokal boyalı için çizgi pattern */}
        <pattern id="stripes-pattern" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="rgba(253, 230, 138, 0.5)" />
          <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(202, 138, 4, 0.7)" strokeWidth="6" />
        </pattern>
      </defs>

      {/* Arka plan: açık gri araba silueti */}
      <rect x="0" y="0" width="1000" height="600" fill="#f8fafc" />

      {/* Tüm parçalar - gri baz renkte */}
      {PARTS.map((part) => {
        const status = value[part.code] ?? 'none';
        const meta = STATUS_META[status];
        // fill: eğer status varsa, status rengi; yoksa baz gri
        const baseFill = '#e2e8f0'; // açık gri
        const strokeColor = '#475569';
        const fillColor = status === 'none' ? baseFill :
                          status === 'local_painted' ? 'url(#stripes-pattern)' :
                          meta.color;
        return (
          <g key={part.code}>
            <path
              d={part.d}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinejoin="round"
              className={cn(
                'transition-all duration-200',
                !readOnly && 'cursor-pointer hover:brightness-95'
              )}
              onClick={() => {
                if (readOnly) return;
                // none <-> original toggle; eğer başka statüdeyse, original'a dön
                if (status === 'none') setStatus(part.code, 'original');
                else if (status === 'original') setStatus(part.code, 'painted');
                else if (status === 'painted') setStatus(part.code, 'local_painted');
                else if (status === 'local_painted') setStatus(part.code, 'changed');
                else if (status === 'changed') setStatus(part.code, 'repaired');
                else setStatus(part.code, 'none');
              }}
            >
              <title>{part.label}</title>
            </path>
          </g>
        );
      })}

      {/* Tekerlekler (dekoratif, tıklanamaz) */}
      <circle cx="245" cy="510" r="40" fill="#334155" />
      <circle cx="245" cy="510" r="22" fill="#cbd5e1" />
      <circle cx="755" cy="510" r="40" fill="#334155" />
      <circle cx="755" cy="510" r="22" fill="#cbd5e1" />
      <circle cx="245" cy="100" r="40" fill="#334155" />
      <circle cx="245" cy="100" r="22" fill="#cbd5e1" />
      <circle cx="755" cy="100" r="40" fill="#334155" />
      <circle cx="755" cy="100" r="22" fill="#cbd5e1" />

      {/* Ön cam (kaput ile tavan arası) */}
      <path d="M 320 360 L 350 280 L 650 280 L 680 360 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
      {/* Arka cam (tavan ile bagaj arası) */}
      <path d="M 330 100 L 360 180 L 640 180 L 670 100 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" />
    </svg>
  );
}

// Status meta'yı dışa aktar (modal liste için)
export { STATUS_META, PARTS as DIAGRAM_PARTS };
