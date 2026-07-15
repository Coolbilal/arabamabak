import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Megaphone } from 'lucide-react';

type AdBannerItem = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string | null;
};

/**
 * Header'ın üstünde, ortalı, header satır genişliğinden biraz daha dar reklam alanı.
 * Sadece display_position = 'header_top' olan aktif bannerları gösterir.
 * Tek banner (en yüksek display_order).
 */
export default function HeaderTopAdBanner() {
  const [impressionTracked, setImpressionTracked] = useState<string | null>(null);

  const bannerQ = useQuery({
    queryKey: ['header-top-ad-banner'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('id, title, description, image_url, link_url')
        .eq('is_active', true)
        .eq('display_position', 'header_top')
        .order('display_order', { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? []) as AdBannerItem[])[0] ?? null;
    },
  });

  const banner = bannerQ.data;

  // Görüntülenme kaydet (sayfa açıldığında 1 kere)
  useEffect(() => {
    if (banner && impressionTracked !== banner.id) {
      setImpressionTracked(banner.id);
      // impression RPC yoksa sessizce yoksay
      (async () => {
        try {
          await supabase.rpc('track_ad_impression', { p_banner_id: banner.id });
        } catch {
          // RPC yoksa yoksay
        }
      })();
    }
  }, [banner?.id, impressionTracked]);

  // Banner yoksa hiçbir şey gösterme
  if (!banner) return null;

  // Tıklama handler
  const handleClick = () => {
    (async () => {
      try {
        await supabase.rpc('track_ad_click', { p_banner_id: banner.id });
      } catch {
        // RPC yoksa yoksay
      }
    })();
  };

  // İçerik — Link varsa link olarak, yoksa tıklanamaz
  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 shadow-sm hover:shadow-md transition">
      <Megaphone className="h-5 w-5 flex-shrink-0 text-amber-600" />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-bold text-slate-800 truncate">{banner.title}</div>
        {banner.description && (
          <div className="text-xs text-slate-600 truncate">{banner.description}</div>
        )}
      </div>
      {banner.link_url && (
        <span className="text-xs font-medium text-amber-700 hover:text-amber-900 flex-shrink-0">
          Detay →
        </span>
      )}
    </div>
  );

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200">
      <div className="mx-auto max-w-[95%] py-2">
        {banner.link_url ? (
          <a
            href={banner.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleClick}
            className="block"
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
