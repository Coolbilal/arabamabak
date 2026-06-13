// arabamabak - Type definitions matching v2 schema (47 tables, 22 enums)
// Tüm tipler alfabetik sıralanmıştır.

// =====================================================
// ENUMS
// =====================================================

// ad_campaign_status
export type AdCampaignStatus =
  | 'active'
  | 'archived'
  | 'completed'
  | 'draft'
  | 'paused';

// ad_slot_position
export type AdSlotPosition =
  | 'footer'
  | 'header'
  | 'inline'
  | 'popup'
  | 'sidebar';

// admin_permission_area
export type AdminPermissionArea =
  | 'auctions'
  | 'authorization'
  | 'dashboard'
  | 'dealerships'
  | 'expertise'
  | 'free_listings'
  | 'site_settings'
  | 'transactions'
  | 'users';

// auction_status
export type AuctionStatus =
  | 'cancelled'
  | 'ended'
  | 'live'
  | 'scheduled'
  | 'sold_pending_confirmation';

// body_type
export type BodyType =
  | 'cabrio'
  | 'coupe'
  | 'hatchback'
  | 'minivan'
  | 'mpv'
  | 'pickup'
  | 'sedan'
  | 'station wagon'
  | 'suv';

// Dealership status (hem galeri hem ekspertiz bayileri)
export type DealershipStatus =
  | 'active'
  | 'pending'
  | 'rejected'
  | 'suspended';

// dealership_type
export type DealershipType = 'expertise' | 'gallery';

// expertise_process_status
export type ExpertiseProcessStatus =
  | 'assigned'
  | 'at_dealership'
  | 'cancelled'
  | 'completed'
  | 'created'
  | 'delivering'
  | 'in_inspection'
  | 'picked_up'
  | 'report_uploaded'
  | 'valet_accepted';

// expertise_status
export type ExpertiseStatus =
  | 'assigned'
  | 'cancelled'
  | 'completed'
  | 'in_progress'
  | 'pending';

// fuel_type
export type FuelType =
  | 'benzin'
  | 'dizel'
  | 'elektrik'
  | 'hibrit'
  | 'lpg';

// listing_status
export type ListingStatus =
  | 'active'
  | 'cancelled'
  | 'draft'
  | 'expired'
  | 'pending'
  | 'rejected'
  | 'sold'
  | 'sold_pending_confirmation';

// listing_type
export type ListingType = 'auction' | 'free' | 'premium_auction';

// notification_type
export type NotificationType =
  | 'auction_lost'
  | 'auction_won'
  | 'bid_received'
  | 'expertise_update'
  | 'listing_approved'
  | 'listing_rejected'
  | 'message_received'
  | 'promotion_request'
  | 'system';

// seat_hold_status
export type SeatHoldStatus =
  | 'forfeited'
  | 'holding'
  | 'left_auction'
  | 'released'
  | 'won';

// site_logo_usage
export type SiteLogoUsage =
  | 'email'
  | 'favicon'
  | 'header'
  | 'header_dark'
  | 'login'
  | 'mobile'
  | 'og_image'
  | 'print';

// transport_mode
export type TransportMode = 'owner' | 'valet';

// transmission_type
export type TransmissionType = 'manuel' | 'otomatik' | 'yarı_otomatik';

// tx_status
export type TxStatus = 'cancelled' | 'completed' | 'failed' | 'pending';

// tx_type
export type TxType =
  | 'auction_payment'
  | 'deposit'
  | 'expertise_payment'
  | 'payment'
  | 'premium_payment'
  | 'refund'
  | 'withdraw';

// user_account_type
export type UserAccountType = 'dealer' | 'individual';

// user_role
export type UserRole = 'admin' | 'dealer' | 'user';

// vote_type
export type VoteType = 'fair_price' | 'price_too_high' | 'price_too_low';

// =====================================================
// TABLES
// =====================================================

// admin_activity_logs
export interface AdminActivityLog {
  action: string;
  actor_id: string;
  created_at: string;
  entity_id: string | null;
  entity_type: string | null;
  id: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  user_agent: string | null;
}

// admin_permissions
export interface AdminPermission {
  admin_user_id: string;
  area: AdminPermissionArea;
  can_approve: boolean;
  can_delete: boolean;
  can_edit: boolean;
  can_view: boolean;
  created_at: string;
  id: string;
}

