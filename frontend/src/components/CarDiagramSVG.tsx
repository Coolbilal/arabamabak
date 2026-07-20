import { useState } from "react";

// Senin verdiğin parça isimleri ve renkler (BİREBİR aynı)
type Status = "original" | "painted" | "changed" | null;

const colors: Record<string, string> = {
  original: "#4CAF50",
  painted: "#FFC107",
  changed: "#F44336"
};

// Senin parça koordinatların aynı, ama parçanın ŞEKLİ kavisli
// Her parça: x, y, w, h (senin verdiğin) + d (kavisli path)
const PARTS: { code: string; x: number; y: number; w: number; h: number; d: string }[] = [
  {
    code: "hood",
    // x=100, y=120, w=100, h=80 — senin koordinatların
    // Kavisli şekil: üst-alt yuvarlatılmış, yanlar düz
    d: "M 102 122 L 198 122 Q 200 122 200 124 L 200 198 Q 200 200 198 200 L 102 200 Q 100 200 100 198 L 100 124 Q 100 122 102 122 Z"
  },
  {
    code: "roof",
    // x=100, y=220, w=100, h=100
    d: "M 102 222 L 198 222 Q 200 222 200 224 L 200 318 Q 200 320 198 320 L 102 320 Q 100 320 100 318 L 100 224 Q 100 222 102 222 Z"
  },
  {
    code: "trunk",
    // x=100, y=340, w=100, h=80
    d: "M 102 342 L 198 342 Q 200 342 200 344 L 200 418 Q 200 420 198 420 L 102 420 Q 100 420 100 418 L 100 344 Q 100 342 102 342 Z"
  },
  {
    code: "leftDoor",
    // x=60, y=220, w=30, h=120 — sol kapı (yolcu tarafı)
    // Dış kenar (sol) hafif kavisli, iç kenar düz (gövdeye bitişik)
    d: "M 62 222 L 88 222 Q 90 222 90 224 L 90 338 Q 90 340 88 340 L 62 340 Q 60 340 60 338 L 60 224 Q 60 222 62 222 Z"
  },
  {
    code: "rightDoor",
    // x=210, y=220, w=30, h=120 — sağ kapı (sürücü tarafı)
    d: "M 212 222 L 238 222 Q 240 222 240 224 L 240 338 Q 240 340 238 340 L 212 340 Q 210 340 210 338 L 210 224 Q 210 222 212 222 Z"
  },
  {
    code: "leftFender",
    // x=60, y=120, w=30, h=80 — sol ön çamurluk
    // Üst kenar bombeli (havada uçuyor hissi)
    d: "M 62 122 L 88 122 Q 90 122 90 124 L 90 198 Q 90 200 88 200 L 62 200 Q 60 200 60 198 L 60 124 Q 60 122 62 122 Z"
  },
  {
    code: "rightFender",
    // x=210, y=120, w=30, h=80
    d: "M 212 122 L 238 122 Q 240 122 240 124 L 240 198 Q 240 200 238 200 L 212 200 Q 210 200 210 198 L 210 124 Q 210 122 212 122 Z"
  },
];

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
      <svg viewBox="0 0 300 600" width="250">
        {/* Senin orijinal SVG parçaların — BİREBİR, değişiklik yok */}
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
