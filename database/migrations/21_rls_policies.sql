-- =====================================================
-- Migration 21: RLS Policies
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Tüm tablolarda RLS aktif. Tüm politikalar burada.
-- =====================================================

-- =====================================================
-- 1) PROFILES
-- =====================================================
alter table public.profiles enable row level security;
-- Herkes okuyabilir (sadece public alanlar için, frontend filtrelemeli)
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (deleted_at is null);
-- Kendini güncelleyebilir
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- Admin her şeyi yapabilir
drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =====================================================
-- 2) ADMIN_USERS / ADMIN_PERMISSIONS / ADMIN_ACTIVITY_LOGS
-- =====================================================
alter table public.admin_users enable row level security;
alter table public.admin_permissions enable row level security;
alter table public.admin_activity_logs enable row level security;

drop policy if exists admin_users_read on public.admin_users;
create policy admin_users_read on public.admin_users
  for select using (public.is_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists admin_users_super_write on public.admin_users;
create policy admin_users_super_write on public.admin_users
  for all using (
    exists(select 1 from public.admin_users au
      where au.user_id = auth.uid() and au.is_super_admin = true and au.is_active = true)
  ) with check (
    exists(select 1 from public.admin_users au
      where au.user_id = auth.uid() and au.is_super_admin = true and au.is_active = true)
  );

drop policy if exists admin_perms_read on public.admin_permissions;
create policy admin_perms_read on public.admin_permissions
  for select using (
    exists(select 1 from public.admin_users au
      where au.id = admin_user_id and (au.user_id = auth.uid() or public.is_admin(auth.uid())))
  );

drop policy if exists admin_perms_write on public.admin_permissions;
create policy admin_perms_write on public.admin_permissions
  for all using (
    exists(select 1 from public.admin_users au
      where au.user_id = auth.uid() and au.is_super_admin = true and au.is_active = true)
  ) with check (
    exists(select 1 from public.admin_users au
      where au.user_id = auth.uid() and au.is_super_admin = true and au.is_active = true)
  );

drop policy if exists admin_activity_logs_read on public.admin_activity_logs;
create policy admin_activity_logs_read on public.admin_activity_logs
  for select using (public.is_admin(auth.uid()));

drop policy if exists admin_activity_logs_insert on public.admin_activity_logs;
create policy admin_activity_logs_insert on public.admin_activity_logs
  for insert with check (public.is_admin(auth.uid()));

-- =====================================================
-- 3) SITE_CONFIG (settings, themes, logos)
-- =====================================================
-- Public okuma zaten 04'te yazıldı
alter table public.site_settings enable row level security;
alter table public.site_themes enable row level security;
alter table public.site_logos enable row level security;

drop policy if exists settings_admin_write on public.site_settings;
create policy settings_admin_write on public.site_settings
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists themes_admin_write on public.site_themes;
create policy themes_admin_write on public.site_themes
  for all using (public.is_super_admin(auth.uid()))
  with check (public.is_super_admin(auth.uid()));

drop policy if exists logos_admin_write on public.site_logos;
create policy logos_admin_write on public.site_logos
  for all using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));

-- =====================================================
-- 4) VEHICLES / VEHICLE_IMAGES / VEHICLE_VIEWS
-- =====================================================
alter table public.vehicles enable row level security;
alter table public.vehicle_images enable row level security;
alter table public.vehicle_views enable row level security;

