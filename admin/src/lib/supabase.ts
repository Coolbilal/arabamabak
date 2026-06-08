import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// arabamabak - Yeni Supabase projesi (v2)
export const SUPABASE_URL = '{{ARCHON_SECRET:SUPABASE_URL}}';
export const SUPABASE_ANON_KEY = '{{ARCHON_SECRET:SUPABASE_ANON_KEY}}';

export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

// Storage bucket'lar (alfabetik sıralı)
export const BUCKETS = {
  AD_CREATIVES: 'ad-creatives',
  AVATARS: 'avatars',
  CATEGORY_ICONS: 'category-icons',
  DEALERSHIP_LOGOS: 'dealership-logos',
  EXPERTISE_REPORTS: 'expertise-reports',
  SITE_ASSETS: 'site-assets',
  VEHICLE_IMAGES: 'vehicle-images',
} as const;

export type BucketName = typeof BUCKETS[keyof typeof BUCKETS];

export function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
