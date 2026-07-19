import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// 5 PARÇA - sedan araba, üstten görünüm
// Senin isteğin: "5 parçaya ayır" - ön/arka/sağ/sol/tavan olarak 5 ana bölge
// 1. ÖN: ön tampon + ön çamurluklar + kaput
// 2. ARKA: bagaj + arka çamurluklar + arka tampon
// 3. SOL: sol ön + sol arka kapı
// 4. SAĞ: sağ ön + sağ arka kapı
// 5. TAVAN: tavan + ön cam + arka cam
//
// Şekil: gerçek sedan araba, tek parça gövde, kavisli hatlar
// Layout (800x1000 viewBox):
//   - Ön kısım: y 20-300 (ön tampon+ön çamurluk+kaput birleşik)
//   - Sol/Sağ kapılar: y 300-720 (orta)
//   - Arka kısım: y 720-980 (bagaj+arka çamurluk+arka tampon birleşik)
//   - Tavan: ortada ayrı parça (y 300-720), kapıların üstünde görsel
// Tekerlekler: 4 adet, dışarıda

const PARTS: { code: string; label: string; d: string }[] = [
  // === 1. ÖN KISIM (ön tampon + ön çamurluklar + kaput birleşik) ===
  // Gerçek araba ön kısmı: ön tampon (alt, dalgalı), ön çamurluklar (yan, yarım ay), kaput (orta, yatay)
  {
    code: 'front',
    label: 'Ön Kısım',
    d: 'M 220 20 L 580 20 Q 600 20 600 40 L 600 100 Q 600 115 585 115 Q 590 130 615 145 Q 670 175 685 220 Q 695 250 680 280 Q 655 305 615 305 Q 595 308 580 305 L 580 280 L 220 280 L 220 305 Q 205 308 185 305 Q 145 305 120 280 Q 105 250 115 220 Q 130 175 185 145 Q 210 130 215 115 Q 200 115 200 100 L 200 40 Q 200 20 220 20 Z',
  },

  // === 2. ARKA KISIM (bagaj + arka çamurluklar + arka tampon birleşik) ===
  {
    code: 'rear',
    label: 'Arka Kısım',
    d: 'M 220 980 L 580 980 Q 600 980 600 960 L 600 900 Q 600 885 585 885 Q 590 870 615 855 Q 670 825 685 780 Q 695 750 680 720 Q 655 695 615 695 Q 595 692 580 695 L 580 720 L 220 720 L 220 695 Q 205 692 185 695 Q 145 695 120 720 Q 105 750 115 780 Q 130 825 185 855 Q 210 870 215 885 Q 200 885 200 900 L 200 960 Q 200 980 220 980 Z',
  },

  // === 3. SOL TARAF (sol ön + sol arka kapı) ===
  // Dikey dikdörtgen, yuvarlak köşeler, ortada pencere
  {
    code: 'left_side',
    label: 'Sol Taraf',
    d: 'M 200 290 L 200 710 Q 200 720 195 720 L 165 720 Q 145 720 140 705 L 140 295 Q 145 280 165 280 L 195 280 Q 200 280 200 290 Z',
  },

  // === 4. SAĞ TARAF (sağ ön + sağ arka kapı) ===
  {
    code: 'right_side',
    label: 'Sağ Taraf',
    d: 'M 600 290 L 600 710 Q 600 720 605 720 L 635 720 Q 655 720 660 705 L 660 295 Q 655 280 635 280 L 605 280 Q 600 280 600 290 Z',
  },

  // === 5. TAVAN (tavan + ön cam + arka cam) ===
  // Orta büyük dikdörtgen, hafif kavisli kenarlar, panoramik cam
  {
    code: 'roof',
    label: 'Tavan',
    d: 'M 220 290 L 580 290 L 580 710 L 220 710 Z',
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
      <ellipse cx="55" cy="800" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="800" rx="20" ry="32" fill="#475569" />
      <ellipse cx="745" cy="800" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="800" rx="20" ry="32" fill="#475569" />

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
      {/* Ön cam (tavan-ön kısım arası, trapez) */}
      <path d="M 240 285 L 270 270 L 530 270 L 560 285 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* Arka cam (tavan-arka kısım arası) */}
      <path d="M 240 715 L 270 730 L 530 730 L 560 715 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="2" pointerEvents="none" />
      {/* Sol yan pencere (sol taraf parçası üstü) */}
      <path d="M 155 310 L 200 310 L 200 410 L 155 410 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
      <path d="M 155 525 L 200 525 L 200 625 L 155 625 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
      {/* Sağ yan pencere */}
      <path d="M 645 310 L 600 310 L 600 410 L 645 410 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
      <path d="M 645 525 L 600 525 L 600 625 L 645 625 Z" fill="#cbd5e1" stroke="#475569" strokeWidth="1.5" pointerEvents="none" />
    </svg>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
