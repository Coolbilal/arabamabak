export default function CarDiagramSVG() {
  return (
    <div>
      <svg viewBox="0 0 500 900" xmlns="http://www.w3.org/2000/svg">

        <style>
          .part { stroke:#222; stroke-width:2; cursor:pointer; }
        </style>

        {/* OUTLINE */}
        <path d="M150 120 Q250 40 350 120 L370 700 Q250 820 130 700 Z"
              fill="#f5f5f5" stroke="#444" stroke-width="3"/>

        {/* HOOD */}
        <path class="part" d="M180 150 Q250 100 320 150 L310 260 Q250 300 190 260 Z" fill="#e0e0e0"/>

        {/* ROOF */}
        <path class="part" d="M180 260 Q250 220 320 260 L310 400 Q250 440 190 400 Z" fill="#e0e0e0"/>

        {/* TRUNK */}
        <path class="part" d="M180 400 Q250 440 320 400 L310 520 Q250 560 190 520 Z" fill="#e0e0e0"/>

        {/* LEFT FENDER */}
        <path class="part" d="M130 170 Q160 130 180 200 L180 260 Q150 260 130 220 Z" fill="#e0e0e0"/>

        {/* RIGHT FENDER */}
        <path class="part" d="M370 170 Q340 130 320 200 L320 260 Q350 260 370 220 Z" fill="#e0e0e0"/>

        {/* LEFT DOOR */}
        <path class="part" d="M150 260 L190 260 L190 400 L150 400 Q130 330 150 260 Z" fill="#e0e0e0"/>

        {/* RIGHT DOOR */}
        <path class="part" d="M350 260 L310 260 L310 400 L350 400 Q370 330 350 260 Z" fill="#e0e0e0"/>

        {/* WHEELS */}
        <circle cx="180" cy="720" r="35" fill="#999"/>
        <circle cx="320" cy="720" r="35" fill="#999"/>

      </svg>
    </div>
  );
}
