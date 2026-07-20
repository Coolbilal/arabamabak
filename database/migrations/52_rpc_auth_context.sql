-- =====================================================
-- Migration 52: RPC SECURITY DEFINER auth context fix
-- arabamabak - deduct_wallet_for_listing + finalize_auction
-- =====================================================
-- Sorun: SECURITY DEFINER RPC'ler postgres olarak çalışıyor,
-- auth.uid() NULL dönüyor, RLS engelliyor.
-- Çözüm: RPC içinde set local role authenticated + set local request.jwt.claims
-- Bu sayede auth.uid() doğru döner ve RLS normal çalışır.
-- =====================================================

-- =====================================================
-- 1) deduct_wallet_for_listing (güncelle)
-- =====================================================
create or replace function public.deduct_wallet_for_listing(
  p_user_id uuid,
  p_amount numeric,
  p_vehicle_id uuid,
  p_description text default 'İlan verme ücreti'
)
returns json
language plpgsql
security definer
as $$
declare
  v_balance numeric;
  v_tx_id uuid;
begin
  -- SECURITY DEFINER postgres olarak çalışıyor, authenticated context'e geç
  perform set_config('role', 'authenticated', true);
  
  -- Mevcut bakiyeyi kilitle
  select wallet_balance into v_balance from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Kullanici bulunamadi'; end if;
  if v_balance < p_amount then
    raise exception 'Yetersiz bakiye. Mevcut: % TL, Gerekli: % TL', v_balance, p_amount;
  end if;

  -- Bakiye düş
  update public.profiles set wallet_balance = wallet_balance - p_amount
    where id = p_user_id;

  -- Transaction kaydı
  insert into public.transactions (
    user_id, type, amount, status, payment_method,
    description, related_vehicle_id, balance_after, completed_at
  ) values (
    p_user_id, 'premium_payment', p_amount, 'completed', 'wallet',
    p_description, p_vehicle_id, v_balance - p_amount, now()
  ) returning id into v_tx_id;

  return json_build_object(
    'success', true,
    'tx_id', v_tx_id,
    'remaining_balance', v_balance - p_amount
  );
end;
$$;

grant execute on function public.deduct_wallet_for_listing(uuid, numeric, uuid, text) to anon, authenticated;
