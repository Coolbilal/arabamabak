import { cn } from '../lib/utils';

export type PaintStatus = 'none' | 'original' | 'painted' | 'local_painted' | 'changed' | 'repaired';

const PARTS: { code: string; label: string; d: string }[] = [
  { code: 'front_bumper', label: 'Ön Tampon', d: 'M 175,70 C 200,55 240,50 290,48 C 340,46 390,45 400,45 C 410,45 460,46 510,48 C 560,50 600,55 625,70 C 645,82 650,100 648,118 C 645,135 635,145 615,150 C 580,158 540,160 500,160 C 470,160 455,148 440,155 C 425,162 415,178 400,178 C 385,178 375,162 360,155 C 345,148 330,160 300,160 C 260,160 220,158 185,150 C 165,145 155,135 152,118 C 150,100 155,82 175,70 Z' },
  { code: 'left_front_fender', label: 'Sol Ön Çamurluk', d: 'M 175,150 C 160,155 150,160 145,170 C 140,180 138,192 145,205 C 100,200 60,210 55,225 C 50,240 60,255 75,260 C 95,268 125,275 160,278 C 180,280 200,278 220,275 C 235,272 248,265 258,255 C 268,242 272,225 270,210 C 268,195 260,182 248,172 C 235,160 218,153 200,150 C 190,148 182,149 175,150 Z' },
  { code: 'right_front_fender', label: 'Sağ Ön Çamurluk', d: 'M 625,150 C 640,155 650,160 655,170 C 660,180 662,192 655,205 C 700,200 740,210 745,225 C 750,240 740,255 725,260 C 705,268 675,275 640,278 C 620,280 600,278 580,275 C 565,272 552,265 542,255 C 532,242 528,225 530,210 C 532,195 540,182 552,172 C 565,160 582,153 600,150 C 610,148 618,149 625,150 Z' },
  { code: 'hood', label: 'Kaput', d: 'M 270,180 C 285,170 310,165 340,163 C 365,162 380,162 400,162 C 420,162 435,162 460,163 C 490,165 515,170 530,180 C 545,195 552,220 555,250 C 557,275 555,295 550,310 C 540,325 520,335 500,340 C 470,345 430,348 400,348 C 370,348 330,345 300,340 C 280,335 260,325 250,310 C 245,295 243,275 245,250 C 248,220 255,195 270,180 Z' },
  { code: 'left_front_door', label: 'Sol Ön Kapı', d: 'M 175,410 C 168,408 160,412 155,420 C 150,432 148,448 150,468 C 152,498 155,528 158,555 C 160,572 165,582 175,588 C 195,595 230,598 260,598 C 275,598 285,590 290,575 C 295,555 295,530 293,505 C 290,478 285,452 278,432 C 272,418 262,410 250,408 C 220,406 195,408 175,410 Z' },
  { code: 'right_front_door', label: 'Sağ Ön Kapı', d: 'M 625,410 C 632,408 640,412 645,420 C 650,432 652,448 650,468 C 648,498 645,528 642,555 C 640,572 635,582 625,588 C 605,595 570,598 540,598 C 525,598 515,590 510,575 C 505,555 505,530 507,505 C 510,478 515,452 522,432 C 528,418 538,410 550,408 C 580,406 605,408 625,410 Z' },
  { code: 'roof', label: 'Tavan', d: 'M 295,415 C 320,410 355,408 400,408 C 445,408 480,410 505,415 C 520,422 528,438 530,460 C 532,490 532,520 530,550 C 528,572 520,588 505,595 C 480,600 445,602 400,602 C 355,602 320,600 295,595 C 280,588 272,572 270,550 C 268,520 268,490 270,460 C 272,438 280,422 295,415 Z' },
  { code: 'left_rear_door', label: 'Sol Arka Kapı', d: 'M 178,615 C 170,613 162,617 158,625 C 153,638 152,655 155,678 C 158,705 162,732 168,755 C 172,768 180,775 192,778 C 215,782 240,784 262,782 C 275,780 285,770 290,755 C 295,735 296,712 293,688 C 290,665 285,645 278,632 C 272,622 262,615 250,613 C 220,611 195,613 178,615 Z' },
  { code: 'right_rear_door', label: 'Sağ Arka Kapı', d: 'M 622,615 C 630,613 638,617 642,625 C 647,638 648,655 645,678 C 642,705 638,732 632,755 C 628,768 620,775 608,778 C 585,782 560,784 538,782 C 525,780 515,770 510,755 C 505,735 504,712 507,688 C 510,665 515,645 522,632 C 528,622 538,615 550,613 C 580,611 605,613 622,615 Z' },
  { code: 'left_rear_fender', label: 'Sol Arka Çamurluk', d: 'M 185,790 C 170,792 158,800 150,812 C 142,825 138,842 142,858 C 100,862 62,872 58,888 C 55,905 68,918 85,922 C 110,928 145,932 180,932 C 200,932 218,928 232,920 C 245,910 252,895 255,878 C 258,860 255,842 248,828 C 240,812 225,800 208,793 C 200,790 192,789 185,790 Z' },
  { code: 'right_rear_fender', label: 'Sağ Arka Çamurluk', d: 'M 615,790 C 630,792 642,800 650,812 C 658,825 662,842 658,858 C 700,862 738,872 742,888 C 745,905 732,918 715,922 C 690,928 655,932 620,932 C 600,932 582,928 568,920 C 555,910 548,895 545,878 C 542,860 545,842 552,828 C 560,812 575,800 592,793 C 600,790 608,789 615,790 Z' },
  { code: 'trunk', label: 'Bagaj', d: 'M 270,665 C 290,658 320,655 360,654 C 380,653 395,653 400,653 C 405,653 420,653 440,654 C 480,655 510,658 530,665 C 545,680 552,705 555,735 C 557,760 555,780 548,795 C 535,808 515,815 490,818 C 460,822 425,824 400,824 C 375,824 340,822 310,818 C 285,815 265,808 252,795 C 245,780 243,760 245,735 C 248,705 255,680 270,665 Z' },
  { code: 'rear_bumper', label: 'Arka Tampon', d: 'M 175,930 C 200,945 240,950 290,952 C 340,954 390,955 400,955 C 410,955 460,954 510,952 C 560,950 600,945 625,930 C 645,918 650,900 648,882 C 645,865 635,855 615,850 C 580,842 540,840 500,840 C 470,840 455,852 440,845 C 425,838 415,822 400,822 C 385,822 375,838 360,845 C 345,852 330,840 300,840 C 260,840 220,842 185,850 C 165,855 155,865 152,882 C 150,900 155,918 175,930 Z' }
];

