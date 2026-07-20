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

// 14 PARÇA - YATAY SEDAN ARABA - KAVİSLİ PATH'LER
// viewBox 1200x600 (yatay, geniş)
const PARTS: { id: string; label: string; d: string }[] = [
  // === ÖN TAMpon (en sağ, kavisli uçlu) ===
  {
    id: "front_bumper",
    label: "Ön Tampon",
    d: "M 1080 280 Q 1080 240 1130 230 Q 1160 225 1180 230 Q 1200 240 1200 280 L 1200 360 Q 1200 400 1180 410 Q 1160 415 1130 410 Q 1080 400 1080 360 Z"
  },
  // === SAĞ ÖN ÇAMURLUK (sağ üst, tekerlek yuvası) ===
  {
    id: "right_front_fender",
    label: "Sağ Ön Çamurluk",
    d: "M 1080 200 Q 1080 180 1100 180 L 1080 200 L 1080 460 L 1100 460 Q 1080 460 1080 440 Z"
  },
  // === SAĞ ARKA ÇAMURLUK (sağ orta, tekerlek yuvası) ===
  {
    id: "right_rear_fender",
    label: "Sağ Arka Çamurluk",
    d: "M 1080 200 Q 1080 180 1100 180 L 1080 460 L 1100 460 Q 1080 460 1080 440 Z"
  },
  // === ÖN KAPUT (sağ, kaput) ===
  {
    id: "hood",
    label: "Ön Kaput",
    d: "M 920 220 L 1080 220 L 1080 420 L 920 420 Q 900 420 900 400 L 900 240 Q 900 220 920 220 Z"
  },
  // === ÖN CAM (parabolik, tavan ile ön kapı arası) ===
  // (görsel parça değil, dekoratif)
  // === ÖN KAPI (sağ orta üst, dikdörtgen kavisli) ===
  {
    id: "right_front_door",
    label: "Sağ Ön Kapı",
    d: "M 740 220 L 920 220 L 920 420 L 740 420 Z"
  },
  // === ARKA KAPI (sağ orta alt) ===
  {
    id: "right_rear_door",
    label: "Sağ Arka Kapı",
    d: "M 560 220 L 740 220 L 740 420 L 560 420 Z"
  },
  // === TAVAN (en sol orta, büyük kare) ===
  {
    id: "roof",
    label: "Tavan",
    d: "M 200 220 L 560 220 L 560 420 L 200 420 Z"
  },
  // === BAGAJ (sol, bagaj) ===
  {
    id: "trunk",
    label: "Bagaj",
    d: "M 60 220 L 200 220 L 200 420 L 80 420 Q 60 420 60 400 L 60 240 Q 60 220 80 220 Z"
  },
  // === ARKA TAMPON (en sol, kavisli uçlu) ===
  {
    id: "rear_bumper",
    label: "Arka Tampon",
    d: "M 0 280 Q 0 240 20 230 Q 50 225 70 230 Q 90 240 90 280 L 90 360 Q 90 400 70 410 Q 50 415 20 410 Q 0 400 0 360 Z"
  },
  // === SOL ÖN ÇAMURLUK (sol orta-sağ) ===
  {
    id: "left_front_fender",
    label: "Sol Ön Çamurluk",
    d: "M 920 200 L 920 200 L 920 460 L 900 460 Q 920 460 920 440 Z"
  },
  // === SOL ARKA ÇAMURLUK ===
  {
    id: "left_rear_fender",
    label: "Sol Arka Çamurluk",
    d: "M 200 200 L 200 460 L 220 460 Q 200 460 200 440 Z"
  },
  // === SOL ÖN KAPI ===
  {
    id: "left_front_door",
    label: "Sol Ön Kapı",
    d: "M 560 220 L 740 220 L 740 420 L 560 420 Z"
  },
  // === SOL ARKA KAPI ===
  {
    id: "left_rear_door",
    label: "Sol Arka Kapı",
    d: "M 380 220 L 560 220 L 560 420 L 380 420 Z"
  },
  // === ÖN CAM (parabolik, tavan önü) - dekoratif ===
  // === ARKA CAM (parabolik, tavan arkası) - dekoratif ===
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
      {/* CONTAINER: width 100%, height auto (KRİTİK - ezilme yok) */}
      <div
        style={{
          width: '100%',
          maxWidth: '700px',
          height: 'auto',  // KRİTİK: SVG oranını korur
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 600"
          width="100%"
          height="auto"  // KRİTİK
          preserveAspectRatio="xMidYMid meet"  // KRİTİK
          style={{ display: 'block' }}
        >
          <style>{`
            .part { cursor: pointer; stroke: #222; stroke-width: 2; transition: 0.2s; }
            .part:hover { opacity: 0.85; stroke-width: 3; }
            .boyalı { fill: #ff4d4d; }
            .degisen { fill: #ffa500; }
            .lokal { fill: #4da6ff; }
            .orjinal { fill: #4dff88; }
          `}</style>
          {/* CAR BASE - gövde silüeti (gri, kavisli tampon uçlu) */}
          <path
            d="M 0 280 Q 0 220 70 220 L 1130 220 Q 1200 220 1200 280 L 1200 360 Q 1200 420 1130 420 L 70 420 Q 0 420 0 360 Z"
            fill="#e0e0e0" stroke="#333" strokeWidth="2"
          />
          {/* 14 PARÇA - kavisli path'ler, gerçek araba şekli */}
          {PARTS.map((p) => (
            <path
              key={p.id}
              id={p.id}
              className={getClass(p.id)}
              d={p.d}
              onClick={() => handleClick(p.id)}
            />
          ))}
          {/* ÖN/ARKA CAM (parabolik, dekoratif) */}
          <path d="M 560 220 Q 580 200 620 200 L 700 200 Q 740 200 740 220 Z" fill="#9bb8d0" stroke="#444" strokeWidth="1.5" pointerEvents="none" />
          <path d="M 200 220 Q 220 200 260 200 L 340 200 Q 380 200 380 220 Z" fill="#9bb8d0" stroke="#444" strokeWidth="1.5" pointerEvents="none" />
          {/* 4 TEKERLEK - dışarıda, dikey oval */}
          <ellipse cx="100" cy="220" rx="22" ry="32" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="100" cy="220" rx="9" ry="14" fill="#666" />
          <ellipse cx="1100" cy="220" rx="22" ry="32" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="1100" cy="220" rx="9" ry="14" fill="#666" />
          <ellipse cx="100" cy="420" rx="22" ry="32" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="100" cy="420" rx="9" ry="14" fill="#666" />
          <ellipse cx="1100" cy="420" rx="22" ry="32" fill="#1a1a1a" stroke="#222" strokeWidth="2" />
          <ellipse cx="1100" cy="420" rx="9" ry="14" fill="#666" />
          {/* Farlar (dekoratif) */}
          <rect x="1170" y="300" width="20" height="10" rx="2" fill="#334155" />
          <rect x="10" y="300" width="20" height="10" rx="2" fill="#334155" />
        </svg>
      </div>

      {/* 14 parça listesi (seçim için) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4">
        {PARTS.map((p) => {
          const status = parts[p.id];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => handleClick(p.id)}
              className="flex items-center justify-between p-2 rounded border border-slate-200 hover:border-slate-400 transition-colors text-sm"
            >
              <span className="font-medium">{p.label}</span>
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
