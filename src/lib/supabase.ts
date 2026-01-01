import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Vehicle = {
  id: string;
  vehicle_number?: string;
  brand: string;
  model: string;
  year: number;
  price_usd: number;
  source_country: 'korea' | 'china' | 'georgia';
  source_region: string;
  mileage_km: number;
  fuel_type: string;
  transmission: string;
  color: string;
  engine_capacity: string;
  seats: number;
  images: string[];
  description_ru: string;
  description_kk: string;
  has_inspection_report: boolean;
  status: 'available' | 'reserved' | 'sold';
  created_at: string;
  is_sold?: boolean;
  estimated_delivery_days?: number;
  original_url?: string;
};

export type InspectionReport = {
  id: string;
  vehicle_id: string;
  overall_condition: 'S' | 'A' | 'B' | 'C';
  paint_condition: string;
  newness_rating: number;
  has_accidents: boolean;
  accident_details: string;
  insurance_records: Array<{
    year: number;
    company: string;
    status: string;
  }>;
  inspection_date: string;
  inspector_name: string;
  claim_count: number;
  transfer_count: number;
};

export type InspectionItem = {
  id: string;
  report_id: string;
  category: 'paint' | 'engine' | 'transmission' | 'electrical' | 'interior' | 'exterior';
  item_name: string;
  status: 'good' | 'fair' | 'poor' | 'needs_repair';
  notes: string;
};

export type CostBreakdown = {
  id: string;
  vehicle_id: string;
  transfer_fee: number;
  domestic_transport: number;
  permit_fee: number;
  international_shipping: number;
  declaration_agent_fee: number;
  tariff: number;
  vat: number;
  disposal_tax: number;
  epts_fee: number;
  sbkts_fee: number;
  customs_agent_fee: number;
  registration_fee: number;
  inspection_and_plate_fee: number;
  towing_fee: number;
  other_fees: number;
  total_cost_usd: number;
  estimated_landing_price: number;
  discount_amount: number;
  discount_percentage: number;
};

export type TaxCalculatorConfig = {
  id: string;
  tariff_rate: number;
  vat_rate: number;
  disposal_tax_rate: number;
  registration_fee_new: number;
  registration_fee_2023: number;
  registration_fee_2022: number;
  registration_fee_2021: number;
  registration_fee_old: number;
  epts_fee_min: number;
  epts_fee_max: number;
  sbkts_fee_min: number;
  sbkts_fee_max: number;
  broker_fee: number;
  inspection_fee: number;
  towing_fee: number;
  usd_to_kzt_rate: number;
  updated_at: string;
  updated_by: string | null;
};

export type Order = {
  id: string;
  vehicle_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  order_status: 'pending' | 'paid' | 'in_transit' | 'customs' | 'delivered';
  payment_amount: number;
  payment_date: string;
  estimated_delivery_date: string;
  created_at: string;
};

export type TrackingUpdate = {
  id: string;
  order_id: string;
  status: string;
  location: string;
  description_ru: string;
  description_kk: string;
  timestamp: string;
};

export type OrderDocument = {
  id: string;
  order_id: string;
  document_type: 'contract' | 'payment_proof' | 'chat_log' | 'invoice' | 'other';
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string;
  description_ru?: string;
  description_kk?: string;
  created_at: string;
};
