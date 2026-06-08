-- =====================================================
-- arabamabak - full schema
-- Supabase (PostgreSQL) + Auth + Storage
-- =====================================================

-- enable extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create extension if not exists "postgis"; -- for city/district if needed; ignore if unavailable

-- =====================================================
-- 1) ENUMS
-- =====================================================
do $$ begin
  create type user_role as enum ('user', 'dealer', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fuel_type as enum ('benzin', 'dizel', 'lpg', 'elektrik', 'hibrit');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transmission_type as enum ('manuel', 'otomatik', 'yarı_otomatik');
exception when duplicate_object then null; end $$;

do $$ begin
  create type body_type as enum ('sedan', 'hatchback', 'station wagon', 'suv', 'pickup', 'minivan', 'coupe', 'cabrio', 'mpv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_type as enum ('free', 'auction', 'premium_auction');
exception when duplicate_object then null; end $$;

do $$ begin
  create type listing_status as enum ('draft', 'pending', 'active', 'sold', 'expired', 'rejected', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type auction_status as enum ('scheduled', 'live', 'ended', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_type as enum ('deposit', 'withdraw', 'payment', 'refund', 'auction_payment', 'premium_payment', 'expertise_payment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tx_status as enum ('pending', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type expertise_status as enum ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type dealership_status as enum ('pending', 'active', 'suspended', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type admin_permission_area as enum (
    'dashboard', 'users', 'auctions', 'free_listings', 'expertise',
    'site_settings', 'authorization', 'dealerships', 'transactions'
  );
exception when duplicate_object then null; end $$;

-- =====================================================
-- 2) profiles - extends auth.users
-- =====================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  city text,
  district text,
  avatar_url text,
  role user_role not null default 'user',
  wallet_balance numeric(12,2) not null default 0,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =====================================================
-- 3) admin_users - separate admin login (username/password)
-- =====================================================
create table if not exists public.admin_users (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete set null,
  username text unique not null,
  full_name text,
  is_active boolean not null default true,
  is_super_admin boolean not null default false,
  last_login_at timestamptz,
  created_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_permissions (
  id uuid primary key default uuid_generate_v4(),
  admin_user_id uuid not null references public.admin_users(id) on delete cascade,
  area admin_permission_area not null,
  can_view boolean not null default false,
  can_edit boolean not null default false,
  can_approve boolean not null default false,
  can_delete boolean not null default false,
  created_at timestamptz not null default now(),
  unique(admin_user_id, area)
);

-- =====================================================
-- 4) site_settings (singleton row id=1)
-- =====================================================
create table if not exists public.site_settings (
  id int primary key default 1,
  site_name text not null default 'arabamabak',
  logo_url text,
  favicon_url text,
  primary_color text not null default '#dc2626',
  secondary_color text not null default '#1f2937',
  accent_color text not null default '#f59e0b',
  header_html text,
  footer_html text,
  contact_email text,
  contact_phone text,
  auction_listing_fee numeric(10,2) not null default 250,
  premium_auction_fee numeric(10,2) not null default 750,
  expertise_fee numeric(10,2) not null default 1500,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.admin_users(id),
  constraint single_row check (id = 1)
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- =====================================================
-- 5) vehicle_brands / vehicle_models
-- =====================================================
create table if not exists public.vehicle_brands (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  logo_url text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicle_models (
  id uuid primary key default uuid_generate_v4(),
  brand_id uuid not null references public.vehicle_brands(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(brand_id, name)
);

-- seed common brands
insert into public.vehicle_brands (name, sort_order) values
  ('BMW', 1), ('Mercedes-Benz', 2), ('Audi', 3), ('Volkswagen', 4),
  ('Ford', 5), ('Renault', 6), ('Fiat', 7), ('Hyundai', 8),
  ('Toyota', 9), ('Honda', 10), ('Opel', 11), ('Peugeot', 12),
  ('Citroen', 13), ('Skoda', 14), ('Kia', 15), ('Nissan', 16),
  ('Mazda', 17), ('Volvo', 18), ('Land Rover', 19), ('Porsche', 20),
  ('Chevrolet', 21), ('Dacia', 22), ('Tofas', 23), ('Suzuki', 24),
  ('Mitsubishi', 25), ('Subaru', 26), ('Jeep', 27), ('Mini', 28),
  ('Tesla', 29), ('Lexus', 30), ('Jaguar', 31), ('Alfa Romeo', 32),
  ('Seat', 33), ('Daihatsu', 34), ('Lada', 35), ('Chrysler', 36),
  ('Dodge', 37), ('Ferrari', 38), ('Lamborghini', 39), ('Maserati', 40),
  ('Bentley', 41), ('Rolls-Royce', 42), ('Aston Martin', 43), ('Smart', 44),
  ('SsangYong', 45), ('Chery', 46), ('Geely', 47), ('MG', 48),
  ('Ssang Yong', 49), ('Isuzu', 50), ('Tata', 51), ('Proton', 52),
  ('Perodua', 53), ('Lancia', 54), ('Lotus', 55), ('Bugatti', 56),
  ('McLaren', 57), ('Pagani', 58), ('Koenigsegg', 59), ('Infiniti', 60),
  ('Acura', 61), ('Cadillac', 62), ('Buick', 63), ('GMC', 64),
  ('Lincoln', 65), ('Pontiac', 66), ('Saturn', 67), ('Hummer', 68),
  ('Oldsmobile', 69), ('Plymouth', 70), ('AMC', 71), ('Daewoo', 72),
  ('Samsung', 73), ('Asia', 74), ('BMC', 75), ('Karsan', 76),
  ('Otokar', 77), ('Temsa', 78), ('Otosan', 79), ('Man', 80)
on conflict (name) do nothing;

-- =====================================================
-- 6) vehicles (all listings, both free + auction)
-- =====================================================
create table if not exists public.vehicles (
  id uuid primary key default uuid_generate_v4(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  dealership_id uuid references public.dealerships(id) on delete set null,
  title text not null,
  brand_id uuid not null references public.vehicle_brands(id),
  model_id uuid references public.vehicle_models(id),
  year int not null,
  km int not null default 0,
  fuel fuel_type not null,
  transmission transmission_type not null,
  body body_type not null,
  color text,
  price numeric(12,2) not null,  -- free listing price OR auction opening price
  city text not null,
  district text,
  damage_record boolean not null default false,
  damage_detail text,
  exchange_accepted boolean not null default false,
  description text,
  listing_type listing_type not null default 'free',
  status listing_status not null default 'pending',
  is_premium boolean not null default false,
  view_count int not null default 0,
  favorite_count int not null default 0,
  contact_hidden boolean not null default false,  -- for auction listings
  contact_revealed_to uuid references public.profiles(id), -- winner id
  published_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_vehicles_seller on public.vehicles(seller_id);
create index if not exists idx_vehicles_brand on public.vehicles(brand_id);
create index if not exists idx_vehicles_type on public.vehicles(listing_type);
create index if not exists idx_vehicles_status on public.vehicles(status);
create index if not exists idx_vehicles_city on public.vehicles(city);

-- =====================================================
-- 7) vehicle_images
-- =====================================================
create table if not exists public.vehicle_images (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_vehicle_images_vehicle on public.vehicle_images(vehicle_id);

-- =====================================================
-- 8) auction_slots
-- =====================================================
create table if not exists public.auction_slots (
  id uuid primary key default uuid_generate_v4(),
  slot_date date not null,
  start_time time not null,
  end_time time not null,
  max_items int not null default 20,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(slot_date, start_time)
);

-- =====================================================
-- 9) auctions (1:1 with vehicle of type auction)
-- =====================================================
create table if not exists public.auctions (
  id uuid primary key default uuid_generate_v4(),
  vehicle_id uuid unique not null references public.vehicles(id) on delete cascade,
  slot_id uuid references public.auction_slots(id) on delete set null,
  opening_price numeric(12,2) not null,
  current_price numeric(12,2) not null,
  bid_increment numeric(10,2) not null default 100,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status auction_status not null default 'scheduled',
  winner_id uuid references public.profiles(id) on delete set null,
  winning_bid_id uuid, -- set after auction ends, references public.bids
  total_bids int not null default 0,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_auctions_slot on public.auctions(slot_id);
create index if not exists idx_auctions_status on public.auctions(status);
create index if not exists idx_auctions_end on public.auctions(end_at);

-- =====================================================
-- 10) bids
-- =====================================================
create table if not exists public.bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  is_winning boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_bids_auction on public.bids(auction_id);
create index if not exists idx_bids_bidder on public.bids(bidder_id);

-- =====================================================
-- 11) transactions (wallet, payments)
-- =====================================================
create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type tx_type not null,
  amount numeric(12,2) not null,
  status tx_status not null default 'pending',
  payment_method text,
  reference_id text,
  description text,
  related_vehicle_id uuid references public.vehicles(id) on delete set null,
  related_auction_id uuid references public.auctions(id) on delete set null,
  receipt_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_tx_user on public.transactions(user_id);
create index if not exists idx_tx_type on public.transactions(type);

-- =====================================================
-- 12) messages / conversations
-- =====================================================
create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  last_message_at timestamptz not null default now(),
  last_message_preview text,
  created_at timestamptz not null default now(),
  unique(participant_a, participant_b, vehicle_id)
);

