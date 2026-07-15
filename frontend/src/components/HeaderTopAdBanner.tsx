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

  // Banner görseli — sayfanın en solundan en sağına kadar yatay uzanır
  // Header satırından (max-w-7xl = 1280px) biraz daha dar olabilir (örn: %90-95)
  // max-h-24 = 96px yükseklik sınırı, object-cover = alanı tamamen kaplar (kırpılabilir)
  const img = (
    <img
      src={banner.image_url}
      alt={banner.title}
      className="block w-full h-auto max-h-24 object-cover rounded-md"
    />
  );

  return (
    <div className="w-full bg-slate-50 border-b border-slate-200">
      <div className="mx-auto w-[95%] py-2">
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
      </div>
    </div>
  );
}
