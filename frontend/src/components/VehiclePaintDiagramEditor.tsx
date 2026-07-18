import { useState, useRef, useEffect } from 'react';
import { X, Check, List } from 'lucide-react';
import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

const PARTS: { code: string; label: string; x: number; y: number; w: number; h: number }[] = [
  // Ön tampon (en üst)
  { code: 'front_bumper', label: 'Ön Tampon', x: 20, y: 5, w: 60, h: 12 },
  // Kaput (ön orta)
  { code: 'hood', label: 'Kaput', x: 30, y: 17, w: 40, h: 18 },
  // Sol taraf (üstten bakınca sol = görüntüde sağ)
  // Önce sol taraf (görüntüdeki sol taraf)
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk', x: 5, y: 17, w: 12, h: 15 },
  { code: 'left_front_door', label: 'Sol Ön Kapı', x: 5, y: 32, w: 12, h: 16 },
  { code: 'left_rear_door', label: 'Sol Arka Kapı', x: 5, y: 48, w: 12, h: 16 },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk', x: 5, y: 64, w: 12, h: 14 },
  // Sağ taraf (görüntüdeki sağ taraf)
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk', x: 83, y: 17, w: 12, h: 15 },
  { code: 'right_front_door', label: 'Sağ Ön Kapı', x: 83, y: 32, w: 12, h: 16 },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı', x: 83, y: 48, w: 12, h: 16 },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk', x: 83, y: 64, w: 12, h: 14 },
  // Tavan (orta)
  { code: 'roof', label: 'Tavan', x: 30, y: 35, w: 40, h: 30 },
  // Bagaj
  { code: 'trunk', label: 'Bagaj Kapağı', x: 30, y: 65, w: 40, h: 18 },
  // Arka tampon (en alt)
  { code: 'rear_bumper', label: 'Arka Tampon', x: 20, y: 83, w: 60, h: 12 },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: string }> = {
  none: { label: 'Belirtilmemiş', color: 'rgba(0,0,0,0)' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.55)' },
  painted: { label: 'Boyanmış', color: 'rgba(250, 204, 21, 0.65)' },
  local_painted: { label: 'Lokal Boyanmış', color: 'rgba(250, 204, 21, 0.65)' },
  changed: { label: 'Değişmiş', color: 'rgba(239, 68, 68, 0.65)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.65)' },
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
        {/* Araba şekli (PNG + hotspot overlay) */}
        <div
          ref={diagramRef}
          className="relative w-full max-w-[480px] aspect-square"
          onClick={() => setActivePart(null)}
        >
          {/* Arka planda araba görseli */}
          <img
            src="/car-diagram.png"
            alt="Araç diyagramı"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            draggable={false}
          />

          {/* Tıklanabilir hotspot overlay (yüzde koordinatlar) */}
          {PARTS.map((part) => {
            const status = value[part.code] ?? 'none';
            const meta = STATUS_META[status];
            return (
              <button
                key={part.code}
                type="button"
                title={part.label}
                onClick={(e) => handlePartClick(part.code, e)}
                className="absolute hover:bg-white/20 transition cursor-pointer"
                style={{
                  left: `${part.x}%`,
                  top: `${part.y}%`,
                  width: `${part.w}%`,
                  height: `${part.h}%`,
                  background: status !== 'none' ? meta.color : 'transparent',
                  border: status !== 'none' ? `2px solid ${meta.color.replace('0.55', '1').replace('0.65', '1')}` : 'none',
                }}
              />
            );
          })}

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
            {Object.entries(STATUS_META).filter(([k]) => k !== 'none').map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span
                  className="h-4 w-4 rounded inline-block border border-slate-300 shrink-0"
                  style={{ background: meta.color.replace(/[^,]+(?=\))/, '0.8') }}
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
        {Object.entries(STATUS_META).filter(([k]) => k !== 'none').map(([key, meta]) => {
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
                className="h-3 w-3 rounded shrink-0 border border-slate-300"
                style={{ background: meta.color.replace(/[^,]+(?=\))/, '0.8') }}
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
                        <option value="none">Belirtilmemiş</option>
                        {Object.entries(STATUS_META).filter(([k]) => k !== 'none').map(([key, m]) => (
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
