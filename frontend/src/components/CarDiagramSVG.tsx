import { useState } from "react";

type Status = "boyalı" | "degisen" | "lokal" | "orjinal" | null;

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
    <div style={{ width: '100%', maxWidth: '500px' }}>
      <svg viewBox="0 0 800 400" preserveAspectRatio="xMidYMid meet">
        <style>{`
          .part { cursor: pointer; }
          .boyalı { fill: red; }
          .degisen { fill: orange; }
          .lokal { fill: blue; }
          .orjinal { fill: green; }
        `}</style>
        <rect x="100" y="150" width="600" height="120" fill="#ddd" />
        <rect className={getClass("hood")} x="100" y="150" width="150" height="120" onClick={() => handleClick("hood")} />
        <rect className={getClass("frontDoor")} x="250" y="150" width="150" height="120" onClick={() => handleClick("frontDoor")} />
        <rect className={getClass("rearDoor")} x="400" y="150" width="150" height="120" onClick={() => handleClick("rearDoor")} />
        <rect className={getClass("trunk")} x="550" y="150" width="150" height="120" onClick={() => handleClick("trunk")} />
      </svg>
    </div>
  );
}
