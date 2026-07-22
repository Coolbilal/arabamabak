import { useState, useRef, useEffect } from 'react';
import { Share2, MessageCircle, Link2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

interface ShareButtonProps {
  url: string;
  title: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon';
  className?: string;
}

// Lucide v1.17'de Twitter/Instagram/Facebook yok, şık inline SVG kullanıyoruz
// Daire arka plan + renkli ikon (official marka renkleri)
function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FDD835"/>
          <stop offset="25%" stopColor="#FB8C00"/>
          <stop offset="50%" stopColor="#E53935"/>
          <stop offset="75%" stopColor="#C2185B"/>
          <stop offset="100%" stopColor="#8E24AA"/>
        </linearGradient>
      </defs>
      <path fill="url(#ig-grad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
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
        <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-xl shadow-2xl border border-slate-200 p-2 min-w-[200px]">
          <div className="text-[10px] font-semibold uppercase text-slate-400 px-2 py-1.5 tracking-wider">Sosyal Medyada Paylaş</div>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInNewTab(shareLinks.whatsapp); }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-emerald-50 transition text-sm text-slate-700"
          >
            <span className="h-8 w-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm">
              <MessageCircle className="h-4 w-4 text-white" />
            </span>
            <span className="font-medium">WhatsApp</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInNewTab(shareLinks.twitter); }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition text-sm text-slate-700"
          >
            <span className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center shrink-0 shadow-sm">
              <XIcon className="h-4 w-4 text-white" />
            </span>
            <span className="font-medium">X (Twitter)</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyLink(); }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-pink-50 transition text-sm text-slate-700"
          >
            <span className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm" style={{ background: 'linear-gradient(45deg, #FDD835, #FB8C00, #E53935, #C2185B, #8E24AA)' }}>
              <InstagramIcon className="h-4 w-4 text-white" />
            </span>
            <span className="font-medium">Instagram {copied && '✓'}</span>
          </button>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openInNewTab(shareLinks.facebook); }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-blue-50 transition text-sm text-slate-700"
          >
            <span className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-sm">
              <FacebookIcon className="h-4 w-4 text-white" />
            </span>
            <span className="font-medium">Facebook</span>
          </button>
          <div className="border-t border-slate-100 my-1.5" />
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); copyLink(); }}
            className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-100 transition text-sm text-slate-700"
          >
            <span className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
              {copied ? (
                <Check className="h-4 w-4 text-emerald-500" />
              ) : (
                <Link2 className="h-4 w-4 text-slate-500" />
              )}
            </span>
            <span className="font-medium">{copied ? 'Link Kopyalandı!' : 'Linki Kopyala'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
