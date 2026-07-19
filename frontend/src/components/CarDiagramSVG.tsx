import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// 13 parça - senin örnek PNG'ye uygun dik araba
// Layout: dikey, ön üstte, arka altta
// x: 0-200 sol çamurluk/kapı bölgesi
// x: 200-600 orta gövde (tampon/kaput/tavan/bagaj/tampon)
// x: 600-800 sağ çamurluk/kapı bölgesi
// Tekerlekler x: 0-100 (sol) ve 700-800 (sağ)
//
// y:
//   20-110: ön tampon
//   110-280: ön çamurluklar + kaput
//   280-310: ön cam
//   310-490: ön kapılar
//   490-510: orta
//   510-700: arka kapılar
//   700-730: arka cam
//   730-890: bagaj + arka çamurluk
//   890-980: arka tampon
//
// NOT: Bu parçalar y ekseninde ÜST ÜSTE değil, her parça kendi bölgesinde

const PARTS: { code: string; label: string; d: string }[] = [
  // === ÖN TAMPON (en üst, yatay ince, dalgalı alt dudak) ===
  {
    code: 'front_bumper',
    label: 'Ön Tampon',
    // Üst kenar düz, alt kenar dalgalı (M şeklinde 3 çıkıntı)
    d: 'M 220 20 L 580 20 Q 595 20 595 35 L 595 95 Q 595 110 580 110 L 545 110 Q 535 110 530 118 Q 525 130 510 130 Q 495 130 490 118 Q 485 110 475 110 L 405 110 Q 395 110 390 118 Q 385 130 370 130 Q 355 130 350 118 Q 345 110 335 110 L 220 110 Q 205 110 205 95 L 205 35 Q 205 20 220 20 Z',
  },

  // === SOL ÖN ÇAMURLUK (yarım ay, tekerlek yuvası) ===
  // Dış kenar yarım ay şeklinde dışa çıkık
  {
    code: 'left_front_fender',
    label: 'Sol Ön Çamurluk',
    d: 'M 205 110 Q 195 110 185 115 Q 130 130 110 165 Q 95 195 100 225 Q 105 250 130 270 Q 160 285 200 285 L 205 285 L 205 110 Z',
  },

  // === SAĞ ÖN ÇAMURLUK (aynalı) ===
  {
    code: 'right_front_fender',
    label: 'Sağ Ön Çamurluk',
    d: 'M 595 110 Q 605 110 615 115 Q 670 130 690 165 Q 705 195 700 225 Q 695 250 670 270 Q 640 285 600 285 L 595 285 L 595 110 Z',
  },

  // === KAPUT (orta üst, dikdörtgen, üst-alt bombeli) ===
  {
    code: 'hood',
    label: 'Kaput',
    d: 'M 250 110 Q 250 110 270 110 L 530 110 Q 550 110 550 110 L 550 280 L 250 280 Z',
  },

  // === SOL ÖN KAPI (orta-sol üst, dikdörtgen, üstte cam çıkıntısı) ===
  {
    code: 'left_front_door',
    label: 'Sol Ön Kapı',
    d: 'M 205 295 L 250 295 L 250 500 L 200 500 Q 175 495 165 480 L 165 320 Q 170 305 185 300 Z',
  },

  // === SAĞ ÖN KAPI ===
  {
    code: 'right_front_door',
    label: 'Sağ Ön Kapı',
    d: 'M 595 295 L 550 295 L 550 500 L 600 500 Q 625 495 635 480 L 635 320 Q 630 305 615 300 Z',
  },

  // === TAVAN (en orta, büyük dikdörtgen, hafif yuvarlak köşeler) ===
  {
    code: 'roof',
    label: 'Tavan',
    d: 'M 250 295 L 550 295 L 550 700 L 250 700 Z',
  },

  // === SOL ARKA KAPI ===
  {
    code: 'left_rear_door',
    label: 'Sol Arka Kapı',
    d: 'M 165 510 L 250 510 L 250 700 L 195 700 Q 170 695 160 680 L 160 530 Q 160 515 165 510 Z',
  },

  // === SAĞ ARKA KAPI ===
  {
    code: 'right_rear_door',
    label: 'Sağ Arka Kapı',
    d: 'M 635 510 L 550 510 L 550 700 L 605 700 Q 630 695 640 680 L 640 530 Q 640 515 635 510 Z',
  },

  // === SOL ARKA ÇAMURLUK (yarım ay) ===
  {
    code: 'left_rear_fender',
    label: 'Sol Arka Çamurluk',
    d: 'M 205 730 L 205 890 L 200 890 Q 160 885 130 870 Q 105 850 100 825 Q 95 800 110 770 Q 130 745 185 735 Q 195 730 205 730 Z',
  },

  // === SAĞ ARKA ÇAMURLUK ===
  {
    code: 'right_rear_fender',
    label: 'Sağ Arka Çamurluk',
    d: 'M 595 730 L 595 890 L 600 890 Q 640 885 670 870 Q 695 850 700 825 Q 705 800 690 770 Q 670 745 615 735 Q 605 730 595 730 Z',
  },

  // === BAGAJ (orta alt, dikdörtgen, hafif yuvarlak) ===
  {
    code: 'trunk',
    label: 'Bagaj',
    d: 'M 250 730 L 550 730 L 550 890 L 250 890 Z',
  },

  // === ARKA TAMPON (en alt, dalgalı üst dudak) ===
  {
    code: 'rear_bumper',
    label: 'Arka Tampon',
    d: 'M 220 890 L 580 890 Q 595 890 595 905 L 595 965 Q 595 980 580 980 L 545 980 Q 535 980 530 972 Q 525 960 510 960 Q 495 960 490 972 Q 485 980 475 980 L 405 980 Q 395 980 390 972 Q 385 960 370 960 Q 355 960 350 972 Q 345 980 335 980 L 220 980 Q 205 980 205 965 L 205 905 Q 205 890 220 890 Z',
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

      {/* TEKERLEKLER (4 adet) */}
      <ellipse cx="55" cy="200" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="200" rx="20" ry="32" fill="#475569" />
      <ellipse cx="745" cy="200" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="200" rx="20" ry="32" fill="#475569" />
      <ellipse cx="55" cy="810" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="810" rx="20" ry="32" fill="#475569" />
      <ellipse cx="745" cy="810" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="810" rx="20" ry="32" fill="#475569" />

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
      {/* Ön cam (kaput-tavan arası, trapez) */}
      <path d="M 260 280 L 290 295 L 510 295 L 540 280 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* Arka cam (tavan-bagaj arası) */}
      <path d="M 260 700 L 290 715 L 510 715 L 540 700 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* Sol ön pencere (kapı üstü) */}
      <path d="M 175 310 L 245 310 L 245 410 L 175 410 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
      {/* Sol arka pencere */}
      <path d="M 170 525 L 245 525 L 245 625 L 170 625 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
      {/* Sağ ön pencere */}
      <path d="M 625 310 L 555 310 L 555 410 L 625 410 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
      {/* Sağ arka pencere */}
      <path d="M 630 525 L 555 525 L 555 625 L 630 625 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
    </svg>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
