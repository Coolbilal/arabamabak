import { useQuery } from '@tanstack/react-query';
import { supabase } from '../supabase';

// Marka + Model + Motor verileri için hook'lar
// Her zaman çalışır, queryFn içinde kontrol yapar (React kurallarına uygun)

export interface Brand {
  id: string;
  name: string;
  vehicle_type: string;
  sort_order: number;
}

export interface Model {
  id: string;
  brand_id: string;
  name: string;
  sort_order: number;
}

export interface EngineSize {
  id: string;
  displacement: string;
  sort_order: number;
}

/** Markalar — otomobil/suv_pickup/elektrikli/minivan_panelvan/ticari için */
export function useBrands(vehicleType: string) {
  return useQuery({
    queryKey: ['brands-by-type', vehicleType],
    queryFn: async () => {
      if (!vehicleType) return [];
      const { data, error } = await supabase
        .from('vehicle_brands')
        .select('id, name, vehicle_type, sort_order')
        .eq('is_active', true)
        .eq('vehicle_type', vehicleType)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Brand[];
    },
  });
}

/** Markalar — motorsiklet_utv_atv için */
export function useMotorcycleBrands() {
  return useBrands('motorsiklet_utv_atv');
}

/** Modeller — seçilen marka için */
export function useModels(brandId: string) {
  return useQuery({
    queryKey: ['models-by-brand', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, brand_id, name, sort_order')
        .eq('is_active', true)
        .eq('brand_id', brandId)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Model[];
    },
  });
}

/** Motorsiklet modelleri — ayrı bir cache key ile */
export function useMotorcycleModels(brandId: string) {
  return useQuery({
    queryKey: ['moto-models-by-brand', brandId],
    queryFn: async () => {
      if (!brandId) return [];
      const { data, error } = await supabase
        .from('vehicle_models')
        .select('id, brand_id, name, sort_order')
        .eq('is_active', true)
        .eq('brand_id', brandId)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as Model[];
    },
  });
}

/** Motor hacimleri */
export function useEngineSizes() {
  return useQuery({
    queryKey: ['engine-sizes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('engine_sizes')
        .select('id, displacement, sort_order')
        .eq('is_active', true)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as EngineSize[];
    },
  });
}
