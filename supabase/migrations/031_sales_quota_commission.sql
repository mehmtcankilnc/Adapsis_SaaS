-- =============================================
-- Satış Kotası & Komisyon Takibi
-- =============================================
-- Her satış temsilcisinin aylık ciro hedefi (sales_targets) ve komisyon
-- oranı (profiles.commission_rate) admin tarafından belirlenir. Kota paneli
-- bu ay onaylanmış (accepted) tekliflerin toplamını hedefe karşı gösterir.
-- quotes.accepted_at eklenir çünkü updated_at herhangi bir değişiklikte
-- (örn. is_read_by_sales bayrağı) güncellendiğinden "bu ay ne zaman kabul
-- edildi" sorgusu için güvenilir değildir; accepted_at sadece status
-- 'accepted' olduğunda bir defa set edilir (bkz. quote.actions.ts).

-- 1) quotes.accepted_at
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
COMMENT ON COLUMN public.quotes.accepted_at IS 'status accepted''a geçtiği an set edilir (bkz. updateQuoteStatusAction); updated_at''ın aksine sonraki değişikliklerde ezilmez.';

-- Geriye dönük dolum: zaten accepted olan kayıtlar için accepted_at bilinmiyor,
-- en iyi tahmin olarak updated_at kullanılır (yalnızca bir kerelik backfill).
UPDATE public.quotes SET accepted_at = updated_at WHERE status = 'accepted' AND accepted_at IS NULL;

-- 2) profiles.commission_rate
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.profiles.commission_rate IS 'Yüzde olarak komisyon oranı (örn. 5 = %5); sadece admin tarafından düzenlenir.';

-- 3) sales_targets
CREATE TABLE IF NOT EXISTS public.sales_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    period_month DATE NOT NULL,
    target_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
    target_currency TEXT NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (profile_id, period_month)
);

COMMENT ON TABLE public.sales_targets IS 'Temsilci başına aylık ciro hedefi; period_month her zaman ayın 1''i olarak saklanır.';
COMMENT ON COLUMN public.sales_targets.period_month IS 'Ayın ilk günü (örn. 2026-09-01) - hedefin ait olduğu ay.';
COMMENT ON COLUMN public.sales_targets.target_currency IS 'quotes.currency ile aynı serbest metin konvansiyonu; /api/rates ile globalCurrency''e çevrilir.';

CREATE INDEX IF NOT EXISTS idx_sales_targets_profile_id ON public.sales_targets(profile_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period_month ON public.sales_targets(period_month);

DROP TRIGGER IF EXISTS set_sales_targets_updated_at ON public.sales_targets;
CREATE TRIGGER set_sales_targets_updated_at
  BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ───
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sales_targets_admin_all" ON public.sales_targets;
CREATE POLICY "sales_targets_admin_all" ON public.sales_targets
  FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "sales_targets_select_own" ON public.sales_targets;
CREATE POLICY "sales_targets_select_own" ON public.sales_targets
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());
