-- ============================================
-- Migration 65: create_admin RPC function
-- ============================================
-- Supabase auth.users'a user ekler (signIn oluşturmaz)
-- admin_users satırı ekler
-- Çağıran admin'in super admin olup olmadığını kontrol eder
-- SECURITY DEFINER: RLS bypass eder

CREATE OR REPLACE FUNCTION public.create_admin(
  p_email TEXT,
  p_password TEXT,
  p_full_name TEXT,
  p_custom_role TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_caller_id UUID;
  v_caller_is_super BOOLEAN;
  v_existing_user_id UUID;
  v_new_admin_id UUID;
BEGIN
  -- 1) Çağıran admin kontrolü
  SELECT id, is_super_admin INTO v_caller_id, v_caller_is_super
  FROM public.admin_users
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Yetkisiz: oturum bulunamadı';
  END IF;

  IF NOT v_caller_is_super THEN
    RAISE EXCEPTION 'Yetkisiz: sadece süper admin yeni admin oluşturabilir';
  END IF;

  -- 2) Mevcut user kontrolü
  SELECT id INTO v_existing_user_id
  FROM auth.users
  WHERE email = lower(p_email)
  LIMIT 1;

  IF v_existing_user_id IS NOT NULL THEN
    -- Mevcut user, admin_users'a ekle
    IF EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = v_existing_user_id) THEN
      RAISE EXCEPTION 'Bu email için admin kaydı zaten var';
    END IF;

    INSERT INTO public.admin_users (
      user_id, username, full_name, email,
      is_active, is_super_admin, created_by,
      custom_role, must_change_password
    ) VALUES (
      v_existing_user_id, lower(p_email), p_full_name, lower(p_email),
      true, false, v_caller_id,
      p_custom_role, true
    )
    RETURNING id INTO v_new_admin_id;

    RETURN json_build_object(
      'success', true,
      'admin_id', v_new_admin_id,
      'user_id', v_existing_user_id,
      'message', 'Mevcut user admin_users''a eklendi'
    );
  END IF;

  -- 3) Yeni user oluştur (auth.users)
  -- Not: encrypted_password Supabase'in kendi formatında olmalı
  -- Bu yüzden bu kısmı Supabase auth API yapacak
  RAISE EXCEPTION 'Yeni user oluşturmak için Supabase Admin API gerekiyor. Lütfen önce Supabase Dashboard > Auth > Users > Add user ile user oluşturun, sonra bu fonksiyonu admin_users eklemek için kullanın.';
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_admin TO authenticated;
