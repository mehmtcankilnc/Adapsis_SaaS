CREATE TABLE product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_required BOOLEAN DEFAULT true,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, group_name)
);

CREATE INDEX idx_product_variants_product_id ON product_variants(product_id);
