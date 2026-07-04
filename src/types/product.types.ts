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

export interface Product extends BaseEntity {
  category_id: string;
  name: string;
  sku?: string | null;
  description?: string | null;
  base_price: number;
  base_currency: string;
  is_active: boolean;
  created_by?: string | null;
  
  category?: Category;
  variants?: ProductVariant[];
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
  metadata?: Record<string, any>;
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
