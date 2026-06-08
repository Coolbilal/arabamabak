-- =====================================================
-- Migration 01: Extensions + All Enums
-- arabamabak - Veritabanı Planı v2
-- =====================================================
-- Bu migration:
--   1) Gerekli PostgreSQL extension'larını kurar
--   2) Tüm enum tiplerini tanımlar (alfabetik sıralı)
-- =====================================================
-- Idempotent: Birden fazla kez çalıştırılabilir
-- =====================================================

-- =====================================================
-- 1) EXTENSIONS
-- =====================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
-- postgis: opsiyonel, il/ilçe geometri veya konum bazlı arama için
-- Yüklenmezse sorun çıkarmaz, sadece konum sorguları çalışmaz
do $$ begin
  create extension if not exists "postgis";
exception when others then
  raise notice 'postgis extension kurulamadı, devam ediliyor (opsiyonel)';
end $$;

-- =====================================================
-- 2) ENUMS
-- =====================================================
-- Tüm enum değerleri alfabetik sıralanmıştır
-- do $$ begin ... exception when duplicate_object then null; end $$;
-- pattern'i sayesinde migration tekrar çalıştırılabilir

-- ad_campaign_status: Reklam kampanyası durumu
do $$ begin
  create type ad_campaign_status as enum (
    'active',
    'archived',
    'completed',
    'draft',
    'paused'
  );
exception when duplicate_object then null; end $$;

-- ad_slot_position: Reklam slot pozisyonu
do $$ begin
  create type ad_slot_position as enum (
    'footer',
    'header',
    'inline',
    'popup',
    'sidebar'
  );
exception when duplicate_object then null; end $$;

-- admin_permission_area: Admin yetki alanları
do $$ begin
  create type admin_permission_area as enum (
    'auctions',
    'authorization',
    'dashboard',
    'dealerships',
    'expertise',
    'free_listings',
    'site_settings',
    'transactions',
    'users'
  );
exception when duplicate_object then null; end $$;

-- auction_status: Açık arttırma durumu
do $$ begin
  create type auction_status as enum (
    'cancelled',
    'ended',
    'live',
    'scheduled',
    'sold_pending_confirmation'
  );
exception when duplicate_object then null; end $$;

-- body_type: Araç kasa tipi
do $$ begin
  create type body_type as enum (
    'cabrio',
    'coupe',
    'hatchback',
    'minivan',
    'mpv',
    'pickup',
    'sedan',
    'station wagon',
    'suv'
  );
exception when duplicate_object then null; end $$;

-- dealership_status: Bayi başvuru durumu
do $$ begin
  create type dealership_status as enum (
    'active',
    'pending',
    'rejected',
    'suspended'
  );
exception when duplicate_object then null; end $$;

-- dealership_type: Bayi türü
do $$ begin
  create type dealership_type as enum (
    'expertise',
    'gallery'
  );
exception when duplicate_object then null; end $$;

-- expertise_process_status: Ekspertiz süreç aşaması
do $$ begin
  create type expertise_process_status as enum (
    'assigned',
    'at_dealership',
    'cancelled',
    'completed',
    'created',
    'delivering',
    'in_inspection',
    'picked_up',
    'report_uploaded',
    'valet_accepted'
  );
exception when duplicate_object then null; end $$;

-- expertise_status: Ekspertiz talep durumu
do $$ begin
  create type expertise_status as enum (
    'assigned',
    'cancelled',
    'completed',
    'in_progress',
    'pending'
  );
exception when duplicate_object then null; end $$;

-- fuel_type: Yakıt tipi
do $$ begin
  create type fuel_type as enum (
    'benzin',
    'dizel',
    'elektrik',
    'hibrit',
    'lpg'
  );
exception when duplicate_object then null; end $$;

-- listing_status: İlan durumu
do $$ begin
  create type listing_status as enum (
    'active',
    'cancelled',
    'draft',
    'expired',
    'pending',
    'rejected',
    'sold'
  );
exception when duplicate_object then null; end $$;

-- listing_type: İlan türü
do $$ begin
  create type listing_type as enum (
    'auction',
    'free',
    'premium_auction'
  );
exception when duplicate_object then null; end $$;

-- notification_type: Bildirim tipi
do $$ begin
  create type notification_type as enum (
    'auction_lost',
    'auction_won',
    'bid_received',
    'expertise_update',
    'listing_approved',
    'listing_rejected',
    'message_received',
    'promotion_request',
    'system'
  );
exception when duplicate_object then null; end $$;

-- seat_hold_status: Mezat masa oturma durumu
do $$ begin
  create type seat_hold_status as enum (
    'forfeited',
    'holding',
    'left_auction',
    'released',
    'won'
  );
exception when duplicate_object then null; end $$;

-- site_logo_usage: Logo kullanım yeri
do $$ begin
  create type site_logo_usage as enum (
    'email',
    'favicon',
    'header',
    'header_dark',
    'login',
    'mobile',
    'og_image',
    'print'
  );
exception when duplicate_object then null; end $$;

-- transport_mode: Ekspertiz ulaşım modu
do $$ begin
  create type transport_mode as enum (
    'owner',
    'valet'
  );
exception when duplicate_object then null; end $$;

-- transmission_type: Vites tipi
do $$ begin
  create type transmission_type as enum (
    'manuel',
    'otomatik',
    'yarı_otomatik'
  );
exception when duplicate_object then null; end $$;

-- tx_status: İşlem durumu
do $$ begin
  create type tx_status as enum (
    'cancelled',
    'completed',
    'failed',
    'pending'
  );
exception when duplicate_object then null; end $$;

-- tx_type: İşlem tipi
do $$ begin
  create type tx_type as enum (
    'auction_payment',
    'deposit',
    'expertise_payment',
    'payment',
    'premium_payment',
    'refund',
    'withdraw'
  );
exception when duplicate_object then null; end $$;

-- user_account_type: Kullanıcı hesap tipi
do $$ begin
  create type user_account_type as enum (
    'dealer',
    'individual'
  );
exception when duplicate_object then null; end $$;

-- user_role: Kullanıcı rolü
do $$ begin
  create type user_role as enum (
    'admin',
    'dealer',
    'user'
  );
exception when duplicate_object then null; end $$;

-- vote_type: Ücretsiz ilan oylama tipi
do $$ begin
  create type vote_type as enum (
    'fair_price',
    'price_too_high',
    'price_too_low'
  );
exception when duplicate_object then null; end $$;

-- =====================================================
-- 3) YORUM: Sonraki migration
-- =====================================================
-- Migration 02: Reference tabloları
--   cities, districts, engine_sizes, categories,
--   vehicle_brands, vehicle_models
-- =====================================================
