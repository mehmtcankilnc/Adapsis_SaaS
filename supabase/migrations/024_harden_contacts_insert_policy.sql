-- =============================================
-- FIX: contacts INSERT policy sadece created_by kontrolü yapıyordu
-- =============================================
-- 021_create_contacts.sql'deki contacts_insert_authenticated policy'si
-- yalnızca "auth.uid() = created_by" kontrolü yapıyordu; müşteri
-- sahipliğini (customers.owner_id) kontrol etmiyordu. Pratikte bu satırın
-- güvenli kalmasının tek sebebi, uygulama kodunun (createContactAction)
-- her zaman `.select()` ile INSERT...RETURNING kullanması: eklenen satır
-- contacts_select_via_customer policy'sine göre görünür değilse Postgres
-- "new row violates row-level security policy" hatası veriyor. Ama bu,
-- RLS'in kendisinden değil, RETURNING'e yaslanan kırılgan bir yan etkiden
-- kaynaklanıyordu — .select() kullanmayan bir insert (örn. ileride RPC
-- veya toplu import) bu korumayı bypass edebilirdi.
-- activities tablosunda (bkz. migration 023) bu kontrol baştan açık
-- şekilde yazıldı; burada contacts için de aynı sertleştirme uygulanıyor.
DROP POLICY IF EXISTS "contacts_insert_authenticated" ON public.contacts;
CREATE POLICY "contacts_insert_own_customer_scope" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = contacts.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );
