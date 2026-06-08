import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const SUPABASE_URL = 'https://cvfoufneshgqebynbxsc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2Zm91Zm5lc2hncWVieW5ieHNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MTQ1MzgsImV4cCI6MjA5NTk5MDUzOH0.taTlHNXBJLzH2UFUKBckgZu4YfYbYtp6fBzXjFZOwsw';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export function publicUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}
