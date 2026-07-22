import { useState, useRef, useEffect } from 'react';
import { Share2, MessageCircle, Twitter, Instagram as InstagramIcon, Facebook, Link2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShareButtonProps {
  url: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon';
  className?: string;
}

export default function ShareButton({
  url,
  title,
  size = 'md',
  variant = 'button',
  className,
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = {
    whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    twitter: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
  };

  function openInNewTab(href: string) {
    window.open(href, '_blank', 'noopener,noreferrer,width=600,height=500');
    setOpen(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
    setOpen(false);
  }

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }[size];

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className={cn(
          'inline-flex items-center gap-1.5 transition-all',
          variant === 'button' && 'px-3 py-1.5 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-600 hover:text-sky-600',
          variant === 'icon' && 'p-1.5 rounded-full text-slate-400 hover:text-sky-600 hover:bg-sky-50',
          className
        )}
        title="Paylaş"
        aria-label="Paylaş"
        aria-expanded={open}
      >
        <Share2 className={sizeClasses} />
        {variant === 'button' && <span className="text-xs font-medium">Paylaş</span>}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-slate-200 p-1 min-w-[180px]">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInNewTab(shareLinks.whatsapp); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
          >
            <MessageCircle className="h-4 w-4 text-emerald-500" />
            <span>WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInNewTab(shareLinks.twitter); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
          >
            <Twitter className="h-4 w-4 text-slate-900" />
            <span>X (Twitter)</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyLink(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
          >
            <InstagramIcon className="h-4 w-4 text-pink-500" />
            <span>Instagram {copied && '(kopyalandı)'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInNewTab(shareLinks.facebook); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
          >
            <Facebook className="h-4 w-4 text-blue-600" />
            <span>Facebook</span>
          </button>
          <div className="border-t border-slate-100 my-1" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyLink(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-slate-50 text-sm text-slate-700"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Link Kopyalandı!</span>
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4 text-slate-500" />
                <span>Linki Kopyala</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