// admin_users
export interface AdminUser {
  created_at: string;
  created_by: string | null;
  full_name: string | null;
  id: string;
  is_active: boolean;
  is_super_admin: boolean;
  last_login_at: string | null;
  updated_at: string;
  user_id: string | null;
  username: string;
}

// ad_campaigns
export interface AdCampaign {
  advertiser_name: string | null;
  budget_daily: number | null;
  budget_total: number | null;
  created_at: string;
  created_by: string | null;
  end_date: string;
  id: string;
  name: string;
  priority: number;
  start_date: string;
  status: AdCampaignStatus;
  target_categories: string[] | null;
  target_cities: string[] | null;
  target_pages: string[] | null;
  updated_at: string;
}

// ad_clicks
export interface AdClick {
  clicked_at: string;
  creative_id: string;
  id: string;
  session_id: string | null;
  slot_id: string;
  user_id: string | null;
}

// ad_creatives
export interface AdCreative {
  alt_text: string | null;
  call_to_action: string | null;
  campaign_id: string;
  created_at: string;
  end_at: string | null;
  id: string;
  image_url: string;
  is_active: boolean;
  link_target: string | null;
  link_url: string;
  mobile_image_url: string | null;
  start_at: string | null;
  subtitle: string | null;
  title: string | null;
  updated_at: string;
  weight: number;
}

// ad_impressions
export interface AdImpression {
  creative_id: string;
  id: string;
  ip_address: string | null;
  page_url: string | null;
  session_id: string | null;
  slot_id: string;
  user_agent: string | null;
  user_id: string | null;
  viewed_at: string;
}

// ad_placements
export interface AdPlacement {
  creative_id: string;
  id: string;
  is_active: boolean;
  slot_id: string;
  sort_order: number;
}

// ad_slots
export interface AdSlot {
  code: string;
  created_at: string;
  description: string | null;
  display_rule: Record<string, unknown>;
  height: number | null;
  id: string;
  is_active: boolean;
  max_creatives: number;
  name: string;
  position: AdSlotPosition;
  sort_order: number;
  width: number | null;
}

// auction_promotion_requests
export interface AuctionPromotionRequest {
  admin_notes: string | null;
  created_at: string;
  decided_at: string | null;
  decided_by: string | null;
  id: string;
  reason: string | null;
  resulting_auction_id: string | null;
  status: string;
  trigger_type: string;
  updated_at: string;
  vehicle_id: string;
  vote_count_fair: number;
  vote_count_high: number;
  vote_count_low: number;
}

// auction_seat_holds
export interface AuctionSeatHold {
  amount: number;
  auction_id: string;
  bid_id: string | null;
  created_at: string;
  id: string;
  left_at: string | null;
  released_at: string | null;
  seat_number: number | null;
  status: SeatHoldStatus;
  updated_at: string;
  user_id: string;
}

// auction_seat_transactions
export interface AuctionSeatTransaction {
  amount: number;
  auction_id: string;
  balance_after: number | null;
  created_at: string;
  id: string;
  metadata: Record<string, unknown> | null;
  reference_transaction_id: string | null;
  seat_hold_id: string;
  transaction_type: string;
  user_id: string;
}

// auction_slots
export interface AuctionSlot {
  created_at: string;
  end_time: string;
  id: string;
  is_active: boolean;
  max_items: number;
  slot_date: string;
  start_time: string;
}

// auctions
export interface Auction {
  anti_snipe_seconds: number | null;
  bid_increment: number;
  created_at: string;
  current_price: number;
  deleted_at: string | null;
  deleted_by: string | null;
  duration_minutes: number | null;
  ended_at: string | null;
  end_at: string;
  final_price: number | null;
  id: string;
  live_ends_at: string | null;
  live_started_at: string | null;
  max_seats: number | null;
  min_bid_increment: number | null;
  opening_price: number;
  promotion_request_id: string | null;
  seat_hold_fee: number | null;
  seller_auto_approval_at: string | null;
  seller_confirmed: boolean;
  seller_confirmed_at: string | null;
  slot_id: string | null;
  start_at: string;
  status: AuctionStatus;
  total_bids: number;
  vehicle_id: string;
  winner_id: string | null;
  winning_bid_id: string | null;
}

// audit_logs
export interface AuditLog {
  action: string;
  actor_id: string | null;
  actor_type: string;
  created_at: string;
  entity_id: string | null;
  entity_type: string | null;
  id: string;
  ip_address: string | null;
  metadata: Record<string, unknown> | null;
  user_agent: string | null;
}

// bids
export interface Bid {
  amount: number;
  auction_id: string;
  bidder_id: string;
  created_at: string;
  id: string;
  is_winning: boolean;
}

// categories
export interface Category {
  created_at: string;
  description: string | null;
  icon_url: string | null;
  id: string;
  is_active: boolean;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
}

// cities
export interface City {
  created_at: string;
  id: string;
  is_active: boolean;
  name: string;
  plate_code: string | null;
  sort_order: number;
}

// conversations
export interface Conversation {
  created_at: string;
  deleted_at: string | null;
  id: string;
  last_message_at: string;
  last_message_preview: string | null;
  participant_a: string;
  participant_b: string;
  updated_at: string;
  vehicle_id: string | null;
}

// dealerships
export interface Dealership {
  address: string | null;
  approved_at: string | null;
  approved_by: string | null;
  city: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  description: string | null;
  district: string | null;
  email: string | null;
  id: string;
  logo_url: string | null;
  name: string;
  owner_id: string;
  phone: string | null;
  status: DealershipStatus;
  tax_number: string | null;
  type: DealershipType;
  updated_at: string;
}

// districts
export interface District {
  city_id: string;
  created_at: string;
  id: string;
  is_active: boolean;
  name: string;
  sort_order: number;
}

// email_logs
export interface EmailLog {
  created_at: string;
  error_message: string | null;
  from_address: string;
  id: string;
  metadata: Record<string, unknown> | null;
  provider: string | null;
  provider_message_id: string | null;
  sent_at: string | null;
  status: string;
  subject: string;
  template_key: string | null;
  to_address: string;
  to_user_id: string | null;
}

// email_suppressions
export interface EmailSuppression {
  created_at: string;
  email: string;
  id: string;
  reason: string;
  source: string | null;
}

// email_templates
export interface EmailTemplate {
  body_html: string;
  body_text: string | null;
  created_at: string;
  description: string | null;
  id: string;
  is_active: boolean;
  is_marketing: boolean;
  key: string;
  subject: string;
  updated_at: string;
  variables: unknown[];
}

// engine_sizes
export interface EngineSize {
  created_at: string;
  displacement: string;
  id: string;
  is_active: boolean;
  sort_order: number;
}

// expertise_dealerships
export interface ExpertiseDealership {
  address: string | null;
  approved_at: string | null;
  approved_by: string | null;
  city: string;
  contact_person: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  description: string | null;
  district: string | null;
  email: string | null;
  franchise_code: string | null;
  id: string;
  logo_url: string | null;
  name: string;
  owner_id: string;
  phone: string | null;
  report_template_url: string | null;
  service_areas: string[] | null;
  status: DealershipStatus;
  tax_number: string | null;
  updated_at: string;
}

// expertise_process_steps
export interface ExpertiseProcessStep {
  actor_id: string | null;
  actor_type: string;
  completed_at: string | null;
  created_at: string;
  estimated_completion_at: string | null;
  id: string;
  notes: string | null;
  photo_urls: string[] | null;
  request_id: string;
  step_type: ExpertiseProcessStatus;
}

// expertise_requests
export interface ExpertiseRequest {
  address: string | null;
  appointment_date: string | null;
  assigned_admin_id: string | null;
  brand_id: string | null;
  city: string;
  completed_at: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  expert_notes: string | null;
  expert_valet_id: string | null;
  expertise_dealership_id: string | null;
  fee: number | null;
  fee_paid: boolean;
  id: string;
  km: number | null;
  model_id: string | null;
  plate: string | null;
  process_status: ExpertiseProcessStatus;
  rated_at: string | null;
  rating_id: string | null;
  report_url: string | null;
  scheduled_date: string | null;
  status: ExpertiseStatus;
  transport_mode: TransportMode;
  updated_at: string;
  user_id: string;
  vehicle_id: string | null;
  year: number | null;
}

// expert_valets
export interface ExpertValet {
  average_rating: number | null;
  city: string;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  full_name: string;
  id: string;
  is_active: boolean;
  license_plate: string | null;
  phone: string;
  photo_url: string | null;
  total_ratings: number;
  total_tasks: number;
  updated_at: string;
  user_id: string;
  vehicle_info: string | null;
}

// favorites
export interface Favorite {
  created_at: string;
  id: string;
  user_id: string;
  vehicle_id: string;
}

// free_listing_votes
export interface FreeListingVote {
  created_at: string;
  id: string;
  user_id: string;
  vehicle_id: string;
  vote_type: VoteType;
}

