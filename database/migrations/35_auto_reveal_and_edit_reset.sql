-- =====================================================
-- Migration 35: Otomatik İletişim Açma + Düzenleme Trigger
-- arabamabak - Otomatik iletişim açma + edit reset trigger
-- =====================================================
-- Bu migration:
--   1) RPC: auto_reveal_contact_if_pending (sistematik onay)
--   2) Trigger: vehicles UPDATE -> status='pending' (admin onayına düş)
-- =====================================================

-- =====================================================
-- 1) RPC: auto_reveal_contact_if_pending
-- İlan sahibi onaylamadıysa ve mezat bittiyse,
-- belirli bir süre sonra (örn: ended_at + 24 saat)
-- sistem otomatik olarak kazanan kullanıcıya iletişim açar
-- Idempotent: sadece 1 kere çalışır
-- =====================================================
create or replace function public.auto_reveal_contact_if_pending(p_auction_id uuid)
returns json
language plpgsql
security definer
as $$
declare
  v_auction record;
  v_winner uuid;
  v_winning_bid uuid;
  v_hours_since_end numeric;
  v_auto_reveal_hours int := 24;  -- 24 saat sonra otomatik aç
begin
  select * into v_auction from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Mezat bulunamadi'; end if;

  -- Zaten onaylanmış veya reddedilmiş ise bir şey yapma
  if v_auction.contact_reveal_approved_at is not null or v_auction.seller_rejected_at is not null then
    return json_build_object('success', true, 'already_handled', true);
  end if;

  -- Mezat bitmeli
  if v_auction.status not in ('ended', 'sold_pending_confirmation') then
    return json_build_object('success', true, 'not_finished', true);
  end if;

  -- Kazanan var mı?
  v_winning_bid := v_auction.winning_bid_id;
  if v_winning_bid is null then
    return json_build_object('success', true, 'no_winner', true);
  end if;

  select bidder_id into v_winner from public.bids where id = v_winning_bid;

  -- Zaman kontrolü: ended_at + 24 saat geçti mi?
  v_hours_since_end := EXTRACT(EPOCH FROM (now() - v_auction.ended_at)) / 3600;

  if v_hours_since_end < v_auto_reveal_hours then
    return json_build_object(
      'success', true,
      'waiting', true,
      'hours_until_auto_reveal', v_auto_reveal_hours - v_hours_since_end
    );
  end if;

  -- Otomatik aç
  update public.auctions
  set contact_reveal_approved_at = now(),
      contact_revealed_to = v_winner,
      seller_confirmed = false,
      seller_confirmed_at = null
  where id = p_auction_id;

  return json_build_object(
    'success', true,
    'auto_revealed', true,
    'winner_id', v_winner
  );
end $$;

grant execute on function public.auto_reveal_contact_if_pending(uuid) to authenticated;

-- =====================================================
-- 2) TRIGGER: vehicles UPDATE -> status='pending'
-- Başlık, fiyat, açıklama değişirse ilan admin onayına düşer
-- Yayından kalkar (published_at=null, approved_at=null)
-- =====================================================
create or replace function public.vehicles_edit_reset_trigger()
returns trigger
language plpgsql
as $$
begin
  -- Status kontrolu: sadece aktif ilanlarda düzenleme yapılabilir
  -- pending, rejected, sold, expired durumlarında zaten düzenlenemez
  if new.status not in ('active', 'sold') then
    return new;
  end if;

  -- Önemli alanlar değişti mi?
  if (new.title is distinct from old.title) or
     (new.price is distinct from old.price) or
     (new.description is distinct from old.description) or
     (new.brand_id is distinct from old.brand_id) or
     (new.model_id is distinct from old.model_id) or
     (new.year is distinct from old.year) or
     (new.km is distinct from old.km) or
     (new.fuel is distinct from old.fuel) or
     (new.transmission is distinct from old.transmission) or
     (new.body is distinct from old.body) or
     (new.color is distinct from old.color) then

    -- İlan admin onayına düşer
    new.status := 'pending';
    new.published_at := null;
    new.approved_at := null;
    new.approved_by := null;
    new.updated_at := now();
  end if;

  return new;
end $$;

drop trigger if exists trg_vehicles_edit_reset on public.vehicles;
create trigger trg_vehicles_edit_reset
  before update on public.vehicles
  for each row execute function public.vehicles_edit_reset_trigger();
