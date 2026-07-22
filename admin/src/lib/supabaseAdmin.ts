import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

const SERVICE_ROLE_KEY = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string) || '';

if (!SERVICE_ROLE_KEY) {
  console.warn('supabaseAdmin: SERVICE_ROLE_KEY Vercel env\'de tanımlı değil, anon key fallback kullanılıyor');
}

// Service role key ile supabase admin client (signIn oluşturmaz, RLS bypass eder)
// UYARI: Bu key frontend bundle'ında görünür (VITE_ prefix). 
// Sadece admin panel gibi güvenli ortamlarda kullan.
export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY || SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
