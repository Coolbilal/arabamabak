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

const ORDER: Status[] = ["orjinal", "boyalı", "lokal", "degisen", null];

// Senin 4 parçan - KAVİSLİ path'ler, gerçek sedan araba şekli
// viewBox 800x500
const PARTS: { id: string; d: string }[] = [
  { id: "hood", d: "M 80 200 Q 100 180 130 180 L 280 180 L 280 320 L 130 320 Q 100 320 80 300 L 80 220 Z" },
  { id: "frontDoor", d: "M 280 180 L 290 130 Q 305 100 340 100 L 510 100 Q 530 100 540 120 L 540 320 Q 525 330 510 330 L 340 330 Q 305 330 290 310 L 280 320 Z" },
  { id: "rearDoor", d: "M 540 180 L 700 180 L 700 320 L 540 320 Z" },
  { id: "trunk", d: "M 700 200 Q 720 180 750 200 L 750 300 Q 720 320 700 300 L 700 220 Z" },
];

export default function CarDiagramSVG() {
  const [parts, setParts] = useState<Record<string, Status>>({});

  const handleClick = (id: string) => {
    const current = parts[id] ?? null;
    const idx = ORDER.indexOf(current);
    const next = ORDER[(idx + 1) % ORDER.length];
    setParts({ ...parts, [id]: next });
  };

  const getClass = (id: string) => {
    const status = parts[id];
    return `part ${status ?? ""}`.trim();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        {ORDER.filter(s => s !== null).map((s) => (
          <div key={s} className="flex items-center gap-1 text-sm">
            <span
              className="h-3 w-3 rounded-full inline-block border border-slate-300"
              style={{ background: COLORS[s!] }}
            />
            <span>{LABELS[s!]}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          width: '100%',
          maxWidth: '600px',
          aspectRatio: '8 / 5',  // viewBox 800x500
          overflow: 'visible',
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 800 500"
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
          style={{ display: 'block' }}
        >
          <style>{`
            .part { cursor: pointer; stroke: #222; stroke-width: 2.5; transition: 0.2s; }
            .part:hover { opacity: 0.85; stroke-width: 3.5; }
            .boyalı { fill: #ff4d4d; }
            .degisen { fill: #ffa500; }
            .lokal { fill: #4da6ff; }
            .orjinal { fill: #4dff88; }
          `}</style>
          {/* CAR BASE - gövde silüeti (gri zemin, kavisli uçlu) */}
          <path
            d="M 80 200 Q 100 180 130 180 L 690 180 Q 720 180 750 200 L 750 300 Q 720 320 690 320 L 130 320 Q 100 320 80 300 L 80 220 Z"
            fill="#e0e0e0" stroke="#333" strokeWidth="2"
          />
          {/* 4 PARÇA - kavisli gerçek araba şekli */}
          {PARTS.map((p) => (
            <path
              key={p.id}
              id={p.id}
              className={getClass(p.id)}
              d={p.d}
              onClick={() => handleClick(p.id)}
            />
          ))}
          {/* TEKERLEKLER - 4 adet dışarıda, dikey oval */}
          <ellipse cx="120" cy="200" rx="25" ry="35" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="120" cy="200" rx="10" ry="16" fill="#666" />
          <ellipse cx="700" cy="200" rx="25" ry="35" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="700" cy="200" rx="10" ry="16" fill="#666" />
          <ellipse cx="120" cy="380" rx="25" ry="35" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="120" cy="380" rx="10" ry="16" fill="#666" />
          <ellipse cx="700" cy="380" rx="25" ry="35" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="700" cy="380" rx="10" ry="16" fill="#666" />
        </svg>
      </div>
    </div>
  );
}
