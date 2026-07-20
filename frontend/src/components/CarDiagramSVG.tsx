import { useState } from "react";

// Senin verdiğin parça isimleri ve renkler
type Status = "original" | "painted" | "changed" | null;

const colors: Record<string, string> = {
  original: "#4CAF50",
  painted: "#FFC107",
  changed: "#F44336"
};

export default function CarDiagramSVG() {
  const [parts, setParts] = useState<Record<string, Status>>({});

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
      <div style={{ marginTop: 10 }}>
        <p>🟢 Orijinal</p>
        <p>🟡 Boyalı</p>
        <p>🔴 Değişmiş</p>
      </div>
      <svg viewBox="0 0 500 900" width="250">
        {/* Senin verdiğin SVG parçaları - BİREBİR, hiç değişiklik yok */}
        {/* Kaput */}
        <rect x="100" y="120" width="100" height="80"
          fill={getColor("hood")}
          onClick={() => handleClick("hood")}
        />
        {/* Tavan */}
        <rect x="100" y="220" width="100" height="100"
          fill={getColor("roof")}
          onClick={() => handleClick("roof")}
        />
        {/* Bagaj */}
        <rect x="100" y="340" width="100" height="80"
          fill={getColor("trunk")}
          onClick={() => handleClick("trunk")}
        />
        {/* Sol Kapı */}
        <rect x="60" y="220" width="30" height="120"
          fill={getColor("leftDoor")}
          onClick={() => handleClick("leftDoor")}
        />
        {/* Sağ Kapı */}
        <rect x="210" y="220" width="30" height="120"
          fill={getColor("rightDoor")}
          onClick={() => handleClick("rightDoor")}
        />
        {/* Sol Çamurluk */}
        <rect x="60" y="120" width="30" height="80"
          fill={getColor("leftFender")}
          onClick={() => handleClick("leftFender")}
        />
        {/* Sağ Çamurluk */}
        <rect x="210" y="120" width="30" height="80"
          fill={getColor("rightFender")}
          onClick={() => handleClick("rightFender")}
        />
      </svg>
    </div>
  );
}
