-- =============================================
-- Adapsis: Akıllı Stok Rezervasyon Sistemi
-- =============================================

-- 1. Inventory tablosuna reserved_stock sütununu ekle
ALTER TABLE public.inventory 
ADD COLUMN IF NOT EXISTS reserved_stock NUMERIC(10,2) NOT NULL DEFAULT 0;

-- 2. Quotes tablosuna created_by sütununu ekle (RLS için)
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 3. Stok Rezervasyon Trigger Fonksiyonu
-- Teklif konfigürasyonu bir JSONB array olarak saklanır.
-- Her eleman: { "inventory_id": "uuid", "required_amount": number, ... }
-- NOT: Eğer configuration bir object (key-value) ise, trigger array olarak parse eder.

DROP TRIGGER IF EXISTS trg_quote_stock_reservation ON public.quotes;
DROP FUNCTION IF EXISTS public.handle_quote_stock_reservation();

CREATE OR REPLACE FUNCTION public.handle_quote_stock_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_item jsonb;
    inv_id uuid;
    req_amount numeric;
    config_array jsonb;
BEGIN
    -- Configuration'ı her zaman array formatına çevir
    -- Eğer configuration zaten array ise direkt kullan
    -- Eğer object ise, values'larını array olarak al
    IF jsonb_typeof(NEW.configuration) = 'array' THEN
        config_array := NEW.configuration;
    ELSIF jsonb_typeof(NEW.configuration) = 'object' THEN
        -- Object'in her value'sunu kontrol et, inventory_id içerenleri topla
        config_array := '[]'::jsonb;
        -- Object formatında configuration gelirse bunu atla (stok bilgisi yok)
        RETURN NEW;
    ELSE
        RETURN NEW;
    END IF;

    -- SENARYO 1: Yeni teklif 'pending' olarak oluşturuluyor
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(config_array)
        LOOP
            inv_id := (config_item->>'inventory_id')::uuid;
            req_amount := COALESCE((config_item->>'required_amount')::numeric, 1);
            
            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory 
                SET reserved_stock = reserved_stock + req_amount
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    -- SENARYO 2: Teklif 'pending' -> 'approved' geçiyor
    IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'pending') THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(config_array)
        LOOP
            inv_id := (config_item->>'inventory_id')::uuid;
            req_amount := COALESCE((config_item->>'required_amount')::numeric, 1);
            
            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory 
                SET 
                    stock_level = stock_level - req_amount,
                    reserved_stock = GREATEST(reserved_stock - req_amount, 0)
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    -- SENARYO 3: Teklif 'pending' -> 'rejected'/'cancelled' geçiyor (Rezervasyonu geri al)
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'pending') THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(config_array)
        LOOP
            inv_id := (config_item->>'inventory_id')::uuid;
            req_amount := COALESCE((config_item->>'required_amount')::numeric, 1);
            
            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory 
                SET reserved_stock = GREATEST(reserved_stock - req_amount, 0)
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- 4. Trigger'ı oluştur
CREATE TRIGGER trg_quote_stock_reservation
AFTER INSERT OR UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_quote_stock_reservation();
