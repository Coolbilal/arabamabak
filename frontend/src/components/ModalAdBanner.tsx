import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { X } from 'lucide-react';

type AdBannerItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
};

const STORAGE_PREFIX = 'modal_ad_seen_';
// 1 günde 1 kere göster
const SHOW_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Sayfa açılışında modal popup reklam gösterir.
 * - 1 günde 1 kere gösterilir (localStorage ile)
 * - ESC veya overlay tıklaması ile kapanır
 * - X butonu sağ üstte
 * - Banner görseli tıklanabilir
 */
export default function ModalAdBanner() {
  const [open, setOpen] = useState(false);
  const [impressionTracked, setImpressionTracked] = useState<string | null>(null);

  const bannerQ = useQuery({
    queryKey: ['modal-ad-banner'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('id, title, description, image_url, link_url')
        .eq('is_active', true)
        .eq('display_position', 'modal_popup')
        .order('display_order', { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? []) as AdBannerItem[])[0] ?? null;
    },
  });

  const banner = bannerQ.data;

  // Modal açma kontrolü (banner gelince + bugün gördüm mü kontrolü)
  useEffect(() => {
    if (!banner || open) return;

    const storageKey = STORAGE_PREFIX + banner.id;
    const lastSeen = localStorage.getItem(storageKey);
    const now = Date.now();

    if (lastSeen) {
      const lastSeenTime = Number(lastSeen);
      if (now - lastSeenTime < SHOW_INTERVAL_MS) {
        return; // Bugün zaten gördü
      }
    }

    // 500ms sonra aç (sayfa yüklendikten sonra)
    const timer = setTimeout(() => setOpen(true), 500);
    return () => clearTimeout(timer);
  }, [banner, open]);

  // Görüntülenme kaydet (1 kere)
  useEffect(() => {
    if (open && banner && impressionTracked !== banner.id) {
      setImpressionTracked(banner.id);
      (async () => {
        try {
          await supabase.rpc('track_ad_impression', { p_banner_id: banner.id });
        } catch {
          // sessizce yoksay
        }
      })();
    }
  }, [open, banner, impressionTracked]);

  // ESC tuşu
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Banner yoksa hiçbir şey gösterme
  if (!banner) return null;

  function handleClose() {
    setOpen(false);
    if (banner) {
      localStorage.setItem(STORAGE_PREFIX + banner.id, String(Date.now()));
    }
  }

  function handleClick() {
    (async () => {
      try {
        await supabase.rpc('track_ad_click', { p_banner_id: banner.id });
      } catch {
        // sessizce yoksay
      }
    })();
  }

  if (!open) return null;

  // Modal içeriği
  const img = (
    <img
      src={banner.image_url}
      alt={banner.title}
      className="block w-full h-auto max-h-[70vh] object-contain rounded-lg"
    />
  );

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="relative max-w-3xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Kapatma butonu */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute -top-3 -right-3 z-10 rounded-full bg-white p-2 shadow-lg hover:bg-slate-100 transition"
          aria-label="Kapat"
        >
          <X className="h-5 w-5 text-slate-700" />
        </button>

        {/* Banner içeriği */}
        <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
          {banner.link_url ? (
            <a
              href={banner.link_url}
              onClick={handleClick}
              className="block"
            >
              {img}
            </a>
          ) : (
            img
          )}

          {/* Başlık + açıklama (varsa) */}
          {(banner.title || banner.description) && (
            <div className="px-4 py-3 border-t border-slate-100">
              {banner.title && (
                <div className="font-bold text-slate-800">{banner.title}</div>
              )}
              {banner.description && (
                <div className="text-sm text-slate-600 mt-1">{banner.description}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
