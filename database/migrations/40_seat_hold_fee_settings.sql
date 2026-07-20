-- =====================================================
-- Migration 40: seat_hold_fee ayarı + withdrawals desteği
-- arabamabak - Masa bloke ücreti ayarı
-- =====================================================
-- Bu migration:
--   1) site_settings.seat_hold_fee (masa bloke ücreti)
--   2) site_settings.auction_seller_auto_approval_hours (24 saat)
--   3) transactions tablosuna iban ekle (withdraw için)
-- =====================================================

-- =====================================================
-- 1) SITE_SETTINGS - seat_hold_fee
-- =====================================================
do $$ begin
  alter table public.site_settings add column if not exists seat_hold_fee numeric(10,2) default 500;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.site_settings add column if not exists auction_seller_auto_approval_hours int default 24;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.site_settings add column if not exists bank_transfer_enabled boolean default true;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 2) TRANSACTIONS - iban + withdrawal_account_name (para çekme)
-- =====================================================
do $$ begin
  alter table public.transactions add column if not exists iban text;
exception when duplicate_column then null; end $$;

do $$ begin
  alter table public.transactions add column if not exists withdrawal_account_name text;
exception when duplicate_column then null; end $$;

-- =====================================================
-- 3) RPC: approve_withdrawal
-- Admin para çekme talebini onaylar
-- =====================================================
create or replace function public.approve_withdrawal(
  p_transaction_id uuid,
  p_approve boolean
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin uuid := auth.uid();
  v_tx record;
  v_user_balance numeric;
begin
  -- Admin kontrol
  if not public.is_admin(v_admin) then
    raise exception 'Sadece admin onaylayabilir';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Islem bulunamadi'; end if;
  if v_tx.type <> 'withdraw' then raise exception 'Bu bir para cekme islemi degil'; end if;
  if v_tx.status <> 'pending' then raise exception 'Islem zaten islendi'; end if;

  if p_approve then
    -- Bakiyeyi dus
    select wallet_balance into v_user_balance from public.profiles where id = v_tx.user_id;
    if v_user_balance < v_tx.amount then
      raise exception 'Yetersiz bakiye';
    end if;
    update public.profiles set wallet_balance = wallet_balance - v_tx.amount
      where id = v_tx.user_id;

    update public.transactions
    set status = 'completed',
        completed_at = now(),
        balance_after = v_user_balance - v_tx.amount
    where id = p_transaction_id;
  else
    -- Reddet: bakiye degismez, sadece status
    update public.transactions
    set status = 'rejected',
        completed_at = now()
    where id = p_transaction_id;
  end if;

  return json_build_object('success', true, 'approved', p_approve);
end $$;

grant execute on function public.approve_withdrawal(uuid, boolean) to authenticated;

-- =====================================================
-- 4) RPC: approve_bank_deposit
-- Admin banka havalesi ile yapılan bakiye yüklemeyi onaylar
-- =====================================================
create or replace function public.approve_bank_deposit(
  p_transaction_id uuid,
  p_approve boolean
)
returns json
language plpgsql
security definer
as $$
declare
  v_admin uuid := auth.uid();
  v_tx record;
  v_user_balance numeric;
begin
  if not public.is_admin(v_admin) then
    raise exception 'Sadece admin onaylayabilir';
  end if;

  select * into v_tx from public.transactions where id = p_transaction_id for update;
  if not found then raise exception 'Islem bulunamadi'; end if;
  if v_tx.type <> 'deposit' then raise exception 'Bu bir bakiye yukleme degil'; end if;
  if v_tx.payment_method <> 'bank_transfer' then raise exception 'Bu banka havalesi degil'; end if;
  if v_tx.status <> 'pending' then raise exception 'Islem zaten islendi'; end if;

  if p_approve then
    select wallet_balance into v_user_balance from public.profiles where id = v_tx.user_id;

    update public.profiles set wallet_balance = wallet_balance + v_tx.amount
      where id = v_tx.user_id;

    update public.transactions
    set status = 'completed',
        completed_at = now(),
        balance_after = v_user_balance + v_tx.amount
    where id = p_transaction_id;
  else
    update public.transactions
    set status = 'rejected',
        completed_at = now()
    where id = p_transaction_id;
  end if;

  return json_build_object('success', true, 'approved', p_approve);
end $$;

grant execute on function public.approve_bank_deposit(uuid, boolean) to authenticated;
