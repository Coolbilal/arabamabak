import { useState, useRef, useEffect } from 'react';
import { X, Check, List } from 'lucide-react';
import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

const STATUS_META: Record<PaintStatus, { label: string; color: string; border: string }> = {
  none: { label: 'Belirtilmemiş', color: '#e5e7eb', border: '#cbd5e1' },
  original: { label: 'Orijinal', color: '#10b981', border: '#059669' },
  painted: { label: 'Boyanmış', color: '#facc15', border: '#ca8a04' },
  local_painted: { label: 'Lokal Boyanmış', color: '#fde68a', border: '#ca8a04' },
  changed: { label: 'Değişmiş', color: '#ef4444', border: '#dc2626' },
  repaired: { label: 'Tamir', color: '#3b82f6', border: '#2563eb' },
};

// Her parça için ayrı SVG path (kendi kompakt görseli)
const PARTS: {
  code: string;
  label: string;
  description: string;
  svg: (color: string, border: string) => React.ReactNode;
}[] = [
  {
    code: 'front_bumper', label: 'Ön Tampon',
    description: 'Aracın ön kısmındaki tampon',
    svg: (color, border) => (
      <g>
        <rect x="20" y="40" width="160" height="50" rx="12" fill={color} stroke={border} strokeWidth="2" />
        <rect x="40" y="50" width="20" height="10" rx="2" fill="#94a3b8" />
        <rect x="140" y="50" width="20" height="10" rx="2" fill="#94a3b8" />
        <rect x="60" y="65" width="80" height="15" rx="3" fill="#475569" />
        <text x="100" y="75" fontSize="9" fill="white" textAnchor="middle" fontWeight="bold">TR XX XXXX</text>
      </g>
    ),
  },
  {
    code: 'hood', label: 'Kaput',
    description: 'Motor bölmesinin üst kapağı',
    svg: (color, border) => (
      <g>
        <path d="M 30,30 L 170,30 Q 180,30 180,45 L 180,80 Q 180,95 165,95 L 35,95 Q 20,95 20,80 L 20,45 Q 20,30 30,30 Z" fill={color} stroke={border} strokeWidth="2" />
        <line x1="100" y1="35" x2="100" y2="90" stroke={border} strokeWidth="1" opacity="0.4" />
        <rect x="35" y="50" width="30" height="20" rx="3" fill="none" stroke={border} strokeWidth="1" opacity="0.4" />
        <rect x="135" y="50" width="30" height="20" rx="3" fill="none" stroke={border} strokeWidth="1" opacity="0.4" />
      </g>
    ),
  },
  {
    code: 'roof', label: 'Tavan',
    description: 'Aracın üst kısmı',
    svg: (color, border) => (
      <g>
        <path d="M 20,30 L 180,30 Q 190,30 190,50 L 190,90 L 10,90 L 10,50 Q 10,30 20,30 Z" fill={color} stroke={border} strokeWidth="2" />
        <rect x="40" y="45" width="120" height="35" rx="6" fill="#bae6fd" opacity="0.5" />
        <text x="100" y="68" fontSize="11" fill="#0369a1" textAnchor="middle" opacity="0.6">CAM</text>
      </g>
    ),
  },
  {
    code: 'trunk', label: 'Bagaj Kapağı',
    description: 'Arka bagaj kapağı',
    svg: (color, border) => (
      <g>
        <path d="M 30,30 Q 20,30 20,45 L 20,80 Q 20,95 35,95 L 165,95 Q 180,95 180,80 L 180,45 Q 180,30 170,30 Z" fill={color} stroke={border} strokeWidth="2" />
        <rect x="60" y="55" width="80" height="8" rx="2" fill="#94a3b8" />
        <text x="100" y="78" fontSize="8" fill={border} textAnchor="middle" opacity="0.6">BAGAJ</text>
      </g>
    ),
  },
  {
    code: 'rear_bumper', label: 'Arka Tampon',
    description: 'Aracın arka kısmındaki tampon',
    svg: (color, border) => (
      <g>
        <rect x="20" y="40" width="160" height="50" rx="12" fill={color} stroke={border} strokeWidth="2" />
        <rect x="40" y="50" width="20" height="10" rx="2" fill="#ef4444" opacity="0.6" />
        <rect x="140" y="50" width="20" height="10" rx="2" fill="#ef4444" opacity="0.6" />
        <rect x="60" y="65" width="80" height="15" rx="3" fill="#1e293b" />
        <text x="100" y="75" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">PLAKA</text>
      </g>
    ),
  },
  {
    code: 'left_front_fender', label: 'Sol Ön Çamurluk',
    description: 'Sol ön tekerlek üstü gövde',
    svg: (color, border) => (
      <g>
        <path d="M 50,20 L 150,20 Q 170,20 175,40 L 175,70 Q 170,80 150,80 L 50,80 Q 35,80 30,70 L 30,40 Q 35,20 50,20 Z" fill={color} stroke={border} strokeWidth="2" />
        <circle cx="60" cy="95" r="18" fill="#1e293b" />
        <circle cx="60" cy="95" r="10" fill="#475569" />
        <circle cx="60" cy="95" r="4" fill="#94a3b8" />
      </g>
    ),
  },
  {
    code: 'left_front_door', label: 'Sol Ön Kapı',
    description: 'Sol ön yolcu kapısı',
    svg: (color, border) => (
      <g>
        <rect x="20" y="20" width="160" height="80" rx="10" fill={color} stroke={border} strokeWidth="2" />
        <rect x="30" y="30" width="60" height="60" rx="5" fill="#bae6fd" opacity="0.4" />
        <rect x="100" y="55" width="6" height="20" rx="2" fill={border} />
        <rect x="115" y="45" width="15" height="3" rx="1" fill={border} />
      </g>
    ),
  },
  {
    code: 'left_rear_door', label: 'Sol Arka Kapı',
    description: 'Sol arka yolcu kapısı',
    svg: (color, border) => (
      <g>
        <rect x="20" y="20" width="160" height="80" rx="10" fill={color} stroke={border} strokeWidth="2" />
        <rect x="30" y="30" width="60" height="60" rx="5" fill="#bae6fd" opacity="0.4" />
        <rect x="100" y="55" width="6" height="20" rx="2" fill={border} />
        <rect x="115" y="45" width="15" height="3" rx="1" fill={border} />
      </g>
    ),
  },
  {
    code: 'left_rear_fender', label: 'Sol Arka Çamurluk',
    description: 'Sol arka tekerlek üstü gövde',
    svg: (color, border) => (
      <g>
        <path d="M 50,20 L 150,20 Q 170,20 175,40 L 175,70 Q 170,80 150,80 L 50,80 Q 35,80 30,70 L 30,40 Q 35,20 50,20 Z" fill={color} stroke={border} strokeWidth="2" />
        <circle cx="140" cy="95" r="18" fill="#1e293b" />
        <circle cx="140" cy="95" r="10" fill="#475569" />
        <circle cx="140" cy="95" r="4" fill="#94a3b8" />
      </g>
    ),
  },
  {
    code: 'right_front_fender', label: 'Sağ Ön Çamurluk',
    description: 'Sağ ön tekerlek üstü gövde',
    svg: (color, border) => (
      <g>
        <path d="M 50,20 L 150,20 Q 170,20 175,40 L 175,70 Q 170,80 150,80 L 50,80 Q 35,80 30,70 L 30,40 Q 35,20 50,20 Z" fill={color} stroke={border} strokeWidth="2" />
        <circle cx="60" cy="95" r="18" fill="#1e293b" />
        <circle cx="60" cy="95" r="10" fill="#475569" />
        <circle cx="60" cy="95" r="4" fill="#94a3b8" />
      </g>
    ),
  },
  {
    code: 'right_front_door', label: 'Sağ Ön Kapı',
    description: 'Sağ ön yolcu kapısı',
    svg: (color, border) => (
      <g>
        <rect x="20" y="20" width="160" height="80" rx="10" fill={color} stroke={border} strokeWidth="2" />
        <rect x="110" y="30" width="60" height="60" rx="5" fill="#bae6fd" opacity="0.4" />
        <rect x="94" y="55" width="6" height="20" rx="2" fill={border} />
        <rect x="70" y="45" width="15" height="3" rx="1" fill={border} />
      </g>
    ),
  },
  {
    code: 'right_rear_door', label: 'Sağ Arka Kapı',
    description: 'Sağ arka yolcu kapısı',
    svg: (color, border) => (
      <g>
        <rect x="20" y="20" width="160" height="80" rx="10" fill={color} stroke={border} strokeWidth="2" />
        <rect x="110" y="30" width="60" height="60" rx="5" fill="#bae6fd" opacity="0.4" />
        <rect x="94" y="55" width="6" height="20" rx="2" fill={border} />
        <rect x="70" y="45" width="15" height="3" rx="1" fill={border} />
      </g>
    ),
  },
  {
    code: 'right_rear_fender', label: 'Sağ Arka Çamurluk',
    description: 'Sağ arka tekerlek üstü gövde',
    svg: (color, border) => (
      <g>
        <path d="M 50,20 L 150,20 Q 170,20 175,40 L 175,70 Q 170,80 150,80 L 50,80 Q 35,80 30,70 L 30,40 Q 35,20 50,20 Z" fill={color} stroke={border} strokeWidth="2" />
        <circle cx="140" cy="95" r="18" fill="#1e293b" />
        <circle cx="140" cy="95" r="10" fill="#475569" />
        <circle cx="140" cy="95" r="4" fill="#94a3b8" />
      </g>
    ),
  },
];

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
};