drop policy if exists vehicles_public_read on public.vehicles;
create policy vehicles_public_read on public.vehicles
  for select using (
    status = 'active' or seller_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists vehicles_seller_insert on public.vehicles;
create policy vehicles_seller_insert on public.vehicles
  for insert with check (seller_id = auth.uid());

drop policy if exists vehicles_seller_update on public.vehicles;
create policy vehicles_seller_update on public.vehicles
  for update using (seller_id = auth.uid() or public.is_admin(auth.uid()))
  with check (seller_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists vehicles_admin_delete on public.vehicles;
create policy vehicles_admin_delete on public.vehicles
  for delete using (public.is_admin(auth.uid()));

drop policy if exists vehicle_images_public_read on public.vehicle_images;
create policy vehicle_images_public_read on public.vehicle_images
  for select using (true);

drop policy if exists vehicle_images_seller_write on public.vehicle_images;
create policy vehicle_images_seller_write on public.vehicle_images
  for all using (
    exists(select 1 from public.vehicles v
      where v.id = vehicle_id and (v.seller_id = auth.uid() or public.is_admin(auth.uid())))
  ) with check (
    exists(select 1 from public.vehicles v
      where v.id = vehicle_id and (v.seller_id = auth.uid() or public.is_admin(auth.uid())))
  );

drop policy if exists vehicle_views_insert on public.vehicle_views;
create policy vehicle_views_insert on public.vehicle_views
  for insert with check (true);

drop policy if exists vehicle_views_admin_read on public.vehicle_views;
create policy vehicle_views_admin_read on public.vehicle_views
  for select using (public.is_admin(auth.uid()));

-- =====================================================
-- 5) AUCTIONS / BIDS / SEATS
-- =====================================================
alter table public.auction_slots enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.auction_seat_holds enable row level security;
alter table public.auction_seat_transactions enable row level security;

drop policy if exists auction_slots_public_read on public.auction_slots;
create policy auction_slots_public_read on public.auction_slots
  for select using (true);

drop policy if exists auction_slots_admin_write on public.auction_slots;
create policy auction_slots_admin_write on public.auction_slots
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists auctions_public_read on public.auctions;
create policy auctions_public_read on public.auctions
  for select using (true);

drop policy if exists auctions_admin_write on public.auctions;
create policy auctions_admin_write on public.auctions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists bids_self_read on public.bids;
create policy bids_self_read on public.bids
  for select using (bidder_id = auth.uid() or public.is_admin(auth.uid())
    or exists(select 1 from public.auctions a
      where a.id = auction_id and a.status = 'live'));

drop policy if exists bids_insert_authenticated on public.bids;
create policy bids_insert_authenticated on public.bids
  for insert with check (
    bidder_id = auth.uid() and
    exists(select 1 from public.auctions a
      where a.id = auction_id and a.status = 'live')
  );

drop policy if exists seat_holds_self_read on public.auction_seat_holds;
create policy seat_holds_self_read on public.auction_seat_holds
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists seat_holds_self_insert on public.auction_seat_holds;
create policy seat_holds_self_insert on public.auction_seat_holds
  for insert with check (user_id = auth.uid());

drop policy if exists seat_holds_self_update on public.auction_seat_holds;
create policy seat_holds_self_update on public.auction_seat_holds
  for update using (user_id = auth.uid() or public.is_admin(auth.uid()))
  with check (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists seat_tx_self_read on public.auction_seat_transactions;
create policy seat_tx_self_read on public.auction_seat_transactions
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

-- =====================================================
-- 6) EXPERTISE / VALETS
-- =====================================================
alter table public.expertise_requests enable row level security;
alter table public.expertise_process_steps enable row level security;
alter table public.expert_valets enable row level security;
alter table public.valet_ratings enable row level security;

drop policy if exists expertise_requests_read on public.expertise_requests;
create policy expertise_requests_read on public.expertise_requests
  for select using (
    user_id = auth.uid() or
    expert_valet_id in (select id from public.expert_valets where user_id = auth.uid()) or
    expertise_dealership_id in (
      select expertise_dealership_id from public.profiles where id = auth.uid()
    ) or
    public.is_admin(auth.uid())
  );

drop policy if exists expertise_requests_insert on public.expertise_requests;
create policy expertise_requests_insert on public.expertise_requests
  for insert with check (user_id = auth.uid());

drop policy if exists expertise_requests_update on public.expertise_requests;
create policy expertise_requests_update on public.expertise_requests
  for update using (
    user_id = auth.uid() or
    expert_valet_id in (select id from public.expert_valets where user_id = auth.uid()) or
    expertise_dealership_id in (
      select expertise_dealership_id from public.profiles where id = auth.uid()
    ) or
    public.is_admin(auth.uid())
  );

drop policy if exists expertise_steps_read on public.expertise_process_steps;
create policy expertise_steps_read on public.expertise_process_steps
  for select using (
    exists(select 1 from public.expertise_requests er
      where er.id = request_id and (
        er.user_id = auth.uid() or
        er.expert_valet_id in (select id from public.expert_valets where user_id = auth.uid()) or
        er.expertise_dealership_id in (
          select expertise_dealership_id from public.profiles where id = auth.uid()
        ) or
        public.is_admin(auth.uid())
      ))
  );

drop policy if exists expertise_steps_insert on public.expertise_process_steps;
create policy expertise_steps_insert on public.expertise_process_steps
  for insert with check (true);

drop policy if exists valets_admin_read on public.expert_valets;
create policy valets_admin_read on public.expert_valets
  for select using (public.is_admin(auth.uid()) or user_id = auth.uid());

drop policy if exists valets_admin_write on public.expert_valets;
create policy valets_admin_write on public.expert_valets
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists valet_ratings_read on public.valet_ratings;
create policy valet_ratings_read on public.valet_ratings
  for select using (true);

drop policy if exists valet_ratings_insert on public.valet_ratings;
create policy valet_ratings_insert on public.valet_ratings
  for insert with check (user_id = auth.uid());

-- =====================================================
-- 7) DEALERSHIPS
-- =====================================================
alter table public.dealerships enable row level security;
alter table public.expertise_dealerships enable row level security;

