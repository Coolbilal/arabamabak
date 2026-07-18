import { useState, useRef, useEffect } from 'react';
import { X, Check, List } from 'lucide-react';
import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

const PARTS: { code: string; label: string }[] = [
  { code: 'front_bumper', label: 'Ön Tampon' },
  { code: 'hood', label: 'Kaput' },
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk' },
  { code: 'left_front_door', label: 'Sol Ön Kapı' },
  { code: 'left_rear_door', label: 'Sol Arka Kapı' },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk' },
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk' },
  { code: 'right_front_door', label: 'Sağ Ön Kapı' },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı' },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk' },
  { code: 'roof', label: 'Tavan' },
  { code: 'trunk', label: 'Bagaj Kapağı' },
  { code: 'rear_bumper', label: 'Arka Tampon' },
];

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

      <div className="grid grid-cols-1 md:grid-cols-[480px_1fr] gap-6">
        {/* Araba şekli — üstten görünüm (sahibinden benzeri) */}
        <div ref={diagramRef} className="relative" onClick={() => setActivePart(null)}>
          <svg viewBox="0 0 480 480" className="w-full h-auto select-none" style={{ maxWidth: 480 }}>
            {/* ============== ANA GÖVDE (ortada) ============== */}
            {/* Kaput (ön — yukarı) */}
            <PartClickable
              code="hood" label="Kaput"
              d="M 145,80 Q 145,60 165,55 L 315,55 Q 335,60 335,80 L 335,150 L 145,150 Z"
              status={value['hood']}
              onClick={handlePartClick}
            />

            {/* Tavan (orta) */}
            <PartClickable
              code="roof" label="Tavan"
              d="M 160,150 L 320,150 L 330,260 L 150,260 Z"
              status={value['roof']}
              onClick={handlePartClick}
            />

            {/* Bagaj (arka — aşağı) */}
            <PartClickable
              code="trunk" label="Bagaj Kapağı"
              d="M 145,260 L 335,260 L 335,330 Q 335,350 315,355 L 165,355 Q 145,350 145,330 Z"
              status={value['trunk']}
              onClick={handlePartClick}
            />

            {/* Ön Tampon (en yukarı) */}
            <PartClickable
              code="front_bumper" label="Ön Tampon"
              d="M 130,40 L 350,40 Q 360,40 360,50 L 360,75 Q 360,85 350,85 L 130,85 Q 120,85 120,75 L 120,50 Q 120,40 130,40 Z"
              status={value['front_bumper']}
              onClick={handlePartClick}
            />

            {/* Arka Tampon (en aşağı) */}
            <PartClickable
              code="rear_bumper" label="Arka Tampon"
              d="M 130,355 L 350,355 Q 360,355 360,365 L 360,395 Q 360,405 350,405 L 130,405 Q 120,405 120,395 L 120,365 Q 120,355 130,355 Z"
              status={value['rear_bumper']}
              onClick={handlePartClick}
            />

            {/* ============== SOL TARAF ============== */}
            {/* Sol Ön Çamurluk (sol üst) */}
            <PartClickable
              code="left_front_fender" label="Sol Ön Çamurluk"
              d="M 50,90 Q 50,60 80,55 L 110,55 Q 130,70 130,90 L 130,150 L 50,150 Z"
              status={value['left_front_fender']}
              onClick={handlePartClick}
            />

            {/* Sol Ön Kapı */}
            <PartClickable
              code="left_front_door" label="Sol Ön Kapı"
              d="M 50,150 L 130,150 L 130,210 L 50,210 Z"
              status={value['left_front_door']}
              onClick={handlePartClick}
            />

            {/* Sol Arka Kapı */}
            <PartClickable
              code="left_rear_door" label="Sol Arka Kapı"
              d="M 50,210 L 130,210 L 130,270 L 50,270 Z"
              status={value['left_rear_door']}
              onClick={handlePartClick}
            />

            {/* Sol Arka Çamurluk */}
            <PartClickable
              code="left_rear_fender" label="Sol Arka Çamurluk"
              d="M 50,270 L 130,270 L 130,330 Q 130,355 110,360 L 80,365 Q 50,360 50,330 Z"
              status={value['left_rear_fender']}
              onClick={handlePartClick}
            />

            {/* ============== SAĞ TARAF ============== */}
            {/* Sağ Ön Çamurluk */}
            <PartClickable
              code="right_front_fender" label="Sağ Ön Çamurluk"
              d="M 350,90 Q 350,60 320,55 L 290,55 Q 270,70 270,90 L 270,150 L 350,150 Z"
              status={value['right_front_fender']}
              onClick={handlePartClick}
            />

            {/* Sağ Ön Kapı */}
            <PartClickable
              code="right_front_door" label="Sağ Ön Kapı"
              d="M 350,150 L 270,150 L 270,210 L 350,210 Z"
              status={value['right_front_door']}
              onClick={handlePartClick}
            />

            {/* Sağ Arka Kapı */}
            <PartClickable
              code="right_rear_door" label="Sağ Arka Kapı"
              d="M 350,210 L 270,210 L 270,270 L 350,270 Z"
              status={value['right_rear_door']}
              onClick={handlePartClick}
            />

            {/* Sağ Arka Çamurluk */}
            <PartClickable
              code="right_rear_fender" label="Sağ Arka Çamurluk"
              d="M 350,270 L 270,270 L 270,330 Q 270,355 290,360 L 320,365 Q 350,360 350,330 Z"
              status={value['right_rear_fender']}
              onClick={handlePartClick}
            />

            {/* ============== ÖN/ARKA CAMLAR (görsel için) ============== */}
            {/* Ön cam (kaputun üstünde, tavanın alt kısmında) */}
            <path d="M 165,85 L 315,85 L 320,150 L 160,150 Z" fill="#bae6fd" opacity="0.4" />
            {/* Arka cam */}
            <path d="M 160,260 L 320,260 L 315,325 L 165,325 Z" fill="#bae6fd" opacity="0.4" />
            {/* Yan camlar (sadece görsel) */}
            <path d="M 130,160 L 270,160 L 270,200 L 130,200 Z" fill="#bae6fd" opacity="0.3" />
            <path d="M 130,220 L 270,220 L 270,260 L 130,260 Z" fill="#bae6fd" opacity="0.3" />

            {/* Etiketler (ok işaretleri için referans) */}
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

        {/* Sağ taraf — Lejant + Bilgi */}
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Renk Lejantı</h3>
          <div className="space-y-2 mb-4">
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span
                  className="h-4 w-4 rounded-full inline-block border border-slate-300 shrink-0"
                  style={{ background: meta.pattern ? `url(#${meta.pattern})` : meta.color }}
                />
                <span>{meta.label}</span>
              </div>
            ))}
          </div>

          <div className="rounded-lg bg-slate-50 border p-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">İpucu:</span> Parça durumunu belirtmek için araç görseli üzerinde ilgili parçaya tıklamalısın.
            </p>
          </div>
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
    : '#cbd5e1';
  const opacity = status && status !== 'none' ? 0.7 : 0.35;
  return (
    <g style={{ cursor: 'pointer' }} onClick={(e) => onClick(code, e)}>
      <title>{label}</title>
      <path
        d={d}
        fill={fill}
        fillOpacity={opacity}
        stroke="#94a3b8"
        strokeWidth="1.5"
        className="transition-all"
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
        left: Math.min(Math.max(pos.x - 120, 0), 480 - 240),
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