create table if not exists public.messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_messages_conv on public.messages(conversation_id);
create index if not exists idx_messages_sender on public.messages(sender_id);

-- =====================================================
-- 13) favorites
-- =====================================================
create table if not exists public.favorites (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, vehicle_id)
);
create index if not exists idx_fav_user on public.favorites(user_id);

-- =====================================================
-- 14) expertise_requests
-- =====================================================
create table if not exists public.expertise_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete set null,
  brand_id uuid references public.vehicle_brands(id),
  model_id uuid references public.vehicle_models(id),
  year int,
  plate text,
  km int,
  city text not null,
  address text,
  status expertise_status not null default 'pending',
  assigned_admin_id uuid references public.admin_users(id),
  expert_notes text,
  report_url text,
  scheduled_date date,
  fee numeric(10,2),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_expertise_user on public.expertise_requests(user_id);
create index if not exists idx_expertise_status on public.expertise_requests(status);

-- =====================================================
-- 15) dealerships
-- =====================================================
create table if not exists public.dealerships (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  tax_number text,
  city text not null,
  district text,
  address text,
  phone text,
  email text,
  logo_url text,
  description text,
  status dealership_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references public.admin_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_dealerships_owner on public.dealerships(owner_id);
create index if not exists idx_dealerships_status on public.dealerships(status);
create index if not exists idx_dealerships_city on public.dealerships(city);

-- =====================================================
-- 16) auction_audit_log
-- =====================================================
create table if not exists public.auction_audit_log (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid references public.auctions(id) on delete cascade,
  event_type text not null,
  actor_id uuid,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_auction on public.auction_audit_log(auction_id);

-- =====================================================
-- 17) TRIGGERS - auto-create profile on signup, updated_at
-- =====================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role, email_verified_at)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), 'user', new.email_confirmed_at);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_touch_profiles on public.profiles;
create trigger trg_touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_vehicles on public.vehicles;
create trigger trg_touch_vehicles before update on public.vehicles
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_touch_site_settings on public.site_settings;
create trigger trg_touch_site_settings before update on public.site_settings
  for each row execute function public.touch_updated_at();

