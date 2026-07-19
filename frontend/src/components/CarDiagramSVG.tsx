export default function CarDiagramSVG() {
  return (
    <div>
      <svg viewBox="0 0 400 800" xmlns="http://www.w3.org/2000/svg">

        {/* KAPUT */}
        <path d="M140 150 Q200 100 260 150 L260 260 Q200 300 140 260 Z"
              fill="#ddd" stroke="#333"/>

        {/* TAVAN */}
        <path d="M140 260 Q200 220 260 260 L260 380 Q200 420 140 380 Z"
              fill="#ddd" stroke="#333"/>

        {/* BAGAJ */}
        <path d="M140 380 Q200 420 260 380 L260 480 Q200 520 140 480 Z"
              fill="#ddd" stroke="#333"/>

        {/* SOL ÖN ÇAMURLUK */}
        <path d="M90 160 Q120 130 140 180 L140 250 Q110 260 90 220 Z"
              fill="#ddd" stroke="#333"/>

        {/* SAĞ ÖN ÇAMURLUK */}
        <path d="M310 160 Q280 130 260 180 L260 250 Q290 260 310 220 Z"
              fill="#ddd" stroke="#333"/>

        {/* SOL KAPI */}
        <path d="M100 260 L140 260 L140 380 L100 380 Q80 330 100 260 Z"
              fill="#ddd" stroke="#333"/>

        {/* SAĞ KAPI */}
        <path d="M300 260 L260 260 L260 380 L300 380 Q320 330 300 260 Z"
              fill="#ddd" stroke="#333"/>

        {/* ARAÇ DIŞ HAT */}
        <path d="M140 150 Q200 80 260 150 L260 500 Q200 580 140 500 Z"
              fill="none" stroke="#555" stroke-width="2"/>

      </svg>
    </div>
  );
}
