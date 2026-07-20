export default function CarDiagramSVG() {
  return (
    <svg viewBox="0 0 500 900" xmlns="http://www.w3.org/2000/svg">
      {/* === GERÇEK SEDAN ARABA - ÜSTTEN GÖRÜNÜM === */}
      {/* viewBox 500x900, dikey, ön üstte, arka altta */}

      {/* === BODY SİLÜETİ (gövde dış hat) === */}
      <path
        d="M 130 200 C 130 130 180 110 250 110 C 320 110 370 130 370 200
           L 370 700 C 370 770 320 790 250 790 C 180 790 130 770 130 700 Z"
        fill="#f5f5f5" stroke="#444" strokeWidth="3" />

      {/* === ÖN TAMPON (en üst, ince) === */}
      <path
        d="M 145 110 L 355 110 C 360 110 365 115 365 120 L 365 165 C 365 175 360 180 355 180 L 145 180 C 140 180 135 175 135 165 L 135 120 C 135 115 140 110 145 110 Z"
        fill="#d0d0d0" stroke="#222" strokeWidth="2" />

      {/* === SOL ÖN ÇAMURLUK (tekerlek yuvası ile) === */}
      <path
        d="M 95 220 C 95 200 110 185 135 180 L 165 180 L 165 320 C 145 320 130 320 115 320 C 100 320 90 310 90 290 L 90 240 C 90 230 92 225 95 220 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === SAĞ ÖN ÇAMURLUK === */}
      <path
        d="M 405 220 C 405 200 390 185 365 180 L 335 180 L 335 320 C 355 320 370 320 385 320 C 400 320 410 310 410 290 L 410 240 C 410 230 408 225 405 220 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === KAPUT (ön üst, dikdörtgen) === */}
      <path
        d="M 165 180 L 335 180 L 335 320 L 165 320 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === ÖN CAM (kaput-tavan arası, parabolik trapez) === */}
      <path
        d="M 180 320 L 320 320 L 305 360 L 195 360 Z"
        fill="#9bb8d0" stroke="#444" strokeWidth="1.5" />

      {/* === SOL ÖN KAPI (orta-sol üst, pencereli) === */}
      <path
        d="M 95 360 C 95 350 105 345 115 345 L 165 345 L 165 510 C 145 510 130 510 115 510 C 100 510 90 500 90 480 L 90 380 C 90 370 92 365 95 360 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />
      <path
        d="M 105 365 L 158 365 L 158 445 L 105 445 Z"
        fill="#9bb8d0" stroke="#444" strokeWidth="1" />

      {/* === SAĞ ÖN KAPI === */}
      <path
        d="M 405 360 C 405 350 395 345 385 345 L 335 345 L 335 510 C 355 510 370 510 385 510 C 400 510 410 500 410 480 L 410 380 C 410 370 408 365 405 360 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />
      <path
        d="M 395 365 L 342 365 L 342 445 L 395 445 Z"
        fill="#9bb8d0" stroke="#444" strokeWidth="1" />

      {/* === TAVAN (en orta, büyük) === */}
      <path
        d="M 165 360 L 335 360 L 335 510 L 165 510 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === SOL ARKA KAPI (orta-sol alt, pencereli) === */}
      <path
        d="M 95 540 C 95 530 105 525 115 525 L 165 525 L 165 690 C 145 690 130 690 115 690 C 100 690 90 680 90 660 L 90 560 C 90 550 92 545 95 540 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />
      <path
        d="M 105 545 L 158 545 L 158 625 L 105 625 Z"
        fill="#9bb8d0" stroke="#444" strokeWidth="1" />

      {/* === SAĞ ARKA KAPI === */}
      <path
        d="M 405 540 C 405 530 395 525 385 525 L 335 525 L 335 690 C 355 690 370 690 385 690 C 400 690 410 680 410 660 L 410 560 C 410 550 408 545 405 540 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />
      <path
        d="M 395 545 L 342 545 L 342 625 L 395 625 Z"
        fill="#9bb8d0" stroke="#444" strokeWidth="1" />

      {/* === ARKA CAM (tavan-bagaj arası) === */}
      <path
        d="M 180 510 L 320 510 L 305 550 L 195 550 Z"
        fill="#9bb8d0" stroke="#444" strokeWidth="1.5" />

      {/* === BAGAJ (arka üst, dikdörtgen) === */}
      <path
        d="M 165 550 L 335 550 L 335 690 L 165 690 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === SOL ARKA ÇAMURLUK === */}
      <path
        d="M 95 690 L 165 690 L 165 770 C 145 770 130 770 115 770 C 100 770 90 760 90 740 L 90 720 C 90 710 92 705 95 700 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === SAĞ ARKA ÇAMURLUK === */}
      <path
        d="M 405 690 L 335 690 L 335 770 C 355 770 370 770 385 770 C 400 770 410 760 410 740 L 410 720 C 410 710 408 705 405 700 Z"
        fill="#e0e0e0" stroke="#222" strokeWidth="2" />

      {/* === ARKA TAMPON (en alt) === */}
      <path
        d="M 145 770 L 355 770 C 360 770 365 775 365 780 L 365 800 C 365 810 360 815 355 815 L 145 815 C 140 815 135 810 135 800 L 135 780 C 135 775 140 770 145 770 Z"
        fill="#d0d0d0" stroke="#222" strokeWidth="2" />

      {/* === 4 TEKERLEK (dışarıda, dikey oval) === */}
      <ellipse cx="65" cy="260" rx="22" ry="35" fill="#1a1a1a" />
      <ellipse cx="65" cy="260" rx="9" ry="14" fill="#666" />
      <ellipse cx="435" cy="260" rx="22" ry="35" fill="#1a1a1a" />
      <ellipse cx="435" cy="260" rx="9" ry="14" fill="#666" />
      <ellipse cx="65" cy="720" rx="22" ry="35" fill="#1a1a1a" />
      <ellipse cx="65" cy="720" rx="9" ry="14" fill="#666" />
      <ellipse cx="435" cy="720" rx="22" ry="35" fill="#1a1a1a" />
      <ellipse cx="435" cy="720" rx="9" ry="14" fill="#666" />
    </svg>
  );
}
