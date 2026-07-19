import { useState } from "react";

type Status = "original" | "painted" | "changed" | null;

export default function CarDiagramSVG() {
  const [parts, setParts] = useState<Record<string, Status>>({});

  const colors: Record<string, string> = {
    original: "#4CAF50",
    painted: "#FFC107",
    changed: "#F44336"
  };

  const handleClick = (part: string) => {
    const current = parts[part];
    let next: Status;
    if (!current) next = "original";
    else if (current === "original") next = "painted";
    else if (current === "painted") next = "changed";
    else next = null;
    setParts({ ...parts, [part]: next });
  };

  const getColor = (part: string) => {
    const s = parts[part];
    return s ? colors[s] : "#ddd";
  };

  return (
    <div>
      <svg viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg" width="300">
        {/* KAPUT */}
        <path d="M140 150 Q200 100 260 150 L260 260 Q200 300 140 260 Z"
          fill={getColor("hood")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("hood")}
        />
        {/* TAVAN */}
        <path d="M140 260 Q200 220 260 260 L260 380 Q200 420 140 380 Z"
          fill={getColor("roof")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("roof")}
        />
        {/* BAGAJ */}
        <path d="M140 380 Q200 420 260 380 L260 480 Q200 520 140 480 Z"
          fill={getColor("trunk")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("trunk")}
        />
        {/* SOL ÖN ÇAMURLUK */}
        <path d="M90 160 Q120 130 140 180 L140 250 Q110 260 90 220 Z"
          fill={getColor("leftFrontFender")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("leftFrontFender")}
        />
        {/* SAĞ ÖN ÇAMURLUK */}
        <path d="M310 160 Q280 130 260 180 L260 250 Q290 260 310 220 Z"
          fill={getColor("rightFrontFender")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("rightFrontFender")}
        />
        {/* SOL KAPI */}
        <path d="M100 260 L140 260 L140 380 L100 380 Q80 330 100 260 Z"
          fill={getColor("leftDoor")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("leftDoor")}
        />
        {/* SAĞ KAPI */}
        <path d="M300 260 L260 260 L260 380 L300 380 Q320 330 300 260 Z"
          fill={getColor("rightDoor")} stroke="#333" style={{ cursor: 'pointer' }}
          onClick={() => handleClick("rightDoor")}
        />
        {/* ARAÇ DIŞ HAT */}
        <path d="M140 150 Q200 80 260 150 L260 500 Q200 580 140 500 Z"
          fill="none" stroke="#555" strokeWidth="2" />
      </svg>
      <div style={{ marginTop: 10 }}>
        <p>🟢 Orijinal</p>
        <p>🟡 Boyalı</p>
        <p>🔴 Değişmiş</p>
      </div>
    </div>
  );
}