-- bid trigger - update auction.current_price and total_bids
create or replace function public.on_new_bid()
returns trigger as $$
begin
  update public.auctions set current_price = new.amount, total_bids = total_bids + 1 where id = new.auction_id;
  -- mark all other bids as not winning
  update public.bids set is_winning = false where auction_id = new.auction_id and id != new.id;
  new.is_winning = true;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_on_new_bid on public.bids;
create trigger trg_on_new_bid before insert on public.bids
  for each row execute function public.on_new_bid();

-- favorite count trigger
create or replace function public.on_favorite_change()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.vehicles set favorite_count = favorite_count + 1 where id = new.vehicle_id;
    return new;
  elsif (TG_OP = 'DELETE') then
    update public.vehicles set favorite_count = greatest(0, favorite_count - 1) where id = old.vehicle_id;
    return old;
  end if;
  return null;
end;
$$ language plpgsql;

drop trigger if exists trg_favorite_change on public.favorites;
create trigger trg_favorite_change after insert or delete on public.favorites
  for each row execute function public.on_favorite_change();

-- =====================================================
-- 18) VIEWS - convenient reads
-- =====================================================
create or replace view public.v_active_auctions as
  select a.*, v.title, v.brand_id, v.model_id, v.year, v.km, v.fuel, v.transmission, v.city, v.is_premium, v.contact_hidden
  from public.auctions a
  join public.vehicles v on v.id = a.vehicle_id
  where a.status in ('scheduled','live') and v.status = 'active';

create or replace view public.v_active_listings as
  select v.*, b.name as brand_name, m.name as model_name
  from public.vehicles v
  left join public.vehicle_brands b on b.id = v.brand_id
  left join public.vehicle_models m on m.id = v.model_id
  where v.status = 'active';

