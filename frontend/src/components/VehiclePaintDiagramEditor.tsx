import { useState, useRef, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed';

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

const STATUS_META: Record<PaintStatus, { label: string; color: string; textColor: string }> = {
  none: { label: 'Belirtilmemiş', color: '#e5e7eb', textColor: '#6b7280' },
  original: { label: 'Orijinal', color: '#10b981', textColor: '#065f46' },
  painted: { label: 'Boyanmış', color: '#f59e0b', textColor: '#92400e' },
  local_painted: { label: 'Lokal Boyanmış', color: '#f59e0b', textColor: '#92400e' },
  changed: { label: 'Değişmiş', color: '#ef4444', textColor: '#991b1b' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
};

export default function VehiclePaintDiagramEditor({ value, onChange }: Props) {
  const [activePart, setActivePart] = useState<string | null>(null);
  const [popupPos, setPopupPos] = useState<{ x: number; y: number } | null>(null);
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

  // Tümü orijinal
  function setAllOriginal() {
    const next: Record<string, PaintStatus> = {};
    PARTS.forEach((p) => { next[p.code] = 'original'; });
    onChange(next);
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
      {/* Araba şekli (üstten görünüm) */}
      <div ref={diagramRef} className="relative" onClick={() => setActivePart(null)}>
        <svg viewBox="0 0 280 380" className="w-full h-auto select-none" style={{ maxWidth: 280 }}>
          {/* Arka plan — araba silüeti */}
          <defs>
            <linearGradient id="bodyGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f1f5f9" />
              <stop offset="1" stopColor="#e2e8f0" />
            </linearGradient>
          </defs>

          {/* Ana gövde */}
          <rect x="40" y="100" width="200" height="180" rx="30" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />
          {/* Ön kısım (kaput bölgesi) */}
          <rect x="80" y="40" width="120" height="80" rx="20" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />
          {/* Arka kısım (bagaj bölgesi) */}
          <rect x="80" y="260" width="120" height="80" rx="20" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />
          {/* Ön tampon */}
          <rect x="40" y="20" width="200" height="20" rx="10" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />
          {/* Arka tampon */}
          <rect x="40" y="340" width="200" height="20" rx="10" fill="url(#bodyGrad)" stroke="#cbd5e1" strokeWidth="2" />

          {/* Camlar (ön/orta/arka) */}
          <rect x="100" y="60" width="80" height="40" rx="8" fill="#bae6fd" opacity="0.5" />
          <rect x="60" y="120" width="160" height="60" rx="10" fill="#bae6fd" opacity="0.5" />
          <rect x="100" y="280" width="80" height="40" rx="8" fill="#bae6fd" opacity="0.5" />

          {/* Tekerlekler */}
          <circle cx="65" cy="100" r="14" fill="#475569" />
          <circle cx="215" cy="100" r="14" fill="#475569" />
          <circle cx="65" cy="280" r="14" fill="#475569" />
          <circle cx="215" cy="280" r="14" fill="#475569" />

          {/* Tıklanabilir parçalar — tüm parçaları kapsayan şeffaf rect'ler */}
          {/* Ön Tampon (front_bumper) */}
          <PartClickable
            code="front_bumper" label="Ön Tampon"
            x={40} y={20} w={200} h={20}
            status={value['front_bumper']}
            onClick={handlePartClick}
          />
          {/* Kaput (hood) */}
          <PartClickable
            code="hood" label="Kaput"
            x={80} y={40} w={120} h={80}
            status={value['hood']}
            onClick={handlePartClick}
          />
          {/* Tavan (roof) */}
          <PartClickable
            code="roof" label="Tavan"
            x={40} y={120} w={200} h={80}
            status={value['roof']}
            onClick={handlePartClick}
          />
          {/* Bagaj (trunk) */}
          <PartClickable
            code="trunk" label="Bagaj Kapağı"
            x={80} y={260} w={120} h={80}
            status={value['trunk']}
            onClick={handlePartClick}
          />
          {/* Arka Tampon (rear_bumper) */}
          <PartClickable
            code="rear_bumper" label="Arka Tampon"
            x={40} y={340} w={200} h={20}
            status={value['rear_bumper']}
            onClick={handlePartClick}
          />
          {/* Sol Ön Çamurluk */}
          <PartClickable
            code="left_front_fender" label="Sol Ön Çamurluk"
            x={40} y={100} w={40} h={20}
            status={value['left_front_fender']}
            onClick={handlePartClick}
          />
          {/* Sol Ön Kapı */}
          <PartClickable
            code="left_front_door" label="Sol Ön Kapı"
            x={40} y={140} w={20} h={40}
            status={value['left_front_door']}
            onClick={handlePartClick}
          />
          {/* Sol Arka Kapı */}
          <PartClickable
            code="left_rear_door" label="Sol Arka Kapı"
            x={40} y={200} w={20} h={40}
            status={value['left_rear_door']}
            onClick={handlePartClick}
          />
          {/* Sol Arka Çamurluk */}
          <PartClickable
            code="left_rear_fender" label="Sol Arka Çamurluk"
            x={40} y={260} w={40} h={20}
            status={value['left_rear_fender']}
            onClick={handlePartClick}
          />
          {/* Sağ Ön Çamurluk */}
          <PartClickable
            code="right_front_fender" label="Sağ Ön Çamurluk"
            x={200} y={100} w={40} h={20}
            status={value['right_front_fender']}
            onClick={handlePartClick}
          />
          {/* Sağ Ön Kapı */}
          <PartClickable
            code="right_front_door" label="Sağ Ön Kapı"
            x={220} y={140} w={20} h={40}
            status={value['right_front_door']}
            onClick={handlePartClick}
          />
          {/* Sağ Arka Kapı */}
          <PartClickable
            code="right_rear_door" label="Sağ Arka Kapı"
            x={220} y={200} w={20} h={40}
            status={value['right_rear_door']}
            onClick={handlePartClick}
          />
          {/* Sağ Arka Çamurluk */}
          <PartClickable
            code="right_rear_fender" label="Sağ Arka Çamurluk"
            x={200} y={260} w={40} h={20}
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

      {/* Sağ taraf — Lejant + Özet */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer mb-4">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={PARTS.every((p) => value[p.code] === 'original')}
            onChange={(e) => e.target.checked ? setAllOriginal() : onChange({})}
          />
          <span className="text-sm font-semibold">Tamamı Orijinal</span>
        </label>

        <h3 className="text-sm font-bold text-slate-700 mb-2">Renk Lejantı</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className="h-4 w-4 rounded-full inline-block" style={{ background: meta.color }} />
              <span>{meta.label}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-600 mb-4">
          Parça durumunu belirtmek için araç görseli üzerinde ilgili parçaya tıklamalısın.
        </p>

        <h3 className="text-sm font-bold text-slate-700 mb-2">Parça Listesi</h3>
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {PARTS.map((p) => {
            const status = value[p.code] ?? 'none';
            const meta = STATUS_META[status];
            return (
              <button
                key={p.code}
                type="button"
                onClick={() => setStatus(p.code, status === 'none' ? 'original' : 'none')}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-slate-50 text-left"
              >
                <span
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ background: meta.color }}
                />
                <span className="text-sm flex-1">{p.label}</span>
                <span className="text-xs text-slate-500" style={{ color: meta.textColor }}>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PartClickable({
  code, label, x, y, w, h, status, onClick,
}: {
  code: string; label: string;
  x: number; y: number; w: number; h: number;
  status?: PaintStatus;
  onClick: (code: string, e: React.MouseEvent) => void;
}) {
  const meta = STATUS_META[status ?? 'none'];
  return (
    <g style={{ cursor: 'pointer' }} onClick={(e) => onClick(code, e)}>
      <title>{label}</title>
      <rect
        x={x} y={y} width={w} height={h}
        fill={status && status !== 'none' ? meta.color : 'transparent'}
        fillOpacity={status && status !== 'none' ? 0.6 : 0}
        stroke={status && status !== 'none' ? meta.color : '#cbd5e1'}
        strokeWidth={status && status !== 'none' ? 2 : 1}
        strokeDasharray={status && status !== 'none' ? '0' : '4 2'}
        className="transition-all hover:fill-slate-100"
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
      className="absolute z-20 bg-white rounded-lg shadow-2xl border border-slate-200 w-56"
      style={{
        left: Math.min(Math.max(pos.x - 112, 0), 280 - 224),
        top: Math.max(pos.y - 220, 0),
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
              <span className="h-3 w-3 rounded-full shrink-0" style={{ background: meta.color }} />
              <span className="text-sm flex-1">{meta.label}</span>
              {selected && <Check className="h-4 w-4 text-red-600" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
