import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Service role client - SADECE admin tarafında kullanılır
// RLS'yi bypass eder, sadece admin panele giriş yapmış kullanıcılar tarafından kullanılmalı
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
const SERVICE_ROLE_KEY = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string) || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn('supabaseAdmin: VITE_SUPABASE_URL veya VITE_SUPABASE_SERVICE_ROLE_KEY eksik!');
}

export const supabaseAdmin = createClient<any>(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
