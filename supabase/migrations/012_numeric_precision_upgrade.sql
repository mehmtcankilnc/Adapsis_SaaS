-- =============================================
-- Adapsis: Fiyat Sütunları Hassasiyet Yükseltme
-- NUMERIC(10,2) / NUMERIC(12,2) → NUMERIC(20,2)
-- 300M+ TRY gibi büyük rakamları desteklemek için
-- =============================================

-- 1. PRODUCTS tablosu
ALTER TABLE public.products
  ALTER COLUMN base_price TYPE NUMERIC(20,2);

-- 2. QUOTES tablosu
ALTER TABLE public.quotes
  ALTER COLUMN base_price_snapshot TYPE NUMERIC(20,2);

ALTER TABLE public.quotes
  ALTER COLUMN final_price TYPE NUMERIC(20,2);

-- 3. INVENTORY tablosu (stok miktarları da yüksek olabilir)
ALTER TABLE public.inventory
  ALTER COLUMN stock_level TYPE NUMERIC(20,2);

ALTER TABLE public.inventory
  ALTER COLUMN reserved_stock TYPE NUMERIC(20,2);
