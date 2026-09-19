-- =============================================
-- FIX: Eksik tablolar — `customers` ve `global_settings`
-- =============================================
-- Bu iki tablo hiçbir migration dosyasında oluşturulmamıştı, ancak
-- uygulama kodu (customer.actions.ts, global-settings.actions.ts,
-- quote.actions.ts, ConfiguratorClient.tsx, shared/customers/*,
-- sales/quotes/[quoteId]/page.tsx) bunları yaygın şekilde kullanıyor.
-- Muhtemelen gerçek projede Supabase Dashboard üzerinden elle
-- oluşturulmuşlardı. Bu migration olmadan sıfırdan kurulan (yeni ortam,
-- felaket kurtarma, yerel geliştirme) bir veritabanında "Teklif Oluştur"
-- ve "Ayarlar" akışlarının tamamı "relation does not exist" hatasıyla çöker.

-- ─── CUSTOMERS ───
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Hem admin hem satış personeli müşteri veritabanını görüntüleyip
-- (shared/customers sayfası, konfigüratördeki müşteri seçimi) yeni müşteri
-- ekleyebilir (Hızlı Müşteri Ekle). Düzenleme/silme için ayrı bir akış yok.
DROP POLICY IF EXISTS "customers_select_authenticated" ON public.customers;
CREATE POLICY "customers_select_authenticated" ON public.customers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "customers_insert_authenticated" ON public.customers;
CREATE POLICY "customers_insert_authenticated" ON public.customers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
CREATE POLICY "customers_admin_all" ON public.customers
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');

-- ─── GLOBAL_SETTINGS ───
CREATE TABLE IF NOT EXISTS public.global_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    company_address TEXT,
    iban TEXT,
    tax_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
    default_margin NUMERIC(5,2) NOT NULL DEFAULT 0,
    quote_footer_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Teklif detay/PDF sayfası (hem admin hem satış) firma bilgilerini,
-- vergi oranını vs. okuyabilmeli; sadece admin değiştirebilmeli.
DROP POLICY IF EXISTS "global_settings_select_authenticated" ON public.global_settings;
CREATE POLICY "global_settings_select_authenticated" ON public.global_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "global_settings_admin_write" ON public.global_settings;
CREATE POLICY "global_settings_admin_write" ON public.global_settings
  FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
