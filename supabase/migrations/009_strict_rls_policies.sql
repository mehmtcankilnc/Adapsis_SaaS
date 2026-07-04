-- Raporlama performansını düşürmemek için Rol getiren fonksiyon
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 1. Tüm tablolarda kesin olarak RLS Aktifleştir
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

-- 2. PRODUCTS (Tüm Satıcılar görüntüleyebilir, Yalnızca ADMIN ekleyebilir/düzenleyebilir)
DROP POLICY IF EXISTS "products_select" ON products;
CREATE POLICY "products_select" ON products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "products_insert" ON products;
CREATE POLICY "products_insert" ON products FOR INSERT TO authenticated WITH CHECK ( public.get_my_role() = 'admin' );

DROP POLICY IF EXISTS "products_update" ON products;
CREATE POLICY "products_update" ON products FOR UPDATE TO authenticated USING ( public.get_my_role() = 'admin' );

DROP POLICY IF EXISTS "products_delete" ON products;
CREATE POLICY "products_delete" ON products FOR DELETE TO authenticated USING ( public.get_my_role() = 'admin' );

-- 3. PRODUCT_VARIANTS (Tüm satıcılar okuyabilir, Sadece ADMIN yönetebilir)
DROP POLICY IF EXISTS "variants_select" ON product_variants;
CREATE POLICY "variants_select" ON product_variants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "variants_all_admin" ON product_variants;
CREATE POLICY "variants_all_admin" ON product_variants FOR ALL TO authenticated USING ( public.get_my_role() = 'admin' ) WITH CHECK ( public.get_my_role() = 'admin' );

-- 4. INVENTORY (Satıcı stokları görür [Konfigürasyon için şart], Sadece ADMIN Envanter Ekler/Tüketir)
DROP POLICY IF EXISTS "inventory_select" ON inventory;
CREATE POLICY "inventory_select" ON inventory FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_admin_all" ON inventory;
CREATE POLICY "inventory_admin_all" ON inventory FOR ALL TO authenticated USING ( public.get_my_role() = 'admin' ) WITH CHECK ( public.get_my_role() = 'admin' );

-- 5. QUOTES (Teklifleri herkes görebilir, sadece giriş yapanlar yeni teklif oluşturabilir, ANCAK onay/red işlemini sadece ADMIN yapabilir)
DROP POLICY IF EXISTS "quotes_select" ON quotes;
CREATE POLICY "quotes_select" ON quotes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "quotes_insert" ON quotes;
CREATE POLICY "quotes_insert" ON quotes FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "quotes_update_admin" ON quotes;
CREATE POLICY "quotes_update_admin" ON quotes FOR UPDATE TO authenticated USING ( public.get_my_role() = 'admin' );
