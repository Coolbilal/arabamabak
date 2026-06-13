import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';

export interface City {
  id: string;
  name: string;
  plate_code: number;
}

export interface District {
  id: string;
  city_id: string;
  name: string;
}

/**
 * Fetches all active Turkish cities (plaka kodlarıyla birlikte).
 * Cached 1 hour.
 */
export function useCities() {
  return useQuery({
    queryKey: ['cities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cities')
        .select('id, name, plate_code')
        .order('plate_code', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as City[];
    },
    staleTime: 60 * 60_000, // 1h
  });
}

/**
 * Fetches all districts for a given city (by city name).
 * When cityName is null/undefined, returns empty list.
 */
export function useDistricts(cityName: string | null | undefined) {
  return useQuery({
    queryKey: ['districts-by-name', cityName],
    enabled: !!cityName,
    queryFn: async () => {
      // Önce ilin ID'sini bul
      const { data: city } = await supabase
        .from('cities')
        .select('id')
        .eq('name', cityName!)
        .maybeSingle();
      if (!city) return [];
      // Sonra ilçeleri getir
      const { data, error } = await supabase
        .from('districts')
        .select('id, city_id, name')
        .eq('city_id', city.id)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as District[];
    },
    staleTime: 60 * 60_000,
  });
}

/** Convenience: returns district names for a city (mostly for filter sidebar). */
export function useDistrictNames(cityName: string | null | undefined) {
  const cities = useCities();
  const cityId = cities.data?.find((c) => c.name === cityName)?.id;
  const districts = useDistricts(cityId);
  return {
    cityId,
    districts: districts.data?.map((d) => d.name) ?? [],
  };
}
/* build trigger 18:06:08 */
// trigger
