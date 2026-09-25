-- =============================================
-- categories.slug / products.sku / inventory.sku artık organizasyon
-- başına benzersiz olmalı, global değil — aksi halde iki farklı organizasyon
-- aynı slug/SKU'yu kullanamaz (örn. iki şirket de "elektrik-panolari"
-- kategorisi açamaz).
-- =============================================

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_slug_key;
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_org_slug_key;
ALTER TABLE public.categories ADD CONSTRAINT categories_org_slug_key UNIQUE (organization_id, slug);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_sku_key;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_org_sku_key;
ALTER TABLE public.products ADD CONSTRAINT products_org_sku_key UNIQUE (organization_id, sku);

ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_sku_key;
ALTER TABLE public.inventory DROP CONSTRAINT IF EXISTS inventory_org_sku_key;
ALTER TABLE public.inventory ADD CONSTRAINT inventory_org_sku_key UNIQUE (organization_id, sku);
