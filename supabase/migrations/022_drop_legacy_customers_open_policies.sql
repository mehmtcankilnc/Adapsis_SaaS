-- =============================================
-- FIX: customers tablosunda migration dışı ("dashboard'dan elle
-- eklenmiş") eski açık (USING true) policy'ler kaldırılıyor
-- =============================================
-- 020_customers_crm_fields.sql sahiplik bazlı erişim policy'leri
-- eklemişti, ancak RLS testinde şu üç policy'nin hiçbir migration
-- dosyasında tanımlı olmadığı halde remote veritabanında var olduğu
-- ve role="public" ile USING(true) kullandığı tespit edildi:
--   - "Customers are viewable by everyone" (SELECT)
--   - "Sales and Admins can insert customers" (INSERT)
--   - "Sales and Admins can update customers" (UPDATE)
--
-- Postgres RLS'te aynı komut için birden fazla permissive policy OR
-- ile birleştiği için bu üç policy, 020'de eklenen sahiplik bazlı
-- kısıtlamaları tamamen etkisiz kılıyordu: herhangi bir sales
-- kullanıcısı başka bir temsilcinin müşterisini görebiliyor ve
-- güncelleyebiliyordu. Test: bkz. sohbet geçmişi / RLS doğrulama.
DROP POLICY IF EXISTS "Customers are viewable by everyone" ON public.customers;
DROP POLICY IF EXISTS "Sales and Admins can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Sales and Admins can update customers" ON public.customers;
