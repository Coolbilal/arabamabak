import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// arabamabak - Yeni Supabase projesi (v2)
export const SUPABASE_URL = 'https://xfcxrbnnesliflwwejwh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmY3hyYm5uZXNsaWZsd3dlandoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzgwNjcsImV4cCI6MjA5NjQxNDA2N30.vAInU00WfzRTQbie_TQdHdm92ZooZ426jh9aXSAY9vY';

export const supabase = createClient<any>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true,
  },
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

// Public URL builder
export function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

// Site URL (frontend için)
export const SITE_URL = typeof window !== 'undefined'
  ? window.location.origin
  : 'https://arabamabak.com';