export default function VehiclePaintDiagramEditor({ value, onChange }: Props) {
  const [activePart, setActivePart] = useState<string | null>(null);
  const [showList, setShowList] = useState(false);

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
          <List className="h-4 w-4" /> Liste
        </button>
      </div>

      {/* 13 parça grid halinde, her biri tıklanabilir */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-4">
        {PARTS.map((part) => {
          const status = value[part.code] ?? 'none';
          const meta = STATUS_META[status];
          return (
            <button
              key={part.code}
              type="button"
              onClick={() => setStatus(part.code, status === 'none' ? 'original' : 'none')}
              className={cn(
                'rounded-lg border-2 p-2 transition relative group hover:shadow-md',
                status === 'none' ? 'border-slate-200 bg-white' : 'border-transparent',
                status === 'original' && 'ring-2 ring-emerald-300'
              )}
              style={status !== 'none' ? { background: meta.color + '40', borderColor: meta.border } : {}}
            >
              <svg viewBox="0 0 200 120" className="w-full h-16 mb-1">
                {part.svg(meta.color, meta.border)}
              </svg>
              <div className="text-xs font-semibold text-slate-700 text-center">{part.label}</div>
              <div
                className="absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow"
                style={{
                  background: meta.color === 'transparent' ? '#94a3b8' : meta.border,
                  color: 'white',
                }}
              >
                {meta.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Lejant */}
      <div className="flex items-center gap-4 flex-wrap p-3 rounded-lg bg-slate-50 border">
        <span className="text-xs font-semibold text-slate-600">Lejant:</span>
        {Object.entries(STATUS_META).filter(([k]) => k !== 'none').map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs">
            <span
              className="h-3 w-3 rounded inline-block border"
              style={{ background: meta.color, borderColor: meta.border }}
            />
            <span>{meta.label}</span>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-500 mt-3">
        💡 Bir parçaya tıklayınca durumu değişir. Sırasıyla: Belirtilmemiş → Orijinal → Boyanmış → Lokal Boyanmış → Değişmiş → Tamir → Belirtilmemiş
      </p>

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
