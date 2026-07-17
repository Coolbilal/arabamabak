// Cache bust 2026-07-18 02:50
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { AuctionStatus } from '../lib/types';

export interface AuctionFilterRow {
  id: string;
  status: AuctionStatus;
  opening_price: number;
  current_price: number;
  bid_increment: number;
  total_bids: number;
  start_at: string;
  end_at: string;
  duration_minutes: number;
  live_started_at: string | null;
  live_ends_at: string | null;
  ended_at: string | null;
  final_price: number | null;
  winner_id: string | null;
  slot_id: string | null;
  vehicle: {
    id: string;
    title: string;
    year: number;
    km: number;
    price: number;
    status: string;
    listing_type: string;
    city: string;
    district: string | null;
    fuel: string;
    transmission: string;
    body: string;
    color: string;
    damage_record: boolean;
    damage_detail: string | null;
    description: string | null;
    exchange_accepted: boolean;
    view_count: number;
    favorite_count: number;
    created_at: string;
    is_premium: boolean;
    engine_power_kw: number | null;
    brand?: { name: string; logo_url: string | null } | null;
    model?: { name: string } | null;
    engine_size?: { displacement: string } | null;
    images?: { id: string; url: string; sort_order: number }[];
    seller?: { full_name: string | null; email: string | null; phone: string | null } | null;
    winner?: { full_name: string | null; email: string | null } | null;
  } | null;
  slot?: { slot_date: string; start_time: string; end_time: string } | null;
}

const SELECT = `
  id, status, opening_price, current_price, bid_increment, total_bids,
  start_at, end_at, duration_minutes, live_started_at, live_ends_at, ended_at,
  final_price, winner_id, slot_id,
  vehicle:vehicles(
    id, title, year, km, price, status, listing_type, city, district,
    fuel, transmission, body, color, damage_record, damage_detail, description,
    exchange_accepted, view_count, favorite_count, created_at, is_premium, engine_power_kw,
    vehicle_brands!vehicles_brand_id_fkey(name, logo_url),
    vehicle_models(name),
    engine_sizes(displacement),
    profiles:seller_id(full_name, email, phone)
  ),
  slot:auction_slots(slot_date, start_time, end_time)
`;

export function useAuctionsByStatus(statuses: AuctionStatus[]) {
  return useQuery({
    queryKey: ['auctions-by-status', statuses.join(',')],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select(SELECT)
        .in('status', statuses)
        .order('start_at', { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as AuctionFilterRow[];

      // Görselleri ayrıca çek
      const ids = rows.map((r) => r.vehicle?.id).filter(Boolean) as string[];
      if (ids.length > 0) {
        const { data: imgs } = await supabase
          .from('vehicle_images')
          .select('id, vehicle_id, url, sort_order')
          .in('vehicle_id', ids)
          .order('sort_order', { ascending: true });
        const byV: Record<string, any[]> = {};
        ((imgs ?? []) as any[]).forEach((img) => {
          if (!byV[img.vehicle_id]) byV[img.vehicle_id] = [];
          byV[img.vehicle_id].push(img);
        });
        rows.forEach((r) => { if (r.vehicle) r.vehicle.images = byV[r.vehicle.id] || []; });
      }
      return rows;
    },
    refetchInterval: 5_000, // otomatik geçişleri yakala
  });
}

export function useAllAuctions() {
  return useQuery({
    queryKey: ['auctions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auctions')
        .select(SELECT)
        .order('start_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AuctionFilterRow[];
    },
  });
}

/** Manuel cron tick çağır (pg_cron yoksa bunu kullan) */
export function useTickLifecycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc('tick_auction_lifecycle');
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auctions-by-status'] });
      qc.invalidateQueries({ queryKey: ['auctions-all'] });
      qc.invalidateQueries({ queryKey: ['public-auctions'] });
    },
  });
}
