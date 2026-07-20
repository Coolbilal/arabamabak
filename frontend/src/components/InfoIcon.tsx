import type { ReactElement } from 'react';

type Props = {
  icon: string | null;
  className?: string;
  size?: number;
};

// Özel SVG ikonlar (Unicode'da olmayanlar)
const SVG_ICONS: Record<string, ReactElement> = {
  gavel: (
    <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      {/* Çekiç kafası + sapı */}
      <path d="M2 21h12v-2H4.5c-.3 0-.5.2-.5.5V21zm17-9.7l-1.4 1.4-3.5-3.5 1.4-1.4c.4-.4 1-.4 1.4 0l2.1 2.1c.4.4.4 1 0 1.4zM9 7.4L13.6 12 8 17.6 3.4 13 9 7.4zm6.6 4.6L18 14.4 13.4 19 11 16.6l4.6-4.6z" />
    </svg>
  ),
};

export default function InfoIcon({ icon, className = '', size }: Props) {
  if (!icon) return null;

  // Özel SVG ikonu varsa onu render et
  if (SVG_ICONS[icon.toLowerCase()]) {
    return (
      <span
        className={className}
        style={size ? { width: size, height: size, display: 'inline-block' } : undefined}
      >
        {SVG_ICONS[icon.toLowerCase()]}
      </span>
    );
  }

  // Yoksa emoji gibi text render et
  return <span className={className}>{icon}</span>;
}
