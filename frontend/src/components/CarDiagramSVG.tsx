import { useState } from "react";

type Status = "boyalı" | "degisen" | "lokal" | "orjinal" | null;

const COLORS: Record<string, string> = {
  boyalı: "#ff4d4d",
  degisen: "#ffa500",
  lokal: "#4da6ff",
  orjinal: "#4dff88"
};

const LABELS: Record<string, string> = {
  boyalı: "Boyalı",
  degisen: "Değişen",
  lokal: "Lokal Boyalı",
  orjinal: "Orijinal"
};

const PART_LIST = [
  { id: "hood", label: "Kaput" },
  { id: "frontDoor", label: "Ön Kapı" },
  { id: "rearDoor", label: "Arka Kapı" },
  { id: "trunk", label: "Bagaj" },
] as const;

const ORDER: Status[] = ["orjinal", "boyalı", "lokal", "degisen", null];

export default function CarDiagramSVG() {
  const [parts, setParts] = useState<Record<string, Status>>({});

  const handleClick = (id: string) => {
    const current = parts[id] ?? null;
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length];
    setParts({ ...parts, [id]: next });
  };

  return (
    <div className="space-y-4">
      {/* Görsel: sadece gövde silüeti (kare YOK, kavisli gövde) */}
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          aspectRatio: '2 / 1',
          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
          borderRadius: '20px',
          position: 'relative',
          border: '2px solid #475569',
        }}
      >
        {/* Tekerlekler (dışarıda, kavisli) */}
        <div
          style={{
            position: 'absolute',
            left: '12%',
            top: '40%',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#1a1a1a',
            border: '3px solid #475569',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '12%',
            top: '40%',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#1a1a1a',
            border: '3px solid #475569',
          }}
        />

        {/* Parça rozetleri (her parça için) - konumlandırılmış, renkli, parça adı yazılı */}
        {PART_LIST.map((p) => {
          const status = parts[p.id];
          const positions: Record<string, { left: string }> = {
            hood: { left: '15%' },
            frontDoor: { left: '37%' },
            rearDoor: { left: '60%' },
            trunk: { left: '82%' },
          };
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleClick(p.id)}
              className="absolute top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg font-semibold text-sm border-2 transition-all hover:scale-105"
              style={{
                left: positions[p.id].left,
                background: status ? COLORS[status] : 'rgba(255,255,255,0.85)',
                color: status ? '#fff' : '#1e293b',
                borderColor: status ? COLORS[status] : '#94a3b8',
                textShadow: status ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                transform: 'translate(-50%, -50%)',
              }}
            >
              {p.label}
              {status && <span className="block text-xs mt-0.5">{LABELS[status]}</span>}
            </button>
          );
        })}
      </div>

      {/* Renk açıklaması */}
      <div className="flex flex-wrap gap-3 text-sm">
        {ORDER.filter(s => s !== null).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-full inline-block border border-slate-300"
              style={{ background: COLORS[s!] }}
            />
            <span>{LABELS[s!]}</span>
          </div>
        ))}
      </div>

      {/* Parça listesi (tıklama için alternatif) */}
      <div className="grid grid-cols-2 gap-2">
        {PART_LIST.map((p) => {
          const status = parts[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleClick(p.id)}
              className="flex items-center justify-between p-2 rounded border border-slate-200 hover:border-slate-400 transition-colors"
            >
              <span className="font-medium text-sm">{p.label}</span>
              <span
                className="px-2 py-0.5 rounded text-xs font-semibold text-white"
                style={{ background: status ? COLORS[status] : '#cbd5e1' }}
              >
                {status ? LABELS[status] : 'Seç'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
