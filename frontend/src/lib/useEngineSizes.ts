import { useQuery } from '@tanstack/react-query';
import { supabase } from './supabase';
import type { EngineSize } from './types';

/** Fetches all active engine sizes (motor hacimleri). */
export function useEngineSizes() {
  return useQuery({
    queryKey: ['engine-sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engine_sizes')
        .select('id, displacement, sort_order, is_active')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as EngineSize[];
    },
    staleTime: 60 * 60_000,
  });
}
