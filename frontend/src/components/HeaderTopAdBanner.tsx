import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

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
 * Banner görseli otomatik ölçeklenir.
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

  // Görüntülenme kaydet
  useEffect(() => {
    if (banner && impressionTracked !== banner.id) {
      setImpressionTracked(banner.id);
      (async () => {
        try {
          await supabase.rpc('track_ad_impression', { p_banner_id: banner.id });
        } catch {
          // RPC yoksa yoksay
        }
      })();
    }
  }, [banner?.id, impressionTracked]);

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

  // Banner görseli — sabit oran, header'dan 8px daha kısa (56px = 1.48 cm)
  // Sayfa genişliğinin %95'i, object-cover = alanı tamamen kaplar
  // aspect-[16/2.5] = 1280:200 oran — her banner aynı kutuya sığar
  const img = (
    <img
      src={banner.image_url}
      alt={banner.title}
      className="block w-full h-full max-h-14 object-cover rounded-md"
    />
  );

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200">
      <div className="w-full py-1">
        <div className="aspect-[16/2.5] max-h-14 w-full">
          {banner.link_url ? (
            <a
              href={banner.link_url}
              onClick={handleClick}
              className="block w-full h-full"
            >
              {img}
            </a>
          ) : (
            img
          )}
        </div>
      </div>
    </div>
  );
}
