// Tipi condivisi tra apps/guest e apps/dashboard — rispecchiano supabase/schema.sql

export type OrderStatus = "pending" | "confirmed" | "preparing" | "served" | "cancelled";
export type OrderItemStatus =
  | "pending"
  | "sent_to_kitchen"
  | "preparing"
  | "ready"
  | "served"
  | "cancelled";
export type PaymentStatus = "pending" | "succeeded" | "failed" | "refunded";
export type PaymentMethod = "card" | "apple_pay" | "google_pay" | "satispay";
export type PaymentProvider = "stripe" | "satispay";
export type SplitType = "full" | "per_person" | "per_item" | "custom";
export type InvoiceStatus = "pending" | "sent" | "delivered" | "rejected";
export type ReservationStatus = "confirmed" | "seated" | "no_show" | "cancelled";
export type StaffRole = "owner" | "manager" | "waiter" | "kitchen";

export interface Venue {
  id: string;
  name: string;
  slug: string;
  vat_number: string | null;
  sdi_code: string | null;
  currency: string;
  stripe_account_id: string | null;
}

export interface TableRow {
  id: string;
  venue_id: string;
  code: string;
  seats: number;
  qr_token: string;
  active: boolean;
}

export interface MenuItem {
  id: string;
  venue_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  vat_rate: number;
  image_url: string | null;
  allergens: string[] | null;
  available: boolean;
}

export interface Order {
  id: string;
  venue_id: string;
  table_session_id: string;
  status: OrderStatus;
  guest_label: string | null;
  notes: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price_cents: number;
  notes: string | null;
  status: OrderItemStatus;
}

export interface Payment {
  id: string;
  venue_id: string;
  table_session_id: string | null;
  amount_cents: number;
  tip_cents: number;
  method: PaymentMethod;
  provider: PaymentProvider;
  provider_payment_id: string | null;
  split_type: SplitType | null;
  status: PaymentStatus;
}

export interface Invoice {
  id: string;
  venue_id: string;
  payment_id: string;
  status: InvoiceStatus;
  sdi_identifier: string | null;
}

// Prezzi sempre in centesimi interi — mai float su denaro.
export const formatPriceCents = (cents: number, currency = "EUR"): string =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(cents / 100);
