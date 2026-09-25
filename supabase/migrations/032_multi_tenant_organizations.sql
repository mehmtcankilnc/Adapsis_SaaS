-- =============================================
-- Multi-Tenant (Organization) İzolasyonu
-- =============================================
-- Şu ana kadar uygulama tek bir şirketin verisi gibi çalışıyordu; RLS sadece
-- rol bazlıydı (admin = şirketteki her şey, sales = sadece kendi kaydı).
-- Bu migration gerçek bir organizations tablosu ekleyip her iş tablosuna
-- organization_id kolonu ekliyor, tüm mevcut veriyi tek bir "legacy" (Adapsis
-- Geliştirme) organizasyona backfill ediyor, ve tüm RLS politikalarını
-- organization_id = get_my_org_id() ile genişletiyor. Böylece yeni
-- organizasyonlar birbirinin verisini asla görmez.

-- ─── 1) organizations tablosu ───
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.organizations (id, name, slug)
VALUES ('00000000-0000-4000-8000-000000000001', 'Adapsis (Geliştirme)', 'adapsis-gelistirme')
ON CONFLICT (id) DO NOTHING;

-- ─── 2) Her iş tablosuna organization_id ekle + mevcut veriyi backfill et ───
DO $$
DECLARE
  legacy_org UUID := '00000000-0000-4000-8000-000000000001';
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'categories', 'products', 'product_variants', 'inventory',
    'customers', 'contacts', 'quotes', 'activities', 'tasks', 'opportunities',
    'documents', 'quote_templates', 'system_requests', 'global_settings', 'sales_targets'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES public.organizations(id)', tbl);
    EXECUTE format('UPDATE public.%I SET organization_id = %L WHERE organization_id IS NULL', tbl, legacy_org);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN organization_id SET NOT NULL', tbl);
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_categories_org ON public.categories(organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON public.products(organization_id);
CREATE INDEX IF NOT EXISTS idx_product_variants_org ON public.product_variants(organization_id);
CREATE INDEX IF NOT EXISTS idx_inventory_org ON public.inventory(organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_contacts_org ON public.contacts(organization_id);
CREATE INDEX IF NOT EXISTS idx_quotes_org ON public.quotes(organization_id);
CREATE INDEX IF NOT EXISTS idx_activities_org ON public.activities(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_org ON public.opportunities(organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents(organization_id);
CREATE INDEX IF NOT EXISTS idx_quote_templates_org ON public.quote_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_system_requests_org ON public.system_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_org ON public.sales_targets(organization_id);
CREATE INDEX IF NOT EXISTS idx_profiles_org ON public.profiles(organization_id);

-- global_settings artık singleton değil, organizasyon başına bir satır
ALTER TABLE public.global_settings DROP CONSTRAINT IF EXISTS global_settings_org_unique;
ALTER TABLE public.global_settings ADD CONSTRAINT global_settings_org_unique UNIQUE (organization_id);

-- ─── 3) get_my_org_id() helper (get_my_role() ile aynı pattern) ───
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$;

-- ─── 4) handle_new_user(): artık organization_id'yi de metadata'dan okuyup yazıyor ───
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, organization_id)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    COALESCE(new.raw_user_meta_data->>'role', 'sales'),
    (new.raw_user_meta_data->>'organization_id')::uuid
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5) RLS politikalarını organization_id ile genişlet ───

-- categories
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
DROP POLICY IF EXISTS "categories_sales_select" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "categories_sales_select" ON public.categories FOR SELECT TO authenticated
  USING (public.get_my_role() = 'sales' AND is_active = true AND organization_id = public.get_my_org_id());

-- products
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "products_sales_select" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "products_sales_select" ON public.products FOR SELECT TO authenticated
  USING (public.get_my_role() = 'sales' AND is_active = true AND organization_id = public.get_my_org_id());

-- product_variants
DROP POLICY IF EXISTS "variants_admin_all" ON public.product_variants;
DROP POLICY IF EXISTS "variants_sales_select" ON public.product_variants;
CREATE POLICY "variants_admin_all" ON public.product_variants FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "variants_sales_select" ON public.product_variants FOR SELECT TO authenticated
  USING (
    public.get_my_role() = 'sales' AND organization_id = public.get_my_org_id() AND
    EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND products.is_active = true)
  );

-- inventory
DROP POLICY IF EXISTS "inventory_admin_all" ON public.inventory;
DROP POLICY IF EXISTS "inventory_sales_select" ON public.inventory;
CREATE POLICY "inventory_admin_all" ON public.inventory FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "inventory_sales_select" ON public.inventory FOR SELECT TO authenticated
  USING (public.get_my_role() = 'sales' AND organization_id = public.get_my_org_id());

-- quotes: iki nesil çakışan eski politika var (010 + 014) — hepsini kaldırıp tek temiz set yazıyoruz
DROP POLICY IF EXISTS "quotes_admin_all" ON public.quotes;
DROP POLICY IF EXISTS "quotes_sales_select" ON public.quotes;
DROP POLICY IF EXISTS "quotes_sales_insert" ON public.quotes;
DROP POLICY IF EXISTS "quotes_sales_update" ON public.quotes;
DROP POLICY IF EXISTS "Adminler tüm teklifleri okuyabilir" ON public.quotes;
DROP POLICY IF EXISTS "Satıcılar kendi tekliflerini okuyabilir" ON public.quotes;
DROP POLICY IF EXISTS "Kullanıcılar kendi tekliflerini yaratabilir" ON public.quotes;
DROP POLICY IF EXISTS "Kullanıcılar kendi tekliflerini güncelleyebilir" ON public.quotes;
CREATE POLICY "quotes_admin_all" ON public.quotes FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "quotes_sales_select" ON public.quotes FOR SELECT TO authenticated
  USING (public.get_my_role() = 'sales' AND created_by = auth.uid() AND organization_id = public.get_my_org_id());
CREATE POLICY "quotes_sales_insert" ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.get_my_role() = 'sales' AND created_by = auth.uid() AND organization_id = public.get_my_org_id());
CREATE POLICY "quotes_sales_update" ON public.quotes FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'sales' AND created_by = auth.uid() AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'sales' AND created_by = auth.uid() AND organization_id = public.get_my_org_id());

-- profiles: iki nesil çakışan eski politika var (010 + 015); "profiles_select_all USING(true)"
-- şu an herkesin herkesi gördüğü bir org sızıntısı — kaldırılıyor.
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_self" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_self" ON public.profiles;
DROP POLICY IF EXISTS "Profil güncelleme (admin + self)" ON public.profiles;
DROP POLICY IF EXISTS "Admin profil silme" ON public.profiles;
DROP POLICY IF EXISTS "Admin profil ekleme" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "profiles_select_own_org" ON public.profiles FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_delete_admin" ON public.profiles FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());

-- customers
DROP POLICY IF EXISTS "customers_insert_authenticated" ON public.customers;
DROP POLICY IF EXISTS "customers_admin_all" ON public.customers;
DROP POLICY IF EXISTS "customers_select_own_or_unassigned" ON public.customers;
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_insert_authenticated" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND organization_id = public.get_my_org_id());
CREATE POLICY "customers_admin_all" ON public.customers FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "customers_select_own_or_unassigned" ON public.customers FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR owner_id = auth.uid() OR owner_id IS NULL OR created_by = auth.uid())
  );
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR owner_id = auth.uid() OR created_by = auth.uid())
  )
  WITH CHECK (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR owner_id = auth.uid() OR created_by = auth.uid())
  );

-- contacts (customer üzerinden org kontrolü)
DROP POLICY IF EXISTS "contacts_select_via_customer" ON public.contacts;
DROP POLICY IF EXISTS "contacts_insert_own_customer_scope" ON public.contacts;
DROP POLICY IF EXISTS "contacts_update_own" ON public.contacts;
DROP POLICY IF EXISTS "contacts_delete_admin_or_owner" ON public.contacts;
CREATE POLICY "contacts_select_via_customer" ON public.contacts FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = contacts.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "contacts_insert_own_customer_scope" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = contacts.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "contacts_update_own" ON public.contacts FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR created_by = auth.uid() OR
     EXISTS (SELECT 1 FROM public.customers c WHERE c.id = contacts.customer_id AND c.owner_id = auth.uid()))
  )
  WITH CHECK (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR created_by = auth.uid() OR
     EXISTS (SELECT 1 FROM public.customers c WHERE c.id = contacts.customer_id AND c.owner_id = auth.uid()))
  );
