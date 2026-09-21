-- =============================================
-- CRM: tasks tablosu
-- =============================================
-- Müşteriye bağlı, bir satış temsilcisine atanabilen, vadeli (due_date)
-- takip görevleri ("3 gün sonra ara", "teklifi takip et" vb.). contacts ve
-- activities ile aynı sahiplik/görünürlük mantığını izler, ek olarak
-- göreve atanan kişi (assigned_to) de görevi görüp tamamlayabilir —
-- müşteri sahibi olmasa bile.

CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_to UUID REFERENCES auth.users(id),
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'completed', 'cancelled')),
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.tasks IS 'Müşteriye bağlı takip görevleri: atanabilir, vadeli, tamamlanma durumu takip edilir';
COMMENT ON COLUMN public.tasks.assigned_to IS 'Görevden sorumlu satış temsilcisi; boşsa görev sahiplenilmemiştir';

CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON public.tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_quote_id ON public.tasks(quote_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);

DROP TRIGGER IF EXISTS set_tasks_updated_at ON public.tasks;
CREATE TRIGGER set_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── RLS ───
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_select_via_customer_or_assignee" ON public.tasks;
CREATE POLICY "tasks_select_via_customer_or_assignee" ON public.tasks
  FOR SELECT TO authenticated
  USING (
    assigned_to = auth.uid()
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = tasks.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

-- INSERT: created_by kontrolüne ek olarak müşterinin görünürlük kapsamında
-- olması da isteniyor (bkz. activities/contacts'ta aynı sertleştirme).
DROP POLICY IF EXISTS "tasks_insert_own_customer_scope" ON public.tasks;
CREATE POLICY "tasks_insert_own_customer_scope" ON public.tasks
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = tasks.customer_id
        AND (
          public.get_my_role() = 'admin'
          OR c.owner_id = auth.uid()
          OR c.owner_id IS NULL
          OR c.created_by = auth.uid()
        )
    )
  );

-- UPDATE: atanan kişi de (müşteri sahibi olmasa bile) görevi
-- güncelleyebilir/tamamlayabilir — görev ataması bunu gerektirir.
DROP POLICY IF EXISTS "tasks_update_own_or_assignee" ON public.tasks;
CREATE POLICY "tasks_update_own_or_assignee" ON public.tasks
  FOR UPDATE TO authenticated
  USING (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  )
  WITH CHECK (
    public.get_my_role() = 'admin'
    OR created_by = auth.uid()
    OR assigned_to = auth.uid()
  );

DROP POLICY IF EXISTS "tasks_delete_own" ON public.tasks;
CREATE POLICY "tasks_delete_own" ON public.tasks
  FOR DELETE TO authenticated
  USING (public.get_my_role() = 'admin' OR created_by = auth.uid());
