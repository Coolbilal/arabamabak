-- =====================================================
-- Migration 12: Communication
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   conversations (mesajlaşma thread'leri)
--   messages (mesaj içerikleri)
--   favorites (favoriler)
-- =====================================================

-- =====================================================
-- 1) CONVERSATIONS
-- =====================================================
-- Canonical ordering: participant_a < participant_b (UUID karşılaştırması)
-- Bu sayede A-B ve B-A aynı conversation'a düşer
create table if not exists public.conversations (
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  id uuid primary key default uuid_generate_v4(),
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  updated_at timestamptz not null default now(),
  vehicle_id uuid references public.vehicles(id) on delete set null,
  -- participant_a < participant_b kısıtı (canonical ordering)
  constraint conversations_canonical_ordering
    check (participant_a < participant_b),
  unique(participant_a, participant_b, vehicle_id)
);
create index if not exists idx_conversations_participant_a
  on public.conversations(participant_a, last_message_at desc);
create index if not exists idx_conversations_participant_b
  on public.conversations(participant_b, last_message_at desc);
create index if not exists idx_conversations_vehicle
  on public.conversations(vehicle_id) where vehicle_id is not null;

-- =====================================================
-- 2) MESSAGES
-- =====================================================
create table if not exists public.messages (
  attachment_urls text[],  -- opsiyonel dosya ekleri
  content text not null,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  id uuid primary key default uuid_generate_v4(),
  is_read boolean not null default false,
  read_at timestamptz,
  sender_id uuid not null references public.profiles(id) on delete cascade
);
create index if not exists idx_messages_conv_created
  on public.messages(conversation_id, created_at desc);
create index if not exists idx_messages_sender
  on public.messages(sender_id);
create index if not exists idx_messages_unread
  on public.messages(conversation_id, is_read) where is_read = false;

-- =====================================================
-- 3) FAVORITES
-- =====================================================
create table if not exists public.favorites (
  created_at timestamptz not null default now(),
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  unique(user_id, vehicle_id)
);
create index if not exists idx_favorites_user
  on public.favorites(user_id, created_at desc);
create index if not exists idx_favorites_vehicle
  on public.favorites(vehicle_id);
