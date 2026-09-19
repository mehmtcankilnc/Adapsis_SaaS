-- =============================================
-- FIX: Trigger'a stock_recipe (Malzeme Reçetesi) fallback'i eklendi
-- =============================================
-- Canlı veriyi incelerken ortaya çıktı: sistemdeki HİÇBİR gerçek ürünün
-- varyant seçeneği `inventory_item_id` taşımıyor (admin ürün formunda böyle
-- bir alan yok) — tüm gerçek ürünler stok takibini `products.stock_recipe`
-- (Malzeme Reçetesi) üzerinden yapıyor. Eski uygulama kodunda
-- (quote.actions.ts, migration 016 ile kaldırıldı) `configuration` içinde
-- envanter bilgisi yoksa `product.stock_recipe`'e fallback yapan bir mantık
-- vardı. migration 016'daki trigger bu fallback'i içermiyordu, yani
-- 016'nın app-level kodu kaldırmasıyla birlikte gerçek ürünler için stok
-- düşme mekanizması tamamen devre dışı kalmıştı. Bu migration, trigger'a
-- aynı önceliği (önce configuration, yoksa stock_recipe) geri kazandırır.

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
    has_config_stock boolean := false;
    recipe_array jsonb;
BEGIN
    IF jsonb_typeof(NEW.configuration) = 'array' THEN
        config_array := NEW.configuration;
    ELSE
        config_array := '[]'::jsonb;
    END IF;

    -- Configuration array'inde en az bir envanter bağlantılı kalem var mı?
    SELECT EXISTS (
        SELECT 1 FROM jsonb_array_elements(config_array) AS ci
        WHERE ci->>'inventory_id' IS NOT NULL
    ) INTO has_config_stock;

    IF has_config_stock THEN
        -- Kaynak 1 (öncelikli): varyant seçimindeki envanter bağlantıları
        recipe_array := config_array;
    ELSE
        -- Kaynak 2 (fallback): ürünün Malzeme Reçetesi (stock_recipe).
        -- stock_recipe elemanları {inventory_id, amount} formatında;
        -- config elemanlarıyla aynı işleyebilmek için "amount" alanını
        -- "required_amount" olarak yeniden adlandırıyoruz.
        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'inventory_id', item->>'inventory_id',
                    'required_amount', COALESCE(item->>'amount', '1')
                )
            ),
            '[]'::jsonb
        )
        INTO recipe_array
        FROM products, jsonb_array_elements(
            CASE WHEN jsonb_typeof(products.stock_recipe) = 'array'
                 THEN products.stock_recipe ELSE '[]'::jsonb END
        ) AS item
        WHERE products.id = NEW.product_id;

        recipe_array := COALESCE(recipe_array, '[]'::jsonb);
    END IF;

    -- SENARYO 1: Yeni teklif oluşturuluyor ve onay bekleyen bir durumda
    -- ('pending' ya da 'pending_admin_approval') → stok rezerve et.
    IF (TG_OP = 'INSERT' AND NEW.status IN ('pending', 'pending_admin_approval')) THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(recipe_array)
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

    -- SENARYO 2: Teklif kabul ediliyor ('pending' -> 'accepted').
    IF (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending') THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(recipe_array)
        LOOP
            inv_id := (config_item->>'inventory_id')::uuid;
            req_amount := COALESCE((config_item->>'required_amount')::numeric, 1);

            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory
                SET
                    stock_level = GREATEST(stock_level - req_amount, 0),
                    reserved_stock = GREATEST(reserved_stock - req_amount, 0)
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    -- SENARYO 3: Teklif reddediliyor / iptal ediliyor.
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('rejected', 'cancelled')
        AND OLD.status IN ('pending', 'pending_admin_approval')) THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(recipe_array)
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
