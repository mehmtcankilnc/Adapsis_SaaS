-- =============================================
-- CRM: opportunities (satış hunisi / pipeline) tablosu
-- =============================================
-- Bir müşteriyle ilgili potansiyel satış fırsatını, teklif aşamasından
-- bağımsız olarak, lead'den kazanılmış/kaybedilmişe kadar takip eder.
-- Bir opportunity sıfır veya birden fazla teklife (quotes) yol açabilir;
-- şu an için opsiyonel tekil quote_id ile en somut/son teklife referans
-- veriliyor (çoklu teklif geçmişi ihtiyacı doğarsa ayrı bir ilişki
-- tablosuna taşınabilir).

CREATE TABLE IF NOT EXISTS public.opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    stage TEXT NOT NULL DEFAULT 'lead'
      CHECK (stage IN ('lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    estimated_value NUMERIC(12,2),
    currency TEXT NOT NULL DEFAULT 'USD',
    probability INTEGER CHECK (probability BETWEEN 0 AND 100),
    expected_close_date DATE,
    owner_id UUID REFERENCES auth.users(id),
    lost_reason TEXT,
    competitor TEXT,
    closed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.opportunities IS 'Satış hunisi: müşteri fırsatlarının lead''den kazanılmış/kaybedilmişe kadar takibi';
COMMENT ON COLUMN public.opportunities.stage IS 'lead, qualified, proposal, negotiation, won, lost';
COMMENT ON COLUMN public.opportunities.lost_reason IS 'stage=lost olduğunda neden kaybedildiği (fiyat, zamanlama, rakip vb.)';
COMMENT ON COLUMN public.opportunities.competitor IS 'Varsa fırsatı kaybettiren/rekabet eden rakip firma (serbest metin)';
COMMENT ON COLUMN public.opportunities.owner_id IS 'Fırsattan sorumlu satış temsilcisi; customers.owner_id''den bağımsız olabilir (örn. büyük hesaplarda ayrı bir fırsat sahibi)';

CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON public.opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_quote_id ON public.opportunities(quote_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON public.opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON public.opportunities(stage);

DROP TRIGGER IF EXISTS set_opportunities_updated_at ON public.opportunities;
CREATE TRIGGER set_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ───
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunities_select_via_customer_or_owner" ON public.opportunities;
CREATE POLICY "opportunities_select_via_customer_or_owner" ON public.opportunities
  FOR SELECT TO authenticated
  USING (
    owner_id = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = opportunities.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

-- INSERT: created_by kontrolüne ek olarak müşterinin görünürlük kapsamında
-- olması da isteniyor (contacts/activities/tasks'taki sertleştirmeyle aynı desen).
DROP POLICY IF EXISTS "opportunities_insert_own_customer_scope" ON public.opportunities;
CREATE POLICY "opportunities_insert_own_customer_scope" ON public.opportunities
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = opportunities.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "opportunities_update_own_or_owner" ON public.opportunities;
CREATE POLICY "opportunities_update_own_or_owner" ON public.opportunities
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR owner_id = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "opportunities_delete_own" ON public.opportunities;
CREATE POLICY "opportunities_delete_own" ON public.opportunities
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR created_by = auth.uid());