// messages
export interface Message {
  attachment_urls: string[] | null;
  content: string;
  conversation_id: string;
  created_at: string;
  deleted_at: string | null;
  id: string;
  is_read: boolean;
  read_at: string | null;
  sender_id: string;
}

// notifications
export interface Notification {
  action_url: string | null;
  body: string;
  created_at: string;
  deleted_at: string | null;
  id: string;
  is_read: boolean;
  metadata: Record<string, unknown> | null;
  read_at: string | null;
  title: string;
  type: NotificationType;
  user_id: string;
}

// profiles
export interface Profile {
  account_type: UserAccountType;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  district: string | null;
  email: string | null;
  email_verified_at: string | null;
  expertise_dealership_id: string | null;
  full_name: string | null;
  id: string;
  is_phone_verified: boolean;
  last_seen_at: string | null;
  locale: string | null;
  notification_preferences: Record<string, boolean>;
  phone: string | null;
  phone_verified_at: string | null;
  role: UserRole;
  updated_at: string;
  valet_id: string | null;
  wallet_balance: number;
}

// saved_searches
export interface SavedSearch {
  created_at: string;
  filters: Record<string, unknown>;
  id: string;
  is_active: boolean;
  last_notified_at: string | null;
  name: string;
  notify_new_listings: boolean;
  updated_at: string;
  user_id: string;
}

// site_logos
export interface SiteLogo {
  alt_text: string | null;
  file_type: string | null;
  file_url: string;
  height: number | null;
  id: string;
  is_transparent: boolean;
  uploaded_at: string;
  uploaded_by: string | null;
  usage: SiteLogoUsage;
  width: number | null;
}

// site_settings
export interface SiteSettings {
  accent_color: string;
  auction_anti_snipe_seconds: number;
  auction_default_duration_minutes: number;
  auction_listing_fee: number;
  premium_auction_fee: number;
  auction_countdown_refresh_ms: number;
  auction_seat_capacity: number;
  auction_seat_hold_fee: number;
  auction_seller_auto_approval_hours: number;
  contact_email: string | null;
  contact_phone: string | null;
  email_from_address: string | null;
  email_from_name: string;
  email_marketing_enabled: boolean;
  expertise_fee: number;
  expertise_valet_commission: number;
  favicon_url: string | null;
  featured_listing_fee: number;
  footer_html: string | null;
  free_listing_duration_days: number;
  free_listing_extra_fee: number;
  free_listing_user_quota: number;
  free_listing_vote_threshold: number;
  header_html: string | null;
  id: number;
  logo_size: string | null;
  logo_url: string | null;
  min_bid_increment: number;
  primary_color: string;
  secondary_color: string;
  site_name: string;
  smtp_config: Record<string, unknown>;
  updated_at: string;
  updated_by: string | null;
}

// site_themes
export interface SiteTheme {
  accent_color: string;
  background_color: string;
  body_line_height: number;
  border_color: string;
  border_radius_lg: string;
  border_radius_md: string;
  border_radius_sm: string;
  button_style: string;
  danger_color: string;
  font_family_base: string;
  font_family_heading: string;
  font_size_base: string;
  font_weight_bold: number;
  font_weight_normal: number;
  heading_line_height: number;
  id: number;
  info_color: string;
  is_active: boolean;
  primary_color: string;
  secondary_color: string;
  shadow_lg: string;
  shadow_md: string;
  shadow_sm: string;
  success_color: string;
  surface_color: string;
  text_color: string;
  text_muted_color: string;
  updated_at: string;
  updated_by: string | null;
  warning_color: string;
}

// transactions
export interface Transaction {
  amount: number;
  balance_after: number | null;
  completed_at: string | null;
  created_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
  description: string | null;
  id: string;
  payment_method: string | null;
  payment_provider: string | null;
  provider_transaction_id: string | null;
  receipt_url: string | null;
  reference_id: string | null;
  related_auction_id: string | null;
  related_vehicle_id: string | null;
  status: TxStatus;
  type: TxType;
  updated_at: string;
  user_id: string;
}

// valet_ratings
export interface ValetRating {
  comment: string | null;
  created_at: string;
  expertise_request_id: string | null;
  id: string;
  rating: number;
  user_id: string;
  valet_id: string;
}

// vehicle_brands
export interface VehicleBrand {
  created_at: string;
  id: string;
  is_active: boolean;
  logo_url: string | null;
  name: string;
  sort_order: number;
}

