import { useState } from "react";

// Senin son verdiğin SVG'nin class'ları ve renkleri
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

// Senin verdiğin 4 parça (viewBox 800x400)
const PARTS = [
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
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 400"
        width="100%"
        style={{ maxWidth: '600px', height: 'auto' }}
      >
        <style>{`
          .part { cursor: pointer; stroke: #222; stroke-width: 2; transition: 0.2s; }
          .part:hover { opacity: 0.8; stroke-width: 3; }
          .boyalı { fill: #ff4d4d; }
          .degisen { fill: #ffa500; }
          .lokal { fill: #4da6ff; }
          .orjinal { fill: #4dff88; }
        `}</style>
        {/* CAR BASE */}
        <rect x="100" y="150" width="600" height="120" fill="#e0e0e0" stroke="#333" />
        {/* PARTS - senin verdiğin BİREBİR */}
        <rect
          id="hood"
          className={getClass("hood")}
          x="100" y="150" width="150" height="120"
          onClick={() => handleClick("hood")}
        />
        <rect
          id="frontDoor"
          className={getClass("frontDoor")}
          x="250" y="150" width="150" height="120"
          onClick={() => handleClick("frontDoor")}
        />
        <rect
          id="rearDoor"
          className={getClass("rearDoor")}
          x="400" y="150" width="150" height="120"
          onClick={() => handleClick("rearDoor")}
        />
        <rect
          id="trunk"
          className={getClass("trunk")}
          x="550" y="150" width="150" height="120"
          onClick={() => handleClick("trunk")}
        />
      </svg>
    </div>
  );
}
