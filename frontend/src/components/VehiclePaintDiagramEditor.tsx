import { useState, useEffect, useRef } from 'react';
import { X, List } from 'lucide-react';
import CarDiagramSVG, { STATUS_META, DIAGRAM_PARTS, type PaintStatus } from './CarDiagramSVG';

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  // dışarıdan setStatus için
  showList?: boolean;
};

export default function VehiclePaintDiagramEditor({ value, onChange, showList: showListProp }: Props) {
  const [showListInternal, setShowListInternal] = useState(false);
  const showList = showListProp ?? showListInternal;

  function setAllOriginal() {
    const next: Record<string, PaintStatus> = {};
    DIAGRAM_PARTS.forEach((p) => { next[p.code] = 'original'; });
    onChange(next);
  }

  function clearAll() {
    onChange({});
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 accent-emerald-600"
            checked={DIAGRAM_PARTS.every((p) => value[p.code] === 'original')}
            onChange={(e) => (e.target.checked ? setAllOriginal() : clearAll())}
          />
          <span className="text-sm font-semibold">Tamamı Orijinal</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => (showListProp === undefined ? setShowListInternal(true) : null)}
            className="inline-flex items-center gap-1 text-sm text-red-600 hover:text-red-700 font-semibold"
          >
            <List className="h-4 w-4" /> Liste
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[600px_1fr] gap-6">
        <div className="w-full max-w-[600px]">
          <CarDiagramSVG value={value} onChange={onChange} width={600} />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Renklerin Listesi</h3>
          <div className="space-y-2 mb-4">
            {Object.entries(STATUS_META).filter(([k]) => k !== 'none').map(([key, meta]) => (
              <div key={key} className="flex items-center gap-2 text-sm">
                <span
                  className="h-4 w-4 rounded inline-block border border-slate-300 shrink-0"
                  style={{ background: meta.color }}
                />
                <span>{meta.label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-lg bg-slate-50 border p-3 mb-3">
            <p className="text-sm text-slate-600">
              <span className="font-semibold">İpucu:</span> Bir parçaya tıklayınca sırayla{' '}
              <span className="text-emerald-700 font-semibold">Orijinal</span> →{' '}
              <span className="text-yellow-700 font-semibold">Boyalı</span> →{' '}
              <span className="text-amber-700 font-semibold">Lokal</span> →{' '}
              <span className="text-red-700 font-semibold">Değişen</span> →{' '}
              <span className="text-blue-700 font-semibold">Tamir</span> geçer.
            </p>
          </div>
        </div>
      </div>

      {showList && <PartsListModal value={value} onChange={onChange} onClose={() => setShowListInternal(false)} />}
    </div>
  );
}

function PartsListModal({ value, onChange, onClose }: {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  onClose: () => void;
}) {
  void onChange; // used in select onChange
  const modalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (modalRef.current && modalRef.current.contains(e.target as Node)) return;
      onClose();
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div ref={modalRef} className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-bold text-lg">Parçalar Listesi</h2>
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
              {DIAGRAM_PARTS.map((p) => {
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
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}

// Re-export PaintStatus type for backwards compatibility
export type { PaintStatus } from './CarDiagramSVG';