// vehicle_images
export interface VehicleImage {
  alt_text: string | null;
  created_at: string;
  height: number | null;
  id: string;
  sort_order: number;
  url: string;
  vehicle_id: string;
  width: number | null;
}

// vehicle_models
export interface VehicleModel {
  brand_id: string;
  created_at: string;
  id: string;
  is_active: boolean;
  name: string;
  sort_order: number;
}

// vehicle_reports
export interface VehicleReport {
  admin_notes: string | null;
  created_at: string;
  description: string;
  id: string;
  reason: string;
  reporter_id: string;
  resolution: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  status: string;
  updated_at: string;
  vehicle_id: string;
}

// vehicle_views
export interface VehicleView {
  id: string;
  ip_address: string | null;
  is_unique: boolean;
  referrer: string | null;
  user_agent: string | null;
  user_id: string | null;
  vehicle_id: string;
  viewed_at: string;
}

// vehicles
export interface Vehicle {
  approved_at: string | null;
  approved_by: string | null;
  body: BodyType;
  brand_id: string;
  category_id: string | null;
  city: string;
  color: string | null;
  contact_hidden: boolean;
  contact_revealed_to: string | null;
  created_at: string;
  damage_detail: string | null;
  damage_record: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  description: string | null;
  district: string | null;
  engine_power_kw: number | null;
  engine_size_id: string | null;
  exchange_accepted: boolean;
  expires_at: string | null;
  favorite_count: number;
  free_listing_expires_at: string | null;
  fuel: FuelType;
  id: string;
  is_premium: boolean;
  is_promoted_to_auction: boolean;
  km: number;
  last_bump_at: string | null;
  listing_origin: string | null;
  listing_type: ListingType;
  min_price: number | null;
  model_id: string | null;
  price: number;
  published_at: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;
  rejected_by: string | null;
  search_tsv: unknown | null;
  seller_id: string;
  slug: string | null;
  status: ListingStatus;
  title: string;
  transmission: TransmissionType;
  updated_at: string;
  view_count: number;
  view_count_unique: number;
  vote_count_fair: number;
  vote_count_high: number;
  vote_count_low: number;
  year: number;
}

// vehicle_with_relations: Active listing + brand/model/images/seller/auction
export interface VehicleWithRelations extends Vehicle {
  brand?: VehicleBrand;
  images?: VehicleImage[];
  model?: VehicleModel | null;
  seller?: Profile;
  auction?: Auction | null;
  city_name?: string;
  district_name?: string;
  brand_name?: string;
  model_name?: string;
  category_name?: string;
  engine_size?: string;
}

// =====================================================
// VIEWS
// =====================================================

export interface VActiveAuction {
  id: string;
  vehicle_id: string;
  title: string;
  brand_id: string;
  model_id: string | null;
  year: number;
  km: number;
  fuel: FuelType;
  transmission: TransmissionType;
  body: BodyType;
  city: string;
  is_premium: boolean;
  contact_hidden: boolean;
  current_price: number;
  opening_price: number;
  bid_increment: number;
  start_at: string;
  end_at: string;
  status: AuctionStatus;
  winner_id: string | null;
  total_bids: number;
  max_seats: number | null;
  seat_hold_fee: number | null;
  live_ends_at: string | null;
  final_price: number | null;
  seats_used: number;
  seats_remaining: number;
  slug: string | null;
  seller_id: string;
}

export interface VAuctionSeatsRemaining {
  auction_id: string;
  max_seats: number;
  seats_holding: number;
  seats_won: number;
  seats_available: number;
}

export interface VUserWalletSummary {
  user_id: string;
  current_balance: number;
  total_pending: number;
  total_in: number;
  total_out: number;
  total_transactions: number;
}

// =====================================================
// DATABASE
// =====================================================

// Loose Database type for createClient<Database> generic.
// Tüm tablolar any — call site'ta type cast ile kullanılır.
export interface Database {
  public: {
    Tables: Record<string, {
      Row: Record<string, unknown>;
      Insert: Record<string, unknown>;
      Update: Record<string, unknown>;
      Relationships: unknown[];
    }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, unknown>;
    Enums: Record<string, string>;
  };
}

// =====================================================
// LABELS (Türkçe UI için)
// =====================================================

export const FUEL_LABELS: Record<FuelType, string> = {
  benzin: 'Benzin',
  dizel: 'Dizel',
  elektrik: 'Elektrik',
  hibrit: 'Hibrit',
  lpg: 'LPG & Benzin',
};