CREATE POLICY "contacts_delete_admin_or_owner" ON public.contacts FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR created_by = auth.uid() OR
     EXISTS (SELECT 1 FROM public.customers c WHERE c.id = contacts.customer_id AND c.owner_id = auth.uid()))
  );

-- activities
DROP POLICY IF EXISTS "activities_select_via_customer" ON public.activities;
DROP POLICY IF EXISTS "activities_insert_own_customer_scope" ON public.activities;
DROP POLICY IF EXISTS "activities_update_own" ON public.activities;
DROP POLICY IF EXISTS "activities_delete_own" ON public.activities;
CREATE POLICY "activities_select_via_customer" ON public.activities FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = activities.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "activities_insert_own_customer_scope" ON public.activities FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = activities.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "activities_update_own" ON public.activities FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()))
  WITH CHECK (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()));
CREATE POLICY "activities_delete_own" ON public.activities FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()));

-- tasks
DROP POLICY IF EXISTS "tasks_select_via_customer_or_assignee" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_own_customer_scope" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_own_or_assignee" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_select_via_customer_or_assignee" ON public.tasks FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (assigned_to = auth.uid() OR created_by = auth.uid() OR
     EXISTS (
       SELECT 1 FROM public.customers c WHERE c.id = tasks.customer_id
         AND c.organization_id = public.get_my_org_id()
         AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
     ))
  );
CREATE POLICY "tasks_insert_own_customer_scope" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = tasks.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "tasks_update_own_or_assignee" ON public.tasks FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid() OR assigned_to = auth.uid()))
  WITH CHECK (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid() OR assigned_to = auth.uid()));
CREATE POLICY "tasks_delete_own" ON public.tasks FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()));

-- opportunities
DROP POLICY IF EXISTS "opportunities_select_via_customer_or_owner" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_insert_own_customer_scope" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_update_own_or_owner" ON public.opportunities;
DROP POLICY IF EXISTS "opportunities_delete_own" ON public.opportunities;
CREATE POLICY "opportunities_select_via_customer_or_owner" ON public.opportunities FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (owner_id = auth.uid() OR created_by = auth.uid() OR
     EXISTS (
       SELECT 1 FROM public.customers c WHERE c.id = opportunities.customer_id
         AND c.organization_id = public.get_my_org_id()
         AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
     ))
  );
CREATE POLICY "opportunities_insert_own_customer_scope" ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = opportunities.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "opportunities_update_own_or_owner" ON public.opportunities FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid() OR owner_id = auth.uid()))
  WITH CHECK (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid() OR owner_id = auth.uid()));
CREATE POLICY "opportunities_delete_own" ON public.opportunities FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()));

-- documents
DROP POLICY IF EXISTS "documents_select_via_customer" ON public.documents;
DROP POLICY IF EXISTS "documents_insert_own_customer_scope" ON public.documents;
DROP POLICY IF EXISTS "documents_delete_own_or_admin" ON public.documents;
CREATE POLICY "documents_select_via_customer" ON public.documents FOR SELECT TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = documents.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "documents_insert_own_customer_scope" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND organization_id = public.get_my_org_id() AND
    EXISTS (
      SELECT 1 FROM public.customers c WHERE c.id = documents.customer_id
        AND c.organization_id = public.get_my_org_id()
        AND (public.get_my_role() = 'admin' OR c.owner_id = auth.uid() OR c.owner_id IS NULL OR c.created_by = auth.uid())
    )
  );
CREATE POLICY "documents_delete_own_or_admin" ON public.documents FOR DELETE TO authenticated
  USING (
    organization_id = public.get_my_org_id() AND
    (public.get_my_role() = 'admin' OR uploaded_by = auth.uid() OR
     EXISTS (SELECT 1 FROM public.customers c WHERE c.id = documents.customer_id AND c.owner_id = auth.uid()))
  );