const STATUS_META: Record<PaintStatus, { label: string; color: string; pattern?: 'stripes' }> = {
  none: { label: 'Belirtilmemiş', color: 'transparent' },
  original: { label: 'Orijinal', color: 'rgba(16, 185, 129, 0.55)' },
  painted: { label: 'Boyalı', color: 'rgba(250, 204, 21, 0.6)' },
  local_painted: { label: 'Lokal Boyalı', color: 'rgba(253, 230, 138, 0.7)', pattern: 'stripes' },
  changed: { label: 'Değişen', color: 'rgba(239, 68, 68, 0.6)' },
  repaired: { label: 'Tamir', color: 'rgba(59, 130, 246, 0.6)' },
};

type Props = {
  value: Record<string, PaintStatus>;
  onChange: (v: Record<string, PaintStatus>) => void;
  width?: number;
  readOnly?: boolean;
};

export default function CarDiagramSVG({ value, onChange, width = 500, readOnly = false }: Props) {
  const order: PaintStatus[] = ['none', 'original', 'painted', 'local_painted', 'changed', 'repaired', 'none'];

  function cycleStatus(code: string) {
    if (readOnly) return;
    const current = value[code] ?? 'none';
    const idx = order.indexOf(current);
    const next = order[idx + 1] ?? 'none';
    onChange({ ...value, [code]: next });
  }

  return (
    <svg
      viewBox="0 0 800 1000"
      width={width}
      height={width * (1000 / 800)}
      className="select-none"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      <defs>
        <pattern id="stripes-pattern" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">
          <rect width="14" height="14" fill="rgba(253, 230, 138, 0.5)" />
          <line x1="0" y1="0" x2="0" y2="14" stroke="rgba(202, 138, 4, 0.7)" strokeWidth="6" />
        </pattern>
      </defs>

      <rect x="0" y="0" width="800" height="1000" fill="#f8fafc" />

      {/* TEKERLEKLER */}
      <ellipse cx="55" cy="185" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="185" rx="20" ry="32" fill="#475569" />
      <ellipse cx="745" cy="185" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="185" rx="20" ry="32" fill="#475569" />
      <ellipse cx="55" cy="820" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="55" cy="820" rx="20" ry="32" fill="#475569" />
      <ellipse cx="745" cy="820" rx="40" ry="60" fill="#1e293b" />
      <ellipse cx="745" cy="820" rx="20" ry="32" fill="#475569" />

      {/* PARÇALAR */}
      {PARTS.map((part) => {
        const status = value[part.code] ?? 'none';
        const meta = STATUS_META[status];
        const baseFill = '#e2e8f0';
        const fillColor = status === 'none' ? baseFill :
                          status === 'local_painted' ? 'url(#stripes-pattern)' :
                          meta.color;
        return (
          <path
            key={part.code}
            d={part.d}
            fill={fillColor}
            stroke="#475569"
            strokeWidth="3"
            strokeLinejoin="round"
            className={cn(
              'transition-all duration-200',
              !readOnly && 'cursor-pointer hover:brightness-95'
            )}
            onClick={() => cycleStatus(part.code)}
          >
            <title>{part.label}</title>
          </path>
        );
      })}
    </svg>
  );
}

export { STATUS_META, PARTS as DIAGRAM_PARTS };
