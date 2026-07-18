import { useState, useRef, useEffect } from 'react';
import { X, Check, List } from 'lucide-react';
import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

const PARTS: { code: string; label: string }[] = [
  { code: 'front_bumper', label: 'Ön Tampon' },
  { code: 'hood', label: 'Kaput' },
  { code: 'roof', label: 'Tavan' },
  { code: 'trunk', label: 'Bagaj Kapağı' },
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk' },
  { code: 'left_front_door', label: 'Sol Ön Kapı' },
  { code: 'left_rear_door', label: 'Sol Arka Kapı' },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk' },
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk' },
  { code: 'right_front_door', label: 'Sağ Ön Kapı' },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı' },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk' },
  { code: 'rear_bumper', label: 'Arka Tampon' },
];

// Renkler (farklı görsel): Belirtilmemiş=gri, Orijinal=yeşil, Boyanmış=sarı, Lokal Boyanmış=sarı(çizgili), Değişmiş=kırmızı, Tamir=mavi
const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: string }> = {
  none: { label: 'Belirtilmemiş', color: '#e5e7eb' },
  original: { label: 'Orijinal', color: '#10b981' },
  painted: { label: 'Boyanmış', color: '#facc15' },
  local_painted: { label: 'Lokal Boyanmış', color: '#facc15', pattern: 'diagonal-stripes' },
  changed: { label: 'Değişmiş', color: '#ef4444' },
  repaired: { label: 'Tamir', color: '#3b82f6' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
};

export default function VehiclePaintDiagramEditor({ value, onChange }: Props) {
  const [activePart, setActivePart] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
  const [showList, setShowList] = useState(false);
  const diagramRef = useRef<HTMLDivElement>(null);

  function handlePartClick(code: string, e: React.MouseEvent) {
    e.stopPropagation();
    setActivePart(code);
    if (diagramRef.current) {
      const rect = diagramRef.current.getBoundingClientRect();
      setPopupPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
  }

  function setStatus(code: string, status: PaintStatus) {
    onChange({ ...value, [code]: status });
    setActivePart(null);
  }

  function setAllOriginal() {
    const next: Record<string, PaintStatus> = {};
    PARTS.forEach((p) => { next[p.code] = 'original'; });
    onChange(next);
  }

  return (
    <div>
      {/* SVG defs — pattern'ler */}
      <svg width="0" height="0" className="absolute" style={{ position: 'absolute' }}>
        <defs>
          <pattern id="diagonal-stripes" patternUnits="userSpaceOnUse" width="6" height="6">
            <rect width="6" height="6" fill="#facc15" />
            <path d="M-1,1 l2,-2 M0,6 l6,-6 M5,7 l2,-2" stroke="#a16207" strokeWidth="1.5" />
          </pattern>
        </defs>
      </svg>

      <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6">
        {/* Araba şekli (üstten görünüm) */}
        <div ref={diagramRef} className="relative" onClick={() => setActivePart(null)}>
          <svg viewBox="0 0 260 400" className="w-full h-auto select-none" style={{ maxWidth: 260 }}>
            {/* Gövde ana hat */}
            <path
              d="M 60,80 L 200,80 L 220,120 L 220,200 L 220,280 L 200,320 L 60,320 L 40,280 L 40,200 L 40,120 Z"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="2"
            />

            {/* Ön Tampon (en alt kısım) */}
            <PartClickable
              code="front_bumper" label="Ön Tampon"
              d="M 40,120 L 220,120 L 220,140 L 40,140 Z"
              status={value['front_bumper']}
              onClick={handlePartClick}
            />
            {/* Kaput */}
            <PartClickable
              code="hood" label="Kaput"
              d="M 60,80 L 200,80 L 220,120 L 40,120 Z"
              status={value['hood']}
              onClick={handlePartClick}
            />
            {/* Tavan */}
            <PartClickable
              code="roof" label="Tavan"
              d="M 40,140 L 220,140 L 220,260 L 40,260 Z"
              status={value['roof']}
              onClick={handlePartClick}
            />
            {/* Bagaj Kapağı */}
            <PartClickable
              code="trunk" label="Bagaj Kapağı"
              d="M 40,260 L 220,260 L 200,320 L 60,320 Z"
              status={value['trunk']}
              onClick={handlePartClick}
            />
            {/* Arka Tampon (en üst kısım) */}
            <PartClickable
              code="rear_bumper" label="Arka Tampon"
              d="M 40,260 L 220,260 L 220,280 L 40,280 Z"
              status={value['rear_bumper']}
              onClick={handlePartClick}
            />

            {/* Sol taraf (col 0) — Çamurluk ve Kapılar */}
            <PartClickable
              code="left_front_fender" label="Sol Ön Çamurluk"
              d="M 40,140 L 60,140 L 60,180 L 40,180 Z"
              status={value['left_front_fender']}
              onClick={handlePartClick}
            />
            <PartClickable
              code="left_front_door" label="Sol Ön Kapı"
              d="M 40,180 L 60,180 L 60,220 L 40,220 Z"
              status={value['left_front_door']}
              onClick={handlePartClick}
            />
            <PartClickable
              code="left_rear_door" label="Sol Arka Kapı"
              d="M 40,220 L 60,220 L 60,260 L 40,260 Z"
              status={value['left_rear_door']}
              onClick={handlePartClick}
            />
            <PartClickable
              code="left_rear_fender" label="Sol Arka Çamurluk"
              d="M 40,260 L 60,260 L 60,300 L 40,300 Z"
              status={value['left_rear_fender']}
              onClick={handlePartClick}
            />

            {/* Sağ taraf (col 3) */}
            <PartClickable
              code="right_front_fender" label="Sağ Ön Çamurluk"
              d="M 200,140 L 220,140 L 220,180 L 200,180 Z"
              status={value['right_front_fender']}
              onClick={handlePartClick}
            />
            <PartClickable
              code="right_front_door" label="Sağ Ön Kapı"
              d="M 200,180 L 220,180 L 220,220 L 200,220 Z"
              status={value['right_front_door']}
              onClick={handlePartClick}
            />
            <PartClickable
              code="right_rear_door" label="Sağ Arka Kapı"
              d="M 200,220 L 220,220 L 220,260 L 200,260 Z"
              status={value['right_rear_door']}
              onClick={handlePartClick}
            />
            <PartClickable
              code="right_rear_fender" label="Sağ Arka Çamurluk"
              d="M 200,260 L 220,260 L 220,300 L 200,300 Z"
              status={value['right_rear_fender']}
              onClick={handlePartClick}
            />
          </svg>

          {/* Popup — parça seçici */}
          {activePart && popupPos && (
            <PartStatusPopup
              code={activePart}
              current={value[activePart] ?? 'none'}
              onSelect={(s) => setStatus(activePart, s)}
              onClose={() => setActivePart(null)}
              pos={popupPos}
            />
          )}
        </div>

        {/* Sağ taraf — Kontroller */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 accent-emerald-600"
                checked={PARTS.every((p) => value[p.code] === 'original')}
                onChange={(e) => e.target.checked ? setAllOriginal() : onChange({})}
              />
              <span className="text-sm font-semibold">Tamamı Orijinal</span>
            </label>

            <button
              type="button"
              onClick={() => setShowList(true)}
              className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold"
            >
              <List className="h-4 w-4" /> Parça Listesi
            </button>
          </div>

          <h3 className="text-sm font-bold text-slate-700 mb-2">Renk Lejantı</h3>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2 text-xs">
                <span
                  className="h-4 w-4 rounded-full inline-block border border-slate-300"
                  style={{
                    background: meta.pattern ? `url(#${meta.pattern})` : meta.color,
                  }}
                />
                <span>{meta.label}</span>
              </div>
            ))}
          </div>

          <p className="text-sm text-slate-600">
            Parça durumunu belirtmek için araç görseli üzerinde ilgili parçaya tıklamalısın.
          </p>
        </div>
      </div>

      {/* Parça Listesi Modal */}
      {showList && (
        <PartsListModal
          value={value}
          onChange={onChange}
          onClose={() => setShowList(false)}
        />
      )}
    </div>
  );
}

