-- =============================================
-- CRM: quote_templates tablosu
-- =============================================
-- Satış temsilcilerinin sık kullandığı ürün konfigürasyonlarını isimlendirip
-- kaydedebilmesi için ("Standart 3000kVA Paketi" vb.), yeni teklif
-- oluştururken konfigüratörü sıfırdan doldurmak yerine oradan başlayabilsin.
-- 20 kişilik küçük bir satış ekibinde standart paketler herkese görünür
-- olmalı — bu yüzden SELECT ekip çapında (tasks/activities'in aksine, orada
-- görünürlük müşteri sahipliğine bağlıydı, burada böyle bir kısıt yok).
-- Mutasyon (UPDATE/DELETE) ise yalnızca oluşturan kişi veya admin ile
-- sınırlı — tasks tablosundaki "görünürlük vs. mutasyon" ayrımıyla aynı
-- desen.

CREATE TABLE IF NOT EXISTS public.quote_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    configuration JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.quote_templates IS 'Bir ürüne bağlı, isimlendirilmiş, yeniden kullanılabilir teklif konfigürasyonu şablonları';

CREATE INDEX IF NOT EXISTS idx_quote_templates_product_id ON public.quote_templates(product_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_created_by ON public.quote_templates(created_by);

DROP TRIGGER IF EXISTS set_quote_templates_updated_at ON public.quote_templates;
CREATE TRIGGER set_quote_templates_updated_at
  BEFORE UPDATE ON public.quote_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ───
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quote_templates_select_all" ON public.quote_templates;
CREATE POLICY "quote_templates_select_all" ON public.quote_templates
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "quote_templates_insert_own" ON public.quote_templates;
CREATE POLICY "quote_templates_insert_own" ON public.quote_templates
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "quote_templates_update_own" ON public.quote_templates;
CREATE POLICY "quote_templates_update_own" ON public.quote_templates
  FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' OR created_by = auth.uid())
  WITH CHECK (public.get_my_role() = 'admin' OR created_by = auth.uid());

DROP POLICY IF EXISTS "quote_templates_delete_own" ON public.quote_templates;
CREATE POLICY "quote_templates_delete_own" ON public.quote_templates
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR created_by = auth.uid());
