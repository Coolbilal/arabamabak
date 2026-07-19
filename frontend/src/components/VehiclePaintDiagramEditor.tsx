import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import CarDiagramSVG from './CarDiagramSVG';

type Status = 'original' | 'painted' | 'changed' | null;

type Props = {
  value: Record<string, Status>;
  onChange: (v: Record<string, Status>) => void;
};

const PARTS: { code: string; label: string }[] = [
  { code: 'hood', label: 'Kaput' },
  { code: 'roof', label: 'Tavan' },
  { code: 'trunk', label: 'Bagaj' },
  { code: 'leftDoor', label: 'Sol Kapı' },
  { code: 'rightDoor', label: 'Sağ Kapı' },
  { code: 'leftFender', label: 'Sol Çamurluk' },
  { code: 'rightFender', label: 'Sağ Çamurluk' },
];

const COLORS: Record<string, string> = {
  original: '#4CAF50',
  painted: '#FFC107',
  changed: '#F44336',
};

export default function VehiclePaintDiagramEditor({ value, onChange }: Props) {
  const [showList, setShowList] = useState(false);

  function setAllOriginal() {
    const next: Record<string, Status> = {};
    PARTS.forEach((p) => { next[p.code] = 'original'; });
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
            checked={PARTS.every((p) => value[p.code] === 'original')}
            onChange={(e) => (e.target.checked ? setAllOriginal() : clearAll())}
          />
          <span className="text-sm font-semibold">Tamamı Orijinal</span>
        </label>
        <button
          type="button"
          onClick={() => setShowList(true)}
          className="text-sm text-red-600 hover:text-red-700 font-semibold"
        >
          Liste
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        <div className="w-full max-w-[300px]">
          <CarDiagramSVG />
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-3">Renk Açıklamaları</h3>
          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 rounded inline-block border border-slate-300" style={{ background: COLORS.original }} />
              Orijinal
            </p>
            <p className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 rounded inline-block border border-slate-300" style={{ background: COLORS.painted }} />
              Boyalı
            </p>
            <p className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 rounded inline-block border border-slate-300" style={{ background: COLORS.changed }} />
              Değişmiş
            </p>
          </div>
        </div>
      </div>

      {showList && (
        <PartsListModal value={value} onChange={onChange} onClose={() => setShowList(false)} />
      )}
    </div>
  );
}

function PartsListModal({ value, onChange, onClose }: {
  value: Record<string, Status>;
  onChange: (v: Record<string, Status>) => void;
  onClose: () => void;
}) {
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
              {PARTS.map((p) => {
                const status = value[p.code] ?? null;
                return (
                  <tr key={p.code} className="border-b">
                    <td className="p-2 font-medium">{p.label}</td>
                    <td className="p-2">
                      <select
                        value={status ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          onChange({ ...value, [p.code]: val === '' ? null : (val as Status) });
                        }}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Belirtilmemiş</option>
                        <option value="original">Orijinal</option>
                        <option value="painted">Boyalı</option>
                        <option value="changed">Değişmiş</option>
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

export type PaintStatus = Status;
