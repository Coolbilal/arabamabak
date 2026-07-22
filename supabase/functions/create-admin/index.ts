// Supabase Edge Function: create-admin
// Super admin tarafından yeni admin oluşturmak için kullanılır
// Service role key ile çalışır, signIn oluşturmaz (session açmaz)
//
// Kullanım:
// POST /functions/v1/create-admin
// Headers: Authorization: Bearer <SUPABASE_ANON_KEY>
// Body: { email, password, full_name, custom_role }
//
// Yetki kontrolü: Çağıran admin'in is_super_admin=true olması gerekir

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateAdminPayload {
  email: string;
  password: string;
  full_name: string;
  custom_role?: string;
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    // 1) Yetki kontrolü: çağıran admin super admin mi?
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Authorization header gerekli' }, 401);
    }

    // Kullanıcı (super admin) client
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: { user: callerUser }, error: callerErr } = await userClient.auth.getUser();
    if (callerErr || !callerUser) {
      return jsonResponse({ error: 'Geçersiz oturum' }, 401);
    }

    // Çağıran admin'in is_super_admin olup olmadığını kontrol et
    const { data: callerAdmin, error: callerAdminErr } = await userClient
      .from('admin_users')
      .select('id, is_super_admin, is_active')
      .eq('user_id', callerUser.id)
      .maybeSingle();

    if (callerAdminErr) {
      return jsonResponse({ error: 'Admin kontrolü başarısız: ' + callerAdminErr.message }, 500);
    }
    if (!callerAdmin || !callerAdmin.is_super_admin || !callerAdmin.is_active) {
      return jsonResponse({ error: 'Sadece süper admin yeni admin oluşturabilir' }, 403);
    }

    // 2) Payload parse
    const payload: CreateAdminPayload = await req.json();
    if (!payload.email || !payload.password || !payload.full_name) {
      return jsonResponse({ error: 'email, password, full_name zorunlu' }, 400);
    }

    const email = payload.email.trim().toLowerCase();
    if (!email.includes('@')) {
      return jsonResponse({ error: 'Geçersiz email formatı' }, 400);
    }

    // 3) Service role ile auth user oluştur (signIn oluşturmaz)
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: createdUser, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,  // email confirmation otomatik onaylı
      user_metadata: { full_name: payload.full_name },
    });

    if (createErr) {
      // Email zaten varsa
      if (createErr.message?.toLowerCase().includes('already') ||
          createErr.message?.toLowerCase().includes('exists')) {
        // Mevcut user'ı bul
        const { data: { users }, error: listErr } = await adminClient.auth.admin.listUsers();
        if (listErr) {
          return jsonResponse({ error: 'Email zaten kullanımda ve user bulunamadı' }, 400);
        }
        const existing = users.find((u: any) => u.email === email);
        if (existing) {
          // admin_users'ta zaten var mı?
          const { data: existingAdmin } = await adminClient
            .from('admin_users')
            .select('id')
            .eq('user_id', existing.id)
            .maybeSingle();
          if (existingAdmin) {
            return jsonResponse({ error: 'Bu email için admin kaydı zaten var' }, 400);
          }
          // admin_users'a ekle
          const { data: newAdmin, error: insErr } = await adminClient
            .from('admin_users')
            .insert({
              user_id: existing.id,
              username: email,
              full_name: payload.full_name.trim(),
              email,
              is_active: true,
              is_super_admin: false,
              created_by: callerAdmin.id,
              custom_role: payload.custom_role?.trim() || null,
              must_change_password: true,
            })
            .select()
            .single();
          if (insErr) {
            return jsonResponse({ error: 'admin_users insert hatası: ' + insErr.message }, 500);
          }
          return jsonResponse({ success: true, admin: newAdmin, message: 'Mevcut user admin_users\'a eklendi' });
        }
        return jsonResponse({ error: 'Email zaten kullanımda' }, 400);
      }
      return jsonResponse({ error: 'User oluşturulamadı: ' + createErr.message }, 500);
    }

    const newUserId = createdUser.user?.id;
    if (!newUserId) {
      return jsonResponse({ error: 'User oluşturuldu ama id alınamadı' }, 500);
    }

    // 4) admin_users satırı ekle
    const { data: newAdmin, error: insErr } = await adminClient
      .from('admin_users')
      .insert({
        user_id: newUserId,
        username: email,
        full_name: payload.full_name.trim(),
        email,
        is_active: true,
        is_super_admin: false,
        created_by: callerAdmin.id,
        custom_role: payload.custom_role?.trim() || null,
        must_change_password: true,
      })
      .select()
      .single();

    if (insErr) {
      return jsonResponse({ error: 'admin_users insert hatası: ' + insErr.message }, 500);
    }

    return jsonResponse({ success: true, admin: newAdmin });
  } catch (e) {
    return jsonResponse({ error: 'Beklenmeyen hata: ' + (e as Error).message }, 500);
  }
});

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