-- =====================================================
-- 19) RLS POLICIES
-- =====================================================
alter table public.profiles enable row level security;
alter table public.admin_users enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.site_settings enable row level security;
alter table public.vehicle_brands enable row level security;
alter table public.vehicle_models enable row level security;
alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.auction_slots enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.transactions enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.favorites enable row level security;
alter table public.expertise_requests enable row level security;
alter table public.dealerships enable row level security;
alter table public.auction_audit_log enable row level security;

-- Helper: is_admin() — checks if current auth user is in admin_users with is_active
create or replace function public.is_admin(check_user uuid)
returns boolean language sql security definer as $$
  select exists(select 1 from public.admin_users where user_id = check_user and is_active = true);
$$;

-- Profiles: owner can read/update self, anyone can read public fields
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select using (true);
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Vehicle brands/models: public read
drop policy if exists brands_public_read on public.vehicle_brands;
create policy brands_public_read on public.vehicle_brands for select using (true);
drop policy if exists models_public_read on public.vehicle_models;
create policy models_public_read on public.vehicle_models for select using (true);

-- Site settings: public read, admin write
drop policy if exists settings_public_read on public.site_settings;
create policy settings_public_read on public.site_settings for select using (true);
drop policy if exists settings_admin_write on public.site_settings;
create policy settings_admin_write on public.site_settings for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Vehicles: public read active, seller manages own
drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles for select using (status = 'active' or seller_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists vehicles_seller_write on public.vehicles;
create policy vehicles_seller_write on public.vehicles for insert with check (seller_id = auth.uid());
drop policy if exists vehicles_seller_update on public.vehicles;
create policy vehicles_seller_update on public.vehicles for update using (seller_id = auth.uid() or public.is_admin(auth.uid()));

-- Vehicle images: public read, seller write
drop policy if exists images_public_read on public.vehicle_images;
create policy images_public_read on public.vehicle_images for select using (true);
drop policy if exists images_seller_write on public.vehicle_images;
create policy images_seller_write on public.vehicle_images for all using (
  exists(select 1 from public.vehicles v where v.id = vehicle_id and (v.seller_id = auth.uid() or public.is_admin(auth.uid())))
);

-- Auctions: public read, admin write
drop policy if exists auctions_public_read on public.auctions;
create policy auctions_public_read on public.auctions for select using (true);
drop policy if exists auctions_admin_write on public.auctions;
create policy auctions_admin_write on public.auctions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Bids: bidder reads own, auction participants can read all
drop policy if exists bids_self_read on public.bids;
create policy bids_self_read on public.bids for select using (bidder_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists bids_insert_authenticated on public.bids;
create policy bids_insert_authenticated on public.bids for insert with check (bidder_id = auth.uid() and exists(select 1 from public.auctions a where a.id = auction_id and a.status = 'live'));

-- Transactions: owner read, admin read all
drop policy if exists tx_owner_read on public.transactions;
create policy tx_owner_read on public.transactions for select using (user_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists tx_owner_insert on public.transactions;
create policy tx_owner_insert on public.transactions for insert with check (user_id = auth.uid());

-- Conversations & messages: participants only
drop policy if exists conv_participant on public.conversations;
create policy conv_participant on public.conversations for select using (participant_a = auth.uid() or participant_b = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists conv_insert on public.conversations;
create policy conv_insert on public.conversations for insert with check (participant_a = auth.uid() or participant_b = auth.uid());

drop policy if exists msg_participant on public.messages;
create policy msg_participant on public.messages for select using (
  exists(select 1 from public.conversations c where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid() or public.is_admin(auth.uid())))
);
drop policy if exists msg_insert_sender on public.messages;
create policy msg_insert_sender on public.messages for insert with check (sender_id = auth.uid());

-- Favorites: owner only
drop policy if exists fav_owner on public.favorites;
create policy fav_owner on public.favorites for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Expertise requests: owner or admin
drop policy if exists expertise_owner on public.expertise_requests;
create policy expertise_owner on public.expertise_requests for all using (user_id = auth.uid() or public.is_admin(auth.uid())) with check (user_id = auth.uid());

-- Dealerships: public read active, owner full
drop policy if exists dealer_public_read on public.dealerships;
create policy dealer_public_read on public.dealerships for select using (status = 'active' or owner_id = auth.uid() or public.is_admin(auth.uid()));
drop policy if exists dealer_owner_write on public.dealerships;
create policy dealer_owner_write on public.dealerships for insert with check (owner_id = auth.uid());
drop policy if exists dealer_owner_update on public.dealerships;
create policy dealer_owner_update on public.dealerships for update using (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- Admin users: only admins see
drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users for select using (public.is_admin(auth.uid()) or user_id = auth.uid());
drop policy if exists admin_users_super_write on public.admin_users;
create policy admin_users_super_write on public.admin_users for all using (
  exists(select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_super_admin = true and au.is_active = true)
);

drop policy if exists admin_perms_read on public.admin_permissions;
create policy admin_perms_read on public.admin_permissions for select using (
  exists(select 1 from public.admin_users au where au.id = admin_user_id and (au.user_id = auth.uid() or public.is_admin(auth.uid())))
);
drop policy if exists admin_perms_write on public.admin_permissions;
create policy admin_perms_write on public.admin_permissions for all using (
  exists(select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_super_admin = true and au.is_active = true)
);

-- Auction slots: public read, admin write
drop policy if exists slots_public_read on public.auction_slots;
create policy slots_public_read on public.auction_slots for select using (true);
drop policy if exists slots_admin_write on public.auction_slots;
create policy slots_admin_write on public.auction_slots for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Audit log: admin only
drop policy if exists audit_admin on public.auction_audit_log;
create policy audit_admin on public.auction_audit_log for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =====================================================
-- 20) STORAGE BUCKETS
-- =====================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('vehicle-images', 'vehicle-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('expertise-reports', 'expertise-reports', false, 20971520, array['application/pdf','image/jpeg','image/png']),
  ('site-assets', 'site-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp']),
  ('dealership-logos', 'dealership-logos', true, 2097152, array['image/jpeg','image/png','image/webp','image/svg+xml'])
on conflict (id) do nothing;

-- Storage policies
drop policy if exists vehicle_images_public_read on storage.objects;
create policy vehicle_images_public_read on storage.objects for select using (bucket_id = 'vehicle-images');
drop policy if exists vehicle_images_owner_write on storage.objects;
create policy vehicle_images_owner_write on storage.objects for insert with check (
  bucket_id = 'vehicle-images' and auth.role() = 'authenticated'
);
drop policy if exists vehicle_images_owner_update on storage.objects;
create policy vehicle_images_owner_update on storage.objects for update using (
  bucket_id = 'vehicle-images' and (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
);
drop policy if exists vehicle_images_owner_delete on storage.objects;
create policy vehicle_images_owner_delete on storage.objects for delete using (
  bucket_id = 'vehicle-images' and (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
);

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists avatars_owner_write on storage.objects;
create policy avatars_owner_write on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.role() = 'authenticated'
);
drop policy if exists avatars_owner_update on storage.objects;
create policy avatars_owner_update on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
);

drop policy if exists site_assets_public_read on storage.objects;
create policy site_assets_public_read on storage.objects for select using (bucket_id = 'site-assets');
drop policy if exists site_assets_admin_write on storage.objects;
create policy site_assets_admin_write on storage.objects for all using (
  bucket_id = 'site-assets' and public.is_admin(auth.uid())
) with check (bucket_id = 'site-assets' and public.is_admin(auth.uid()));

drop policy if exists expertise_reports_owner_read on storage.objects;
create policy expertise_reports_owner_read on storage.objects for select using (
  bucket_id = 'expertise-reports' and (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
);
drop policy if exists expertise_reports_write on storage.objects;
create policy expertise_reports_write on storage.objects for insert with check (
  bucket_id = 'expertise-reports' and public.is_admin(auth.uid())
);

drop policy if exists dealer_logos_public_read on storage.objects;
create policy dealer_logos_public_read on storage.objects for select using (bucket_id = 'dealership-logos');
drop policy if exists dealer_logos_owner_write on storage.objects;
create policy dealer_logos_owner_write on storage.objects for all using (
  bucket_id = 'dealership-logos' and (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid()))
) with check (bucket_id = 'dealership-logos' and (storage.foldername(name) = auth.uid()::text or public.is_admin(auth.uid())));

-- =====================================================
-- 21) DEFAULT ADMIN (will be promoted manually after first signup)
-- =====================================================
-- After signing up the first admin user via the app, run:
--   insert into public.admin_users (user_id, username, full_name, is_super_admin)
--   values ('<auth_user_id>', 'superadmin', 'Süper Admin', true);

-- =====================================================
-- Done
-- =====================================================
