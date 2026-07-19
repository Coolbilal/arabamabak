import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

// diagram.png üzerine overlay - 13 parça, her biri kendi koordinatında
// Senin PNG'nin oranı: 389x500 civarı (dikey araba)
// viewBox 400x500 kullanacağız (PNG ile aynı oran)
// Parçaların koordinatları PNG'ye bakıp manuel ayarlanmış

const PARTS: { code: string; label: string; x: number; y: number; w: number; h: number }[] = [
  // Ön Tampon (en üst)
  { code: 'front_bumper', label: 'Ön Tampon', x: 110, y: 12, w: 180, h: 75 },
  // Sol Ön Çamurluk (üst-sol)
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk', x: 20, y: 75, w: 100, h: 110 },
  // Sağ Ön Çamurluk (üst-sağ)
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk', x: 280, y: 75, w: 100, h: 110 },
  // Kaput (orta üst, dikdörtgen)
  { code: 'hood', label: 'Kaput', x: 120, y: 90, w: 160, h: 105 },
  // Sol Ön Kapı (orta-sol üst)
  { code: 'left_front_door', label: 'Sol Ön Kapı', x: 20, y: 188, w: 100, h: 85 },
  // Sağ Ön Kapı
  { code: 'right_front_door', label: 'Sağ Ön Kapı', x: 280, y: 188, w: 100, h: 85 },
  // Tavan (en orta, büyük)
  { code: 'roof', label: 'Tavan', x: 120, y: 198, w: 160, h: 95 },
  // Sol Arka Kapı (orta-sol alt)
  { code: 'left_rear_door', label: 'Sol Arka Kapı', x: 20, y: 277, w: 100, h: 85 },
  // Sağ Arka Kapı
  { code: 'right_rear_door', label: 'Sağ Arka Kapı', x: 280, y: 277, w: 100, h: 85 },
  // Sol Arka Çamurluk (alt-sol)
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk', x: 20, y: 366, w: 100, h: 100 },
  // Sağ Arka Çamurluk
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk', x: 280, y: 366, w: 100, h: 100 },
  // Bagaj (orta alt)
  { code: 'trunk', label: 'Bagaj', x: 120, y: 296, w: 160, h: 90 },
  // Arka Tampon (en alt)
  { code: 'rear_bumper', label: 'Arka Tampon', x: 110, y: 470, w: 180, h: 35 },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: 'stripes' }> = {
  none: { label: 'Belirtilmemiş', color: 'transparent' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.6)' },
  painted: { label: 'Boyalı', color: 'rgba(250, 204, 21, 0.65)' },
  local_painted: { label: 'Lokal Boyalı', color: 'rgba(253, 230, 138, 0.75)', pattern: 'stripes' },
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
    <div className="relative inline-block" style={{ width, maxWidth: '100%' }}>
      {/* Arka plan PNG */}
      <img
        src="/diagram.png"
        alt="Araç diyagramı"
        className="block w-full h-auto select-none pointer-events-none"
        draggable={false}
      />
      {/* Overlay - her parça için transparan buton */}
      <div className="absolute inset-0">
        {PARTS.map((part) => {
          const status = value[part.code] ?? 'none';
          const meta = STATUS_META[status];
          const showStripes = status === 'local_painted';
          const bg = status === 'none' ? 'transparent' : meta.color;
          return (
            <button
              key={part.code}
              type="button"
              title={part.label}
              onClick={() => cycleStatus(part.code)}
              disabled={readOnly}
              className={cn(
                'absolute border border-transparent transition-all',
                !readOnly && 'hover:border-blue-400 cursor-pointer',
                readOnly && 'cursor-default'
              )}
              style={{
                left: `${(part.x / 400) * 100}%`,
                top: `${(part.y / 500) * 100}%`,
                width: `${(part.w / 400) * 100}%`,
                height: `${(part.h / 500) * 100}%`,
                background: showStripes
                  ? 'repeating-linear-gradient(45deg, rgba(253,230,138,0.7) 0 8px, rgba(202,138,4,0.7) 8px 14px)'
                  : bg,
                padding: 0,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