function PartClickable({
  code, label, d, status, onClick,
}: {
  code: string; label: string;
  d: string;
  status?: PaintStatus;
  onClick: (code: string, e: React.MouseEvent) => void;
}) {
  const meta = STATUS_META[status ?? 'none'];
  const fill = status && status !== 'none'
    ? (meta.pattern ? `url(#${meta.pattern})` : meta.color)
    : '#f1f5f9';
  const opacity = status && status !== 'none' ? 0.7 : 0.3;
  return (
    <g style={{ cursor: 'pointer' }} onClick={(e) => onClick(code, e)}>
      <title>{label}</title>
      <path
        d={d}
        fill={fill}
        fillOpacity={opacity}
        stroke="#cbd5e1"
        strokeWidth="1.5"
        className="transition-all hover:fill-slate-200"
      />
    </g>
  );
}

function PartStatusPopup({
  code, current, onSelect, onClose, pos,
}: {
  code: string; current: PaintStatus;
  onSelect: (s: PaintStatus) => void;
  onClose: () => void;
  pos: { x: number; y: number };
}) {
  const part = PARTS.find((p) => p.code === code);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose]);

  return (
    <div
      ref={popupRef}
      className="absolute z-20 bg-white rounded-lg shadow-2xl border border-slate-200 w-60"
      style={{
        left: Math.min(Math.max(pos.x - 120, 0), 260 - 240),
        top: Math.max(pos.y - 240, 0),
      }}
    >
      <div className="flex items-center justify-between p-3 border-b bg-slate-50 rounded-t-lg">
        <span className="font-bold text-sm">{part?.label}</span>
        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="py-1">
        {Object.entries(STATUS_META).map(([key, meta]) => {
          const selected = current === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key as PaintStatus)}
              className={cn(
                'w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-slate-50',
                selected && 'bg-red-50'
              )}
            >
              <span
                className="h-3 w-3 rounded-full shrink-0 border border-slate-300"
                style={{
                  background: meta.pattern ? `url(#${meta.pattern})` : meta.color,
                }}
              />
              <span className="text-sm flex-1">{meta.label}</span>
              {selected && <Check className="h-4 w-4 text-red-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PartsListModal({
  value, onChange, onClose,
}: {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  onClose: () => void;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Parça Listesi</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 font-semibold">Parça</th>
                <th className="text-left p-2 font-semibold">Durum</th>
              </tr>
            </thead>
            <tbody>
              {PARTS.map((p) => {
                const status = value[p.code] ?? 'none';
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                return (
                  <tr key={p.code} className="border-b">
                    <td className="p-2 font-medium">{p.label}</td>
                    <td className="p-2">
                      <select
                        value={status}
                        onChange={(e) => onChange({ ...value, [p.code]: e.target.value as PaintStatus })}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {Object.entries(STATUS_META).map(([key, m]) => (
                          <option key={key} value={key}>{m.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="border-t p-3 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700">
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
