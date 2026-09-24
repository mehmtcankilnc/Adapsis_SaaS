export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Category extends BaseEntity {
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface StockRecipeItem {
  inventory_id: string;
  amount: number;
}

export interface Product extends BaseEntity {
  category_id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  base_price: number;
  base_currency: string;
  is_active: boolean;
  created_by?: string | null;
  stock_recipe?: StockRecipeItem[];

  category?: Category;
  variants?: ProductVariant[];
  product_variants?: ProductVariant[];
}

export type PriceEffectType = 'fixed' | 'multiplier' | 'percentage';

export interface PriceEffect {
  type: PriceEffectType;
  amount: number;
}

export interface VariantOption {
  label: string;
  value: string;
  price_effect: PriceEffect;
  is_default: boolean;
  metadata?: Record<string, unknown>;
  inventory_item_id?: string | null;
  required_amount?: number;
}

export interface ProductVariant extends BaseEntity {
  product_id: string;
  group_name: string;
  sort_order: number;
  is_required: boolean;
  options: VariantOption[]; // Represents JSONB
}

export type UserRole = 'admin' | 'sales';
export interface CurrentUser {
  id: string;
  email?: string;
  role: UserRole;
}

export type CustomerStatus = 'lead' | 'active' | 'inactive' | 'lost';

export interface Customer extends BaseEntity {
  company_name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  created_by?: string | null;
  status: CustomerStatus;
  owner_id?: string | null;
  industry?: string | null;
  source?: string | null;
  tags: string[];
  notes?: string | null;

  contacts?: Contact[];
  owner_name?: string;
}

export interface Contact extends BaseEntity {
  customer_id: string;
  full_name: string;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  is_primary: boolean;
  notes?: string | null;
  created_by?: string | null;
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'other';

export interface Activity extends BaseEntity {
  customer_id: string;
  quote_id?: string | null;
  type: ActivityType;
  subject: string;
  notes?: string | null;
  activity_date: string;
  created_by?: string | null;

  creator_name?: string;
}

export type TaskStatus = 'pending' | 'completed' | 'cancelled';

export interface Task extends BaseEntity {
  customer_id: string;
  quote_id?: string | null;
  title: string;
  description?: string | null;
  due_date: string;
  assigned_to?: string | null;
  status: TaskStatus;
  completed_at?: string | null;
  created_by?: string | null;

  assignee_name?: string;
  customer_company_name?: string;
}

export type OpportunityStage = 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

export interface Opportunity extends BaseEntity {
  customer_id: string;
  quote_id?: string | null;
  title: string;
  stage: OpportunityStage;
  estimated_value?: number | null;
  currency: string;
  probability?: number | null;
  expected_close_date?: string | null;
  owner_id?: string | null;
  lost_reason?: string | null;
  competitor?: string | null;
  closed_at?: string | null;
  created_by?: string | null;

  owner_name?: string;
  customer_company_name?: string;
}

export interface CustomerDocument {
  id: string;
  customer_id: string;
  file_name: string;
  storage_path: string;
  file_size?: number | null;
  mime_type?: string | null;
  uploaded_by?: string | null;
  created_at: string;

  uploader_name?: string;
}

export interface InventoryItem extends BaseEntity {
  item_name: string;
  sku: string;
  unit: string;
  stock_level: number;
  reserved_stock: number;
}

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'pending_admin_approval';

export interface QuoteConfigurationItem {
  variant_id: string;
  selected_value: string;
  label?: string;
  inventory_id?: string;
  required_amount?: number;
}

export interface Quote extends BaseEntity {
  product_id: string;
  customer_id: string;
  customer_company?: string | null;
  customer_contact?: string | null;
  configuration: QuoteConfigurationItem[];
  base_price_snapshot: number;
  final_price: number;
  currency: string;
  status: QuoteStatus;
  discount_percentage: number;
  created_by?: string | null;
  is_read_by_admin?: boolean;
  is_read_by_sales?: boolean;

  products?: Product;
  customers?: Pick<Customer, 'company_name'>;
  creator_name?: string;
}

export interface QuoteTemplate extends BaseEntity {
  product_id: string;
  name: string;
  configuration: QuoteConfigurationItem[];
  created_by?: string | null;
  creator_name?: string;
}

export type SystemRequestType = 'product' | 'inventory';
export type SystemRequestStatus = 'pending' | 'approved' | 'rejected';

export interface SystemRequest extends BaseEntity {
  request_type: SystemRequestType;
  item_id: string;
  item_name?: string | null;
  requested_by?: string | null;
  request_note: string;
  admin_response?: string | null;
  status: SystemRequestStatus;
  requester_name?: string;
}

export interface GlobalSettings extends BaseEntity {
  company_name?: string | null;
  company_address?: string | null;
  iban?: string | null;
  tax_rate: number;
  default_margin: number;
  quote_footer_text?: string | null;
  discount_approval_threshold: number;
  quote_followup_days: number;
}
