-- =============================================
-- CRM: contacts tablosu
-- =============================================
-- Bir müşteri (firma) altında birden fazla yetkili kişi olabilir
-- (satın alma, teknik, muhasebe vb.). customers.contact_name/email/phone
-- alanları geriye dönük uyumluluk için "birincil kişi" olarak kalıyor;
-- yeni akışlarda contacts tablosu kullanılmalı.

CREATE TABLE IF NOT EXISTS public.contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.contacts IS 'Bir customers kaydına bağlı yetkili kişiler (çoklu contact desteği)';
COMMENT ON COLUMN public.contacts.is_primary IS 'Müşterinin birincil iletişim kişisi mi (UI''da öne çıkarmak için)';

CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON public.contacts(customer_id);

-- Her müşteri için en fazla bir "birincil" kişi olsun
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_one_primary_per_customer
  ON public.contacts(customer_id)
  WHERE is_primary = true;

DROP TRIGGER IF EXISTS set_contacts_updated_at ON public.contacts;
CREATE TRIGGER set_contacts_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ───
-- Erişim, bağlı olduğu customers kaydının görünürlüğüyle aynı mantığı
-- izler: admin hepsini görür, sahibi/oluşturan/atanmamış müşterinin
-- kişilerini herkes görebilir.
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contacts_select_via_customer" ON public.contacts;
CREATE POLICY "contacts_select_via_customer" ON public.contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
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

DROP POLICY IF EXISTS "contacts_insert_authenticated" ON public.contacts;
CREATE POLICY "contacts_insert_authenticated" ON public.contacts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "contacts_update_own" ON public.contacts;
CREATE POLICY "contacts_update_own" ON public.contacts
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = contacts.customer_id AND c.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = contacts.customer_id AND c.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "contacts_delete_admin_or_owner" ON public.contacts;
CREATE POLICY "contacts_delete_admin_or_owner" ON public.contacts
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = contacts.customer_id AND c.owner_id = auth.uid()
    )
  );
