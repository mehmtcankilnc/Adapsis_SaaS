-- =============================================
-- CRM: documents (dosya/doküman ekleri) — Storage bucket + metadata tablosu
-- =============================================
-- Müşteriye bağlı sözleşme, teknik çizim, imzalı teklif gibi dosyaların
-- saklanması. Dosyanın kendisi private bir Supabase Storage bucket'ında
-- (customer-documents) tutulur; bu tablo sadece metadata + erişim
-- kontrolü için var. Depolama yolu (storage_path) her zaman
-- "{customer_id}/{uuid}_{dosya_adı}" formatındadır — bucket üzerindeki
-- RLS policy'leri bu ilk path segmentini customers tablosuyla eşleştirerek
-- görünürlüğü kontrol eder (aşağıya bakın).

INSERT INTO storage.buckets (id, name, public)
VALUES ('customer-documents', 'customer-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.documents IS 'Müşteriye bağlı dosya ekleri (sözleşme, teknik çizim, imzalı teklif vb.) — asıl dosya customer-documents storage bucket''ında';
COMMENT ON COLUMN public.documents.storage_path IS 'customer-documents bucket''ı içindeki tam yol: {customer_id}/{uuid}_{dosya_adı}';

CREATE INDEX IF NOT EXISTS idx_documents_customer_id ON public.documents(customer_id);

-- ─── RLS: documents tablosu (metadata) ───
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documents_select_via_customer" ON public.documents;
CREATE POLICY "documents_select_via_customer" ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = documents.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "documents_insert_own_customer_scope" ON public.documents;
CREATE POLICY "documents_insert_own_customer_scope" ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = documents.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS "documents_delete_own_or_admin" ON public.documents;
CREATE POLICY "documents_delete_own_or_admin" ON public.documents
  FOR DELETE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR uploaded_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = documents.customer_id AND c.owner_id = auth.uid()
    )
  );

-- ─── RLS: storage.objects (asıl dosyalar) ───
-- Path'in ilk segmenti (storage.foldername) customer_id'dir; görünürlük
-- documents tablosuyla aynı sahiplik mantığını izler.
DROP POLICY IF EXISTS "customer_documents_select" ON storage.objects;
CREATE POLICY "customer_documents_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'customer-documents'
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id::text = (storage.foldername(name))[1]
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
      public.get_my_role() = 'admin'
      OR owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.customers c
        WHERE c.id::text = (storage.foldername(name))[1] AND c.owner_id = auth.uid()
      )
    )
  );