drop policy if exists dealerships_public_read on public.dealerships;
create policy dealerships_public_read on public.dealerships
  for select using (
    status = 'active' or owner_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists dealerships_owner_insert on public.dealerships;
create policy dealerships_owner_insert on public.dealerships
  for insert with check (owner_id = auth.uid());

drop policy if exists dealerships_owner_update on public.dealerships;
create policy dealerships_owner_update on public.dealerships
  for update using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists expertise_dealerships_read on public.expertise_dealerships;
create policy expertise_dealerships_read on public.expertise_dealerships
  for select using (
    status = 'active' or owner_id = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists expertise_dealerships_write on public.expertise_dealerships;
create policy expertise_dealerships_write on public.expertise_dealerships
  for all using (owner_id = auth.uid() or public.is_admin(auth.uid()))
  with check (owner_id = auth.uid() or public.is_admin(auth.uid()));

-- =====================================================
-- 8) TRANSACTIONS / FAVORITES / MESSAGING
-- =====================================================
alter table public.transactions enable row level security;
alter table public.favorites enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists tx_owner_read on public.transactions;
create policy tx_owner_read on public.transactions
  for select using (user_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists tx_owner_insert on public.transactions;
create policy tx_owner_insert on public.transactions
  for insert with check (user_id = auth.uid());

drop policy if exists favorites_owner on public.favorites;
create policy favorites_owner on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists conversations_read on public.conversations;
create policy conversations_read on public.conversations
  for select using (
    participant_a = auth.uid() or participant_b = auth.uid() or public.is_admin(auth.uid())
  );

drop policy if exists conversations_insert on public.conversations;
create policy conversations_insert on public.conversations
  for insert with check (participant_a = auth.uid() or participant_b = auth.uid());

drop policy if exists messages_read on public.messages;
create policy messages_read on public.messages
  for select using (
    sender_id = auth.uid() or
    exists(select 1 from public.conversations c
      where c.id = conversation_id and (c.participant_a = auth.uid() or c.participant_b = auth.uid()))
    or public.is_admin(auth.uid())
  );

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages
  for insert with check (sender_id = auth.uid());

-- =====================================================
-- 9) USER FEATURES (notifications, saved searches, reports)
-- =====================================================
alter table public.notifications enable row level security;
alter table public.saved_searches enable row level security;
alter table public.vehicle_reports enable row level security;

drop policy if exists notifications_owner on public.notifications;
create policy notifications_owner on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists saved_searches_owner on public.saved_searches;
create policy saved_searches_owner on public.saved_searches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists vehicle_reports_insert on public.vehicle_reports;
create policy vehicle_reports_insert on public.vehicle_reports
  for insert with check (reporter_id = auth.uid());

drop policy if exists vehicle_reports_read on public.vehicle_reports;
create policy vehicle_reports_read on public.vehicle_reports
  for select using (reporter_id = auth.uid() or public.is_admin(auth.uid()));

-- =====================================================
-- 10) PROMOTION SYSTEM
-- =====================================================
alter table public.free_listing_votes enable row level security;
alter table public.auction_promotion_requests enable row level security;