export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manuel: 'Manuel',
  otomatik: 'Otomatik',
  'yarı_otomatik': 'Yarı Otomatik',
};

export const BODY_LABELS: Record<BodyType, string> = {
  cabrio: 'Cabrio',
  coupe: 'Coupe',
  hatchback: 'Hatchback',
  minivan: 'Minivan',
  mpv: 'MPV',
  pickup: 'Pickup',
  sedan: 'Sedan',
  'station wagon': 'Station Wagon',
  suv: 'SUV',
};

export const STATUS_LABELS: Record<ListingStatus, string> = {
  active: 'Yayında',
  cancelled: 'İptal',
  draft: 'Taslak',
  expired: 'Süresi Doldu',
  pending: 'Onay Bekliyor',
  rejected: 'Reddedildi',
  sold: 'Satıldı',
  sold_pending_confirmation: 'Onay Bekliyor (Satıcı)',
};

export const AUCTION_STATUS_LABELS: Record<AuctionStatus, string> = {
  cancelled: 'İptal',
  ended: 'Tamamlandı',
  live: 'Canlı',
  scheduled: 'Planlandı',
  sold_pending_confirmation: 'Satıcı Onayı Bekliyor',
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  auction: 'Açık Arttırma',
  free: 'Ücretsiz İlan',
  premium_auction: 'Premium Açık Arttırma',
};

export const VOTE_LABELS: Record<VoteType, string> = {
  fair_price: 'Adil Fiyat',
  price_too_high: 'Fiyat Yüksek',
  price_too_low: 'Fiyat Düşük',
};

export const SEAT_HOLD_STATUS_LABELS: Record<SeatHoldStatus, string> = {
  forfeited: 'Kesildi (Kazandı)',
  holding: 'Bloke Edildi',
  left_auction: 'Masadan Ayrıldı',
  released: 'Çözüldü',
  won: 'Kazandı',
};


// =====================================================
// KURUMSAL HESAP (BAYİ) TİPLERİ
// =====================================================
export type BusinessType = 'individual_company' | 'limited_company';
export type CorporateApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface CorporateApplication {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city_id: string;
  district_id: string;
  neighborhood: string;
  business_type: BusinessType;
  tax_office_city_id: string;
  tax_office_district_id: string;
  tax_office_name: string;
  tax_id_number: string;
  tc_id_number: string;
  password_temp: string | null;
  status: CorporateApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}


// =====================================================
// EKSPER VALE + EKSPERTİZ BAYİSİ SİSTEMİ
// =====================================================

export type ExpertiseRequestType = 'self_transport' | 'valet_transport';
export type ValetDocumentStatus = 'pending' | 'approved' | 'rejected';
export type PaymentRecipientType = 'valet' | 'franchise';
export type PaymentStatus = 'pending' | 'paid';
export type ExpertiseResultStatus = 'in_progress' | 'valet_completed' | 'dealership_completed' | 'fully_completed';

export interface ExpertValetApplication {
  id: string;
  first_name: string;
  last_name: string;
  tc_id_number: string;
  email: string;
  phone: string;
  city_id: string | null;
  district_id: string | null;
  neighborhood: string | null;
  license_number: string;
  license_class: string;
  vehicle_info: string | null;
  contract_accepted_at: string;
  password_temp: string | null;
  status: CorporateApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface ExpertiseDealershipApplication {
  id: string;
  company_name: string;
  tax_id_number: string;
  tax_office_name: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city_id: string | null;
  district_id: string | null;
  service_areas: string[];
  logo_url: string | null;
  description: string | null;
  contract_accepted_at: string;
  password_temp: string | null;
  status: CorporateApplicationStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_user_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface ExpertiseResult {
  id: string;
  expertise_request_id: string;
  valet_notes: string | null;
  valet_observations: Record<string, unknown> | null;
  valet_photo_urls: string[];
  valet_uploaded_at: string | null;
  valet_uploaded_by: string | null;
  dealership_checklist: Record<string, unknown> | null;
  dealership_report_url: string | null;
  dealership_notes: string | null;
  dealership_uploaded_at: string | null;
  dealership_uploaded_by: string | null;
  status: ExpertiseResultStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PaymentRecord {
  id: string;
  recipient_type: PaymentRecipientType;
  recipient_id: string;
  expertise_request_id: string | null;
  amount: number;
  iban: string | null;
  period_year: number;
  period_month: number;
  status: PaymentStatus;
  paid_at: string | null;
  paid_by: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_by: string | null;
}
