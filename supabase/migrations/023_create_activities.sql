-- =============================================
-- CRM: activities tablosu
-- =============================================
-- Müşteriyle yapılan görüşme/arama/toplantı/not geçmişini tutar. Opsiyonel
-- olarak bir teklife (quotes) bağlanabilir (örn. "bu teklifi telefonla takip
-- ettim"). contacts ile aynı erişim mantığını izler: müşteri kimin
-- görünürlüğündeyse aktiviteleri de onundur.

CREATE TABLE IF NOT EXISTS public.activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'note'
      CHECK (type IN ('call', 'email', 'meeting', 'note', 'other')),
    subject TEXT NOT NULL,
    notes TEXT,
    activity_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.activities IS 'Müşteri etkileşim geçmişi: arama, e-posta, toplantı, not';
COMMENT ON COLUMN public.activities.activity_date IS 'Aktivitenin gerçekleştiği/planlandığı tarih (kayıt tarihinden farklı olabilir, örn. geçmişe dönük not girişi)';

CREATE INDEX IF NOT EXISTS idx_activities_customer_id ON public.activities(customer_id);
CREATE INDEX IF NOT EXISTS idx_activities_quote_id ON public.activities(quote_id);
CREATE INDEX IF NOT EXISTS idx_activities_activity_date ON public.activities(activity_date DESC);

DROP TRIGGER IF EXISTS set_activities_updated_at ON public.activities;
CREATE TRIGGER set_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ───
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activities_select_via_customer" ON public.activities;
CREATE POLICY "activities_select_via_customer" ON public.activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = activities.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

-- INSERT: created_by kontrolüne ek olarak müşterinin görünürlük kapsamında
-- olması da isteniyor (bkz. contacts_insert_authenticated'de fark edilen
-- "sadece SELECT policy'sine yaslanma" zayıflığı — burada baştan açıkça
-- kontrol ediliyor, RETURNING'e bağımlı kalınmıyor).
DROP POLICY IF EXISTS "activities_insert_own_customer_scope" ON public.activities;
CREATE POLICY "activities_insert_own_customer_scope" ON public.activities
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = activities.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "activities_update_own" ON public.activities;
CREATE POLICY "activities_update_own" ON public.activities
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR created_by = auth.uid())
  WITH CHECK (public.get_my_role() = 'admin' OR created_by = auth.uid());

DROP POLICY IF EXISTS "activities_delete_own" ON public.activities;
CREATE POLICY "activities_delete_own" ON public.activities
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR created_by = auth.uid());
