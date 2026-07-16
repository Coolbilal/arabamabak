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
 * İlan detay sayfasında, iletişim bilgileri altında gösterilen reklam banner'ı.
 * display_position = 'vehicle_detail_inline'
 */
export default function VehicleDetailAdBanner() {
  const [impressionTracked, setImpressionTracked] = useState<string | null>(null);

  const bannerQ = useQuery({
    queryKey: ['vehicle-detail-ad-banner'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_banners')
        .select('id, title, description, image_url, link_url')
        .eq('is_active', true)
        .eq('display_position', 'vehicle_detail_inline')
        .order('display_order', { ascending: true })
        .limit(1);
      if (error) throw error;
      return ((data ?? []) as AdBannerItem[])[0] ?? null;
    },
  });

  const banner = bannerQ.data;

  // Görüntülenme kaydet (1 kere)
  useEffect(() => {
    if (banner && impressionTracked !== banner.id) {
      setImpressionTracked(banner.id);
      (async () => {
        try {
          await supabase.rpc('track_ad_impression', { p_banner_id: banner.id });
        } catch {
          // sessizce yoksay
        }
      })();
    }
  }, [banner, impressionTracked]);

  if (!banner) return null;

  function handleClick() {
    if (!banner) return;
    (async () => {
      try {
        await supabase.rpc('track_ad_click', { p_banner_id: banner.id });
      } catch {
        // sessizce yoksay
      }
    })();
  }

  // Banner görseli — sabit oran, responsive
  const img = (
    <img
      src={banner.image_url}
      alt={banner.title}
      className="block w-full h-auto max-h-40 object-cover rounded-md"
    />
  );

  return (
    <div className="mt-4">
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
      {(banner.title || banner.description) && (
        <div className="mt-2 px-1">
          {banner.title && (
            <div className="text-sm font-bold text-slate-800">{banner.title}</div>
          )}
          {banner.description && (
            <div className="text-xs text-slate-600 mt-0.5">{banner.description}</div>
          )}
        </div>
      )}
    </div>
  );
}
