// Hand-written DB types matching schema.sql

export type UserRole = 'user' | 'dealer' | 'admin';
export type FuelType = 'benzin' | 'dizel' | 'lpg' | 'elektrik' | 'hibrit';
export type TransmissionType = 'manuel' | 'otomatik' | 'yarı_otomatik';
export type BodyType = 'sedan' | 'hatchback' | 'station wagon' | 'suv' | 'pickup' | 'minivan' | 'coupe' | 'cabrio' | 'mpv';
export type ListingType = 'free' | 'auction' | 'premium_auction';
export type ListingStatus = 'draft' | 'pending' | 'active' | 'sold' | 'expired' | 'rejected' | 'cancelled';
export type AuctionStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';
export type TxType = 'deposit' | 'withdraw' | 'payment' | 'refund' | 'auction_payment' | 'premium_payment' | 'expertise_payment';
export type TxStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
export type ExpertiseStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
export type DealershipStatus = 'pending' | 'active' | 'suspended' | 'rejected';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  city: string | null;
  district: string | null;
  avatar_url: string | null;
  role: UserRole;
  wallet_balance: number;
  created_at: string;
  updated_at: string;
}

export interface VehicleBrand {
  id: string;
  name: string;
  logo_url: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface VehicleModel {
  id: string;
  brand_id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface EngineSize {
  id: string;
  displacement: string;
  sort_order: number;
  is_active: boolean;
}

export interface Vehicle {
  id: string;
  seller_id: string;
  dealership_id: string | null;
  title: string;
  brand_id: string;
  model_id: string | null;
  year: number;
  km: number;
  fuel: FuelType;
  transmission: TransmissionType;
  body: BodyType;
  engine_size_id: string | null;
  engine_power_kw: number | null;
  color: string | null;
  price: number;
  city: string;
  district: string | null;
  damage_record: boolean;
  damage_detail: string | null;
  exchange_accepted: boolean;
  description: string | null;
  listing_type: ListingType;
  status: ListingStatus;
  is_premium: boolean;
  view_count: number;
  favorite_count: number;
  contact_hidden: boolean;
  contact_revealed_to: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface VehicleImage {
  id: string;
  vehicle_id: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface VehicleWithRelations extends Vehicle {
  brand?: VehicleBrand;
  model?: VehicleModel | null;
  images?: VehicleImage[];
  seller?: Profile;
  auction?: Auction | null;
}

export interface Auction {
  id: string;
  vehicle_id: string;
  slot_id: string | null;
  opening_price: number;
  current_price: number;
  bid_increment: number;
  start_at: string;
  end_at: string;
  status: AuctionStatus;
  winner_id: string | null;
  winning_bid_id: string | null;
  total_bids: number;
  ended_at: string | null;
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_id: string;
  amount: number;
  is_winning: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: TxType;
  amount: number;
  status: TxStatus;
  payment_method: string | null;
  reference_id: string | null;
  description: string | null;
  related_vehicle_id: string | null;
  related_auction_id: string | null;
  receipt_url: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Conversation {
  id: string;
  participant_a: string;
  participant_b: string;
  vehicle_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  vehicle_id: string;
  created_at: string;
}

export interface ExpertiseRequest {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  brand_id: string | null;
  model_id: string | null;
  year: number | null;
  plate: string | null;
  km: number | null;
  city: string;
  address: string | null;
  status: ExpertiseStatus;
  assigned_admin_id: string | null;
  expert_notes: string | null;
  report_url: string | null;
  scheduled_date: string | null;
  fee: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface Dealership {
  id: string;
  owner_id: string;
  name: string;
  tax_number: string | null;
  city: string;
  district: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  description: string | null;
  status: DealershipStatus;
  approved_at: string | null;
  approved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SiteSettings {
  id: number;
  site_name: string;
  logo_url: string | null;
  logo_size: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  header_html: string | null;
  footer_html: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  auction_listing_fee: number;
  premium_auction_fee: number;
  expertise_fee: number;
  auction_default_duration_minutes: number;
  auction_countdown_refresh_ms: number;
  updated_at: string;
}

export interface AuctionSlot {
  id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_items: number;
  is_active: boolean;
  created_at: string;
}

// Loose Database type for createClient<Database> generic.
// We use `any` for table row types so that .from('xxx').select('*') returns
// `any` rather than the strict `SelectQueryError<"Invalid Relationships…">`.
// Cast through `as unknown as T` at the call site for type safety.
export interface Database {
  public: {
    Tables: Record<string, { Row: any; Insert: any; Update: any; Relationships: any[] }>;
    Views: any;
    Functions: any;
    Enums: any;
  };
}

// Helpers
export const FUEL_LABELS: Record<FuelType, string> = {
  benzin: 'Benzin', dizel: 'Dizel', lpg: 'LPG & Benzin', elektrik: 'Elektrik', hibrit: 'Hibrit',
};
export const TRANSMISSION_LABELS: Record<TransmissionType, string> = {
  manuel: 'Manuel', otomatik: 'Otomatik', 'yarı_otomatik': 'Yarı Otomatik',
};
export const BODY_LABELS: Record<BodyType, string> = {
  sedan: 'Sedan', hatchback: 'Hatchback', 'station wagon': 'Station Wagon',
  suv: 'SUV', pickup: 'Pickup', minivan: 'Minivan', coupe: 'Coupe', cabrio: 'Cabrio', mpv: 'MPV',
};
export const STATUS_LABELS: Record<ListingStatus, string> = {
  draft: 'Taslak', pending: 'Onay Bekliyor', active: 'Yayında',
  sold: 'Satıldı', expired: 'Süresi Doldu', rejected: 'Reddedildi', cancelled: 'İptal',
};
