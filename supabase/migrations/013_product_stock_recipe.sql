-- =============================================
-- Adapsis: Ürün Stok Reçetesi (Bill of Materials)
-- products tablosuna stock_recipe JSONB sütunu ekle
-- Format: [{ "inventory_id": "uuid", "amount": number }]
-- =============================================

ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_recipe JSONB NOT NULL DEFAULT '[]'::jsonb;