-- quote_templates (bilerek takım-geneli: org içindeki herkes görebilir)
DROP POLICY IF EXISTS "quote_templates_select_all" ON public.quote_templates;
DROP POLICY IF EXISTS "quote_templates_insert_own" ON public.quote_templates;
DROP POLICY IF EXISTS "quote_templates_update_own" ON public.quote_templates;
DROP POLICY IF EXISTS "quote_templates_delete_own" ON public.quote_templates;
CREATE POLICY "quote_templates_select_all" ON public.quote_templates FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());
CREATE POLICY "quote_templates_insert_own" ON public.quote_templates FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND organization_id = public.get_my_org_id());
CREATE POLICY "quote_templates_update_own" ON public.quote_templates FOR UPDATE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()))
  WITH CHECK (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()));
CREATE POLICY "quote_templates_delete_own" ON public.quote_templates FOR DELETE TO authenticated
  USING (organization_id = public.get_my_org_id() AND (public.get_my_role() = 'admin' OR created_by = auth.uid()));

-- system_requests
DROP POLICY IF EXISTS "Sales can insert their own requests" ON public.system_requests;
DROP POLICY IF EXISTS "Sales can view their own requests" ON public.system_requests;
DROP POLICY IF EXISTS "Admins can view all requests" ON public.system_requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.system_requests;
CREATE POLICY "system_requests_insert_own" ON public.system_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = requested_by AND organization_id = public.get_my_org_id());
CREATE POLICY "system_requests_select_own" ON public.system_requests FOR SELECT TO authenticated
  USING (auth.uid() = requested_by AND organization_id = public.get_my_org_id());
CREATE POLICY "system_requests_admin_select" ON public.system_requests FOR SELECT TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "system_requests_admin_update" ON public.system_requests FOR UPDATE TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());

-- global_settings (artık org başına bir satır)
DROP POLICY IF EXISTS "global_settings_select_authenticated" ON public.global_settings;
DROP POLICY IF EXISTS "global_settings_admin_write" ON public.global_settings;
CREATE POLICY "global_settings_select_own_org" ON public.global_settings FOR SELECT TO authenticated
  USING (organization_id = public.get_my_org_id());
CREATE POLICY "global_settings_admin_write" ON public.global_settings FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());

-- sales_targets
DROP POLICY IF EXISTS "sales_targets_admin_all" ON public.sales_targets;
DROP POLICY IF EXISTS "sales_targets_select_own" ON public.sales_targets;
CREATE POLICY "sales_targets_admin_all" ON public.sales_targets FOR ALL TO authenticated
  USING (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id())
  WITH CHECK (public.get_my_role() = 'admin' AND organization_id = public.get_my_org_id());
CREATE POLICY "sales_targets_select_own" ON public.sales_targets FOR SELECT TO authenticated
  USING (profile_id = auth.uid() AND organization_id = public.get_my_org_id());

-- organizations tablosunun kendisi: sadece kendi organizasyonunu görebilsin
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "organizations_select_own" ON public.organizations;
CREATE POLICY "organizations_select_own" ON public.organizations FOR SELECT TO authenticated
  USING (id = public.get_my_org_id());

-- ─── 6) Storage: customer-documents bucket politikalarına org kontrolü ekle ───
DROP POLICY IF EXISTS "customer_documents_select" ON storage.objects;
CREATE POLICY "customer_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.organization_id = public.get_my_org_id()
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "customer_documents_insert" ON storage.objects;
CREATE POLICY "customer_documents_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'customer-documents'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id::text = (storage.foldername(name))[1]
        AND c.organization_id = public.get_my_org_id()
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "customer_documents_delete" ON storage.objects;
CREATE POLICY "customer_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND (
      (public.get_my_role() = 'admin' AND EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id::text = (storage.foldername(name))[1] AND c.organization_id = public.get_my_org_id()
      ))
      OR owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid() AND c.organization_id = public.get_my_org_id()
      )
    )
  );
