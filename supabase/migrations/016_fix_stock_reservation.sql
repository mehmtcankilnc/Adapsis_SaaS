-- =============================================
-- FIX: Stok Rezervasyon Sistemindeki Kritik Hatalar
-- =============================================
-- Bugüne kadar iki AYRI trigger (010_rls_cleanup_and_inventory.sql'deki
-- trg_quote_status_change_inventory ve 011_reserved_stock_and_trigger.sql'deki
-- trg_quote_stock_reservation) aynı `quotes` tablosunda AFTER INSERT/UPDATE OF status
-- üzerinde birlikte çalışıyordu. İkisi de neredeyse birebir aynı mantığı
-- uyguladığından her teklif oluşturma/reddetme işleminde reserved_stock İKİ KEZ
-- güncelleniyordu. Ayrıca her iki trigger da "kabul edildi" durumunu 'approved'
-- string'i ile kontrol ediyordu, ama uygulama kodu (quote.actions.ts) hep
-- 'accepted' yazıyor — bu yüzden kabul anında stok düşme mantığı hiç
-- çalışmıyor, sadece app-level (JS) kod stok düşüyordu; app-level kod ayrıca
-- 'rejected' durumunda da rezervasyonu BİR KEZ DAHA azaltıyordu (trigger'lara ek
-- olarak). Net sonuç: bir teklif reddedildiğinde reserved_stock 3 kez
-- azaltılıyor, bu da aynı envanter kalemini paylaşan BAŞKA bekleyen tekliflerin
-- meşru rezervasyonunu sıfırlayabiliyordu (stok fazladan satılabilir hale
-- geliyordu). Ayrıca %5 üzeri iskontolu teklifler ('pending_admin_approval')
-- oluşturulduğunda hiç rezervasyon yapılmıyordu.
--
-- Bu migration:
--   1) Her iki eski trigger/fonksiyonu kaldırır.
--   2) Tek, doğru ve tutarlı bir trigger/fonksiyon kurar (tek doğruluk kaynağı).
--   3) Uygulama kodundaki (quote.actions.ts) elle yapılan stok güncellemeleri
--      kaldırılmıştır (bkz. updateQuoteStatusAction) — artık stok yönetimi
--      tamamen bu trigger üzerinden, atomik olarak yürütülür.

DROP TRIGGER IF EXISTS trg_quote_status_change_inventory ON public.quotes;
DROP FUNCTION IF EXISTS public.handle_quote_status_change();

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
    IF jsonb_typeof(NEW.configuration) = 'array' THEN
        config_array := NEW.configuration;
    ELSE
        -- Eski (object) format ya da NULL: stok bilgisi çıkaramayız, atla.
        RETURN NEW;
    END IF;

    -- SENARYO 1: Yeni teklif oluşturuluyor ve onay bekleyen bir durumda
    -- ('pending' ya da 'pending_admin_approval') → stok rezerve et.
    -- İskonto onayı bekleyen tekliflerde de stok fiilen ayrılmış sayılmalı,
    -- aksi halde admin onayı beklerken aynı stok başka bir teklife de
    -- verilebilir (overselling riski).
    IF (TG_OP = 'INSERT' AND NEW.status IN ('pending', 'pending_admin_approval')) THEN
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

    -- SENARYO 2: Teklif kabul ediliyor ('pending' -> 'accepted').
    -- NOT: Uygulama kodu durum değerini 'accepted' olarak yazar (asla
    -- 'approved' değil) — bu isim eskiden trigger ile uyuşmuyordu.
    IF (TG_OP = 'UPDATE' AND NEW.status = 'accepted' AND OLD.status = 'pending') THEN
        FOR config_item IN SELECT * FROM jsonb_array_elements(config_array)
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

    -- SENARYO 3: Teklif reddediliyor / iptal ediliyor. Bu, hem normal
    -- 'pending' -> 'rejected' akışından hem de admin'in yüksek iskontolu bir
    -- teklifi doğrudan reddettiği 'pending_admin_approval' -> 'rejected'
    -- akışından gelebilir — her iki eski durumdan da rezervasyon geri alınır.
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('rejected', 'cancelled')
        AND OLD.status IN ('pending', 'pending_admin_approval')) THEN
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

CREATE TRIGGER trg_quote_stock_reservation
AFTER INSERT OR UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_quote_stock_reservation();
