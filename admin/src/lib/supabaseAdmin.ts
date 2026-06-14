import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

// Geçici: supabaseAdmin artık normal supabase client'ını kullanıyor.
// Service role işlemleri (createUser, deleteUser) için Edge Function gerekiyor,
// o ileride eklenecek. Şu an admin paneli açılsın diye bu değişiklik yapıldı.
const SERVICE_ROLE_KEY = (import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string) || '';

if (!SERVICE_ROLE_KEY) {
  console.warn('supabaseAdmin: SERVICE_ROLE_KEY yok, anon key fallback kullanılıyor (Edge Function ileride eklenecek)');
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
