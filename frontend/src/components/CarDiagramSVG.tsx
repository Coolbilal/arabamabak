export default function CarDiagramSVG() {
  return (
    <div>
      <svg viewBox="0 0 500 900" xmlns="http://www.w3.org/2000/svg">

        <style>{"{ .part { stroke:#222; stroke-width:2; cursor:pointer; } }"}</style>

        {/* === GERÇEK SEDAN SİLÜETİ - ÜSTTEN GÖRÜNÜM === */}
        {/* Ön tampon (U şeklinde, en altta) */}
        <path className="part" d="M150 770 Q150 830 220 830 L280 830 Q350 830 350 770 L350 740 L150 740 Z" fill="#d0d0d0"/>

        {/* Ön çamurluk - SOL (ön-sol yarım ay) */}
        <path className="part" d="M120 220 Q120 170 170 160 L200 160 L200 290 Q150 290 130 260 Z" fill="#e0e0e0"/>

        {/* Ön çamurluk - SAĞ (ön-sağ yarım ay) */}
        <path className="part" d="M380 220 Q380 170 330 160 L300 160 L300 290 Q350 290 370 260 Z" fill="#e0e0e0"/>

        {/* Kaput (ön üst, bombeli) */}
        <path className="part" d="M200 165 Q200 110 250 110 Q300 110 300 165 L300 290 L200 290 Z" fill="#e0e0e0"/>

        {/* Ön cam (parabolik) */}
        <path d="M200 290 Q250 320 300 290 L300 320 Q250 340 200 320 Z" fill="#b8d4e8" stroke="#666" strokeWidth="1.5"/>

        {/* Tavan (orta büyük) */}
        <path className="part" d="M200 320 L300 320 L300 480 L200 480 Z" fill="#e0e0e0"/>

        {/* Arka cam (parabolik) */}
        <path d="M200 480 Q250 510 300 480 L300 510 Q250 530 200 510 Z" fill="#b8d4e8" stroke="#666" strokeWidth="1.5"/>

        {/* Bagaj (arka üst) */}
        <path className="part" d="M200 510 L300 510 L300 620 Q300 670 250 670 Q200 670 200 620 Z" fill="#e0e0e0"/>

        {/* Arka çamurluk - SOL (arka-sol yarım ay) */}
        <path className="part" d="M120 580 Q120 540 170 540 L200 540 L200 660 Q150 660 130 630 Z" fill="#e0e0e0"/>

        {/* Arka çamurluk - SAĞ (arka-sağ yarım ay) */}
        <path className="part" d="M380 580 Q380 540 330 540 L300 540 L300 660 Q350 660 370 630 Z" fill="#e0e0e0"/>

        {/* Sol ÖN KAPI (sol orta üst) */}
        <path className="part" d="M120 290 L200 290 L200 410 Q150 410 120 380 Z" fill="#e0e0e0"/>
        {/* Sol ÖN KAPI CAMI */}
        <path d="M135 305 L195 305 L195 360 L135 360 Z" fill="#b8d4e8" stroke="#666" strokeWidth="1"/>

        {/* Sağ ÖN KAPI */}
        <path className="part" d="M380 290 L300 290 L300 410 Q350 410 380 380 Z" fill="#e0e0e0"/>
        {/* Sağ ÖN KAPI CAMI */}
        <path d="M365 305 L305 305 L305 360 L365 360 Z" fill="#b8d4e8" stroke="#666" strokeWidth="1"/>

        {/* Sol ARKA KAPI (sol orta alt) */}
        <path className="part" d="M120 410 L200 410 L200 540 Q150 540 120 510 Z" fill="#e0e0e0"/>
        {/* Sol ARKA KAPI CAMI */}
        <path d="M135 425 L195 425 L195 490 L135 490 Z" fill="#b8d4e8" stroke="#666" strokeWidth="1"/>

        {/* Sağ ARKA KAPI */}
        <path className="part" d="M380 410 L300 410 L300 540 Q350 540 380 510 Z" fill="#e0e0e0"/>
        {/* Sağ ARKA KAPI CAMI */}
        <path d="M365 425 L305 425 L305 490 L365 490 Z" fill="#b8d4e8" stroke="#666" strokeWidth="1"/>

        {/* Arka tampon (en altta, U şeklinde) */}
        <path className="part" d="M150 830 Q150 870 200 870 L300 870 Q350 870 350 830 L350 800 L150 800 Z" fill="#d0d0d0"/>

        {/* === TEKERLEKLER (4 adet, yarım daire dışarıda) === */}
        <ellipse cx="120" cy="280" rx="22" ry="32" fill="#222"/>
        <ellipse cx="120" cy="280" rx="10" ry="16" fill="#666"/>
        <ellipse cx="380" cy="280" rx="22" ry="32" fill="#222"/>
        <ellipse cx="380" cy="280" rx="10" ry="16" fill="#666"/>
        <ellipse cx="120" cy="600" rx="22" ry="32" fill="#222"/>
        <ellipse cx="120" cy="600" rx="10" ry="16" fill="#666"/>
        <ellipse cx="380" cy="600" rx="22" ry="32" fill="#222"/>
        <ellipse cx="380" cy="600" rx="10" ry="16" fill="#666"/>

        {/* === ARAÇ DIŞ HAT (siluet) === */}
        <path d="M150 170 Q150 100 220 100 L280 100 Q350 100 350 170 L350 740 Q350 830 250 880 Q150 830 150 740 Z"
              fill="none" stroke="#444" strokeWidth="3"/>

      </svg>
    </div>
  );
}
