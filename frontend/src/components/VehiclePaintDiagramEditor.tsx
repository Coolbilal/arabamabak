import { useState, useRef, useEffect } from 'react';
import { X, List } from 'lucide-react';
// Check icon kaldirildi
import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

const PARTS: { code: string; label: string; x: number; y: number; w: number; h: number }[] = [
  { code: 'front_bumper', label: 'Ön Tampon', x: 0, y: 0, w: 20, h: 33 },
  { code: 'hood', label: 'Kaput', x: 20, y: 0, w: 20, h: 33 },
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk', x: 40, y: 0, w: 20, h: 33 },
  { code: 'left_front_door', label: 'Sol Ön Kapı', x: 60, y: 0, w: 20, h: 33 },
  { code: 'left_rear_door', label: 'Sol Arka Kapı', x: 80, y: 0, w: 20, h: 33 },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk', x: 0, y: 33, w: 20, h: 33 },
  { code: 'roof', label: 'Tavan', x: 20, y: 33, w: 20, h: 33 },
  { code: 'trunk', label: 'Bagaj', x: 40, y: 33, w: 20, h: 33 },
  { code: 'rear_bumper', label: 'Arka Tampon', x: 60, y: 33, w: 20, h: 33 },
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk', x: 80, y: 33, w: 20, h: 33 },
  { code: 'right_front_door', label: 'Sağ Ön Kapı', x: 0, y: 66, w: 20, h: 33 },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı', x: 20, y: 66, w: 20, h: 33 },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk', x: 40, y: 66, w: 20, h: 33 },
];

const STATUS_META: Record<PaintStatus, { label: string; color: string }> = {
  none: { label: 'Belirtilmemiş', color: 'rgba(0,0,0,0)' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.55)' },
  painted: { label: 'Boyanmış', color: 'rgba(250, 204, 21, 0.6)' },
  local_painted: { label: 'Lokal Boyanmış', color: 'rgba(253, 230, 138, 0.7)' },
  changed: { label: 'Değişmiş', color: 'rgba(239, 68, 68, 0.6)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.6)' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
};

export default function VehiclePaintDiagramEditor({ value, onChange }: Props) {
  const [showList, setShowList] = useState(false);

  function setStatus(code: string, status: PaintStatus) {
    onChange({ ...value, [code]: status });
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
          <input type="checkbox" className="h-4 w-4 accent-emerald-600"
            checked={PARTS.every((p) => value[p.code] === 'original')}
            onChange={(e) => e.target.checked ? setAllOriginal() : onChange({})}
          />
          <span className="text-sm font-semibold">Tamamı Orijinal</span>
        </label>
        <button type="button" onClick={() => setShowList(true)}
          className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold">
          <List className="h-4 w-4" /> Liste
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[600px_1fr] gap-6">
        <div className="relative w-full max-w-[600px] aspect-square">
          <img src="/diagram.png" alt="Araç diyagramı"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            draggable={false} />

          {PARTS.map((part) => {
            const status = value[part.code] ?? 'none';
            const meta = STATUS_META[status];
            return (
              <button key={part.code} type="button" title={part.label}
                onClick={() => setStatus(part.code, status === 'none' ? 'original' : 'none')}
                className={cn('absolute transition cursor-pointer', status === 'none' && 'hover:bg-white/10')}
                style={{
                  left: `${part.x}%`, top: `${part.y}%`,
                  width: `${part.w}%`, height: `${part.h}%`,
                  background: status !== 'none' ? meta.color : 'transparent',
                  border: 'none',
                }}
              />
            );
          })}


        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Renklerin Listesi</h3>
          <div className="space-y-2 mb-4">
            {Object.entries(STATUS_META).filter(([k]) => k !== 'none').map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span className="h-4 w-4 rounded inline-block border border-slate-300 shrink-0"
                  style={{ background: meta.color }} />
                <span>{meta.label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 border p-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">İpati:</span> Par�ağşlaqı durumun belirtmek için araė iğreşili üzerinde ilgili parcışamılarżnı.
            </p>
          </div>
        </div>
      </div>

      {showList && <PartsListModal value={value} onChange={onChange} onClose={() => setShowList(false)} />}
  </div>
  );
}

function PartsListModal({ value, onChange, onClose }: {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  onClose: () => void;
} { // eslint-disable-line @typescript-eslint/no-unused-vars) {
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
          <h2 className="font-bold text-lg">Par�ağşlar Listesi</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left p-2 font-semibold">Par�ağşla</th>
                <th className="text-left p-2 font-semibold">Durumu</th>
              </tr>
            </thead>
            <tbody>
              {PARTS.map((p) => {
                const status = value[p.code] ?? 'none';
                return (
                  <tr key={p.code} className="border-b">
                    <td className="p-2 font-medium">{p.label}</td>
                    <td className="p-2">
                      <select value={status}
                        onChange={(e) => onChange({ ...value, [p.code]: e.target.value as PaintStatus })}
                        className="border rounded px-2 py-1 text-sm">
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
