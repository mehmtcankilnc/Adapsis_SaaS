-- Updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_product_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

-- Helper function to get role
CREATE OR REPLACE FUNCTION get_user_role() RETURNS TEXT AS $$
  SELECT (auth.jwt() -> 'user_metadata' ->> 'role')::TEXT;
$$ LANGUAGE sql STABLE;

-- Admins: FULL ACCESS
CREATE POLICY "Admins have full access to categories" ON categories FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admins have full access to products" ON products FOR ALL USING (get_user_role() = 'admin');
CREATE POLICY "Admins have full access to product variants" ON product_variants FOR ALL USING (get_user_role() = 'admin');

-- Sales: READ ONLY (Active)
CREATE POLICY "Sales can view active categories" ON categories 
  FOR SELECT USING (get_user_role() = 'sales' AND is_active = true);

CREATE POLICY "Sales can view active products" ON products 
  FOR SELECT USING (get_user_role() = 'sales' AND is_active = true);

CREATE POLICY "Sales can view variants of active products" ON product_variants 
  FOR SELECT USING (
    get_user_role() = 'sales' AND 
    EXISTS (
      SELECT 1 FROM products 
      WHERE products.id = product_variants.product_id 
      AND products.is_active = true
    )
  );
