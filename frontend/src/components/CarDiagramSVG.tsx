export default function CarDiagramSVG() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 900">
      <path id="body" className="body" fill="#f5f5f5" stroke="#444" strokeWidth="3" strokeLinejoin="round" d="M 150 90 C 150 70 180 60 250 60 C 320 60 350 70 350 90 C 370 140 380 200 385 280 C 392 360 395 440 395 520 C 395 580 392 640 385 700 C 380 760 370 810 350 820 C 320 835 280 840 250 840 C 220 840 180 835 150 820 C 130 810 120 760 115 700 C 108 640 105 580 105 520 C 105 440 108 360 115 280 C 120 200 130 140 150 90 Z"/>
      <path id="hood" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 180 130 C 180 115 200 108 250 108 C 300 108 320 115 320 130 C 330 175 338 220 340 265 C 320 275 290 280 250 280 C 210 280 180 275 160 265 C 162 220 170 175 180 130 Z"/>
      <path id="roof" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 170 305 C 170 295 195 290 250 290 C 305 290 330 295 330 305 C 345 380 350 460 350 540 C 350 555 325 565 250 565 C 175 565 150 555 150 540 C 150 460 155 380 170 305 Z"/>
      <path id="trunk" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 160 595 C 175 590 215 588 250 588 C 285 588 325 590 340 595 C 338 645 332 700 325 740 C 320 760 300 770 250 770 C 200 770 180 760 175 740 C 168 700 162 645 160 595 Z"/>
      <path id="leftDoor" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 130 295 C 130 285 138 282 148 282 C 155 285 158 295 158 310 C 156 380 155 460 155 540 C 155 555 152 565 145 567 C 135 567 130 562 130 550 C 128 460 128 380 130 310 C 130 305 130 300 130 295 Z M 138 420 C 134 418 132 422 132 428 C 132 434 134 438 138 436 C 142 434 142 422 138 420 Z"/>
      <path id="rightDoor" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 370 295 C 370 285 362 282 352 282 C 345 285 342 295 342 310 C 344 380 345 460 345 540 C 345 555 348 565 355 567 C 365 567 370 562 370 550 C 372 460 372 380 370 310 C 370 305 370 300 370 295 Z M 362 420 C 366 418 368 422 368 428 C 368 434 366 438 362 436 C 358 434 358 422 362 420 Z"/>
      <path id="leftFender" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 140 115 C 140 100 155 92 175 92 C 188 95 192 105 192 120 C 192 140 188 165 180 185 C 175 195 165 198 155 195 C 145 192 138 180 138 165 C 138 150 138 130 140 115 Z"/>
      <path id="rightFender" className="part" fill="#e0e0e0" stroke="#222" strokeWidth="2" strokeLinejoin="round" d="M 360 115 C 360 100 345 92 325 92 C 312 95 308 105 308 120 C 308 140 312 165 320 185 C 325 195 335 198 345 195 C 355 192 362 180 362 165 C 362 150 362 130 360 115 Z"/>
      <ellipse className="wheel" cx="135" cy="200" rx="38" ry="28" fill="#2a2a2a"/>
      <ellipse className="wheel-inner" cx="135" cy="200" rx="14" ry="10" fill="#555"/>
      <ellipse className="wheel" cx="365" cy="200" rx="38" ry="28" fill="#2a2a2a"/>
      <ellipse className="wheel-inner" cx="365" cy="200" rx="14" ry="10" fill="#555"/>
      <ellipse className="wheel" cx="135" cy="700" rx="38" ry="28" fill="#2a2a2a"/>
      <ellipse className="wheel-inner" cx="135" cy="700" rx="14" ry="10" fill="#555"/>
      <ellipse className="wheel" cx="365" cy="700" rx="38" ry="28" fill="#2a2a2a"/>
      <ellipse className="wheel-inner" cx="365" cy="700" rx="14" ry="10" fill="#555"/>
    </svg>
  );
}
