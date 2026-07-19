export default function CarDiagramSVG() {
  return (
    <div>
      <svg viewBox="0 0 500 900" xmlns="http://www.w3.org/2000/svg">

        <style>{".part { stroke:#222; stroke-width:2; cursor:pointer; }"}</style>

        {/* OUTLINE - gerçek sedan silüeti (ön U + arka U + yan bombeli) */}
        <path d="M130 180 Q130 100 200 90 L300 90 Q370 100 370 180 L370 700 Q370 770 320 790 L300 810 Q250 830 200 810 L180 790 Q130 770 130 700 Z"
              fill="#f5f5f5" stroke="#444" stroke-width="3"/>

        {/* HOOD - ön üst, bombeli */}
        <path className="part" d="M160 200 Q160 130 230 130 L270 130 Q340 130 340 200 L340 280 Q250 320 160 280 Z" fill="#e0e0e0"/>

        {/* ROOF - orta, büyük, parabolik */}
        <path className="part" d="M160 290 Q160 280 175 280 L325 280 Q340 280 340 290 L340 460 Q250 480 160 460 Z" fill="#e0e0e0"/>

        {/* TRUNK - arka üst, bombeli */}
        <path className="part" d="M160 470 Q160 470 175 470 L325 470 Q340 470 340 470 L340 600 Q250 640 160 600 Z" fill="#e0e0e0"/>

        {/* LEFT FENDER - sol ön çamurluk (ön sol yarım ay) */}
        <path className="part" d="M120 200 Q120 170 150 170 L160 170 L160 290 Q130 290 120 250 Z" fill="#e0e0e0"/>

        {/* RIGHT FENDER - sağ ön çamurluk (ön sağ yarım ay) */}
        <path className="part" d="M380 200 Q380 170 350 170 L340 170 L340 290 Q370 290 380 250 Z" fill="#e0e0e0"/>

        {/* LEFT DOOR - sol kapı (sol orta, dikey) */}
        <path className="part" d="M120 300 L160 300 L160 460 Q130 460 120 430 Z" fill="#e0e0e0"/>

        {/* RIGHT DOOR - sağ kapı (sağ orta, dikey) */}
        <path className="part" d="M380 300 L340 300 L340 460 Q370 460 380 430 Z" fill="#e0e0e0"/>

        {/* WHEELS - 4 tekerlek (yarım daire dışarıda) */}
        <ellipse cx="130" cy="730" rx="30" ry="40" fill="#222"/>
        <ellipse cx="370" cy="730" rx="30" ry="40" fill="#222"/>
        <ellipse cx="130" cy="280" rx="25" ry="35" fill="#222"/>
        <ellipse cx="370" cy="280" rx="25" ry="35" fill="#222"/>

      </svg>
    </div>
  );
}
