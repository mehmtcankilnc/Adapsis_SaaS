-- =============================================
-- CRM: customers tablosunu genişlet
-- =============================================
-- customers tablosu şu ana kadar sadece firma/iletişim bilgisi tutuyordu
-- (bkz. 017_create_missing_tables.sql). CRM modülü için müşteri durumu,
-- sorumlu satış temsilcisi, segmentasyon ve serbest not alanları ekleniyor.

ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'lead'
    CHECK (status IN ('lead', 'active', 'inactive', 'lost')),
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS industry TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN public.customers.status IS 'CRM satış durumu: lead, active, inactive, lost';
COMMENT ON COLUMN public.customers.owner_id IS 'Müşteriden sorumlu satış temsilcisi';
COMMENT ON COLUMN public.customers.source IS 'Müşteri kaynağı: referans, web formu, fuar, soğuk arama vb. (serbest metin)';

-- updated_at otomatik güncellensin (categories/products/variants ile aynı pattern)
DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_customers_owner_id ON public.customers(owner_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);

-- ─── RLS: sahiplik bazlı erişim ───
-- Önceki policy (customers_select_authenticated) herkese tüm müşterileri
-- açıyordu; artık satış temsilcisi kendi sahip olduğu + kendi oluşturduğu
-- müşterileri görür, admin hepsini görür. owner_id boşsa (henüz atanmamış
-- lead) herkes görebilir ki hiçbir kayıt "kimsesiz" kalmasın.
DROP POLICY IF EXISTS "customers_select_authenticated" ON public.customers;
CREATE POLICY "customers_select_own_or_unassigned" ON public.customers
  FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR owner_id = auth.uid()
    OR owner_id IS NULL
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR owner_id = auth.uid()
    OR created_by = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR owner_id = auth.uid()
    OR created_by = auth.uid()
  );

-- customers_insert_authenticated ve customers_admin_all (ALL için admin
-- her şeyi yapabilir) mevcut haliyle kalıyor, dokunulmadı.
