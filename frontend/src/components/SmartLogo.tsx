import { cn } from '../lib/utils';

export type LogoSize = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

interface Props {
  src: string;
  alt: string;
  /** Header height budget. Defaults to md (40px), well under the 64px header. */
  size?: LogoSize;
  className?: string;
}

// All sizes stay <= h-16 (64px) so the logo never overflows the 64px header.
const SIZE_MAP: Record<LogoSize, string> = {
  sm:  'h-7',   // 28px
  md:  'h-9',   // 36px
  lg:  'h-11',  // 44px
  xl:  'h-14',  // 56px
  xxl: 'h-16',  // 64px
};

export default function SmartLogo({ src, alt, size = 'md', className }: Props) {
  return (
    <img
      src={`${src}${src.includes('?') ? '&' : '?'}v=${Date.now()}`}
      alt={alt}
      className={cn('w-auto object-contain transition-all', SIZE_MAP[size], className)}
    />
  );
}