drop policy if exists votes_owner on public.free_listing_votes;
create policy votes_owner on public.free_listing_votes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists promotion_admin_read on public.auction_promotion_requests;
create policy promotion_admin_read on public.auction_promotion_requests
  for select using (public.is_admin(auth.uid()));

drop policy if exists promotion_admin_write on public.auction_promotion_requests;
create policy promotion_admin_write on public.auction_promotion_requests
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =====================================================
-- 11) EMAIL SYSTEM
-- =====================================================
alter table public.email_templates enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_suppressions enable row level security;

drop policy if exists email_templates_admin on public.email_templates;
create policy email_templates_admin on public.email_templates
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists email_logs_admin_read on public.email_logs;
create policy email_logs_admin_read on public.email_logs
  for select using (public.is_admin(auth.uid()));

drop policy if exists email_suppressions_admin on public.email_suppressions;
create policy email_suppressions_admin on public.email_suppressions
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- =====================================================
-- 12) AUDIT LOGS
-- =====================================================
alter table public.audit_logs enable row level security;

drop policy if exists audit_admin_read on public.audit_logs;
create policy audit_admin_read on public.audit_logs
  for select using (public.is_admin(auth.uid()));

-- =====================================================
-- 13) ADVERTISING
-- =====================================================
alter table public.ad_campaigns enable row level security;
alter table public.ad_slots enable row level security;
alter table public.ad_creatives enable row level security;
alter table public.ad_placements enable row level security;
alter table public.ad_impressions enable row level security;
alter table public.ad_clicks enable row level security;

drop policy if exists ad_slots_public_read on public.ad_slots;
create policy ad_slots_public_read on public.ad_slots
  for select using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists ad_slots_admin_write on public.ad_slots;
create policy ad_slots_admin_write on public.ad_slots
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists ad_campaigns_admin on public.ad_campaigns;
create policy ad_campaigns_admin on public.ad_campaigns
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists ad_creatives_public_read on public.ad_creatives;
create policy ad_creatives_public_read on public.ad_creatives
  for select using (is_active = true or public.is_admin(auth.uid()));

drop policy if exists ad_creatives_admin_write on public.ad_creatives;
create policy ad_creatives_admin_write on public.ad_creatives
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists ad_placements_admin on public.ad_placements;
create policy ad_placements_admin on public.ad_placements
  for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

drop policy if exists ad_impressions_insert on public.ad_impressions;
create policy ad_impressions_insert on public.ad_impressions
  for insert with check (true);

drop policy if exists ad_impressions_admin_read on public.ad_impressions;
create policy ad_impressions_admin_read on public.ad_impressions
  for select using (public.is_admin(auth.uid()));

drop policy if exists ad_clicks_insert on public.ad_clicks;
create policy ad_clicks_insert on public.ad_clicks
  for insert with check (true);

drop policy if exists ad_clicks_admin_read on public.ad_clicks;
create policy ad_clicks_admin_read on public.ad_clicks
  for select using (public.is_admin(auth.uid()));
