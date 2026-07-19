import { useState } from "react";

const partsList = [
  "hood",
  "roof",
  "trunk",
  "leftDoor",
  "rightDoor",
  "leftFender",
  "rightFender"
];

const colors = {
  original: "#4CAF50",
  painted: "#FFC107",
  changed: "#F44336"
};

export default function CarDiagramSVG() {
  const [parts, setParts] = useState<Record<string, keyof typeof colors | null>>({});

  const handleClick = (part: string) => {
    const current = parts[part];

    let next: keyof typeof colors | null;
    if (!current) next = "original";
    else if (current === "original") next = "painted";
    else if (current === "painted") next = "changed";
    else next = null;

    setParts({ ...parts, [part]: next });
  };

  const getColor = (part: string) => {
    return colors[parts[part] as keyof typeof colors] || "#ddd";
  };

  return (
    <div>
      <svg viewBox="0 0 300 600" width="250">
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
      <div style={{ marginTop: 10 }}>
        <p>🟢 Orijinal</p>
        <p>🟡 Boyalı</p>
        <p>🔴 Değişmiş</p>
      </div>
    </div>
  );
}
