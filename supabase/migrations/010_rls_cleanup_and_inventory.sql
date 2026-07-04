-- 1. DROP ALL EXISTING RLS POLICIES
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('categories', 'products', 'product_variants', 'inventory', 'quotes', 'profiles')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- 2. ENABLE RLS ON ALL TABLES (if not already enabled)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. CREATE ROBUST ROLE CHECK FUNCTION
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. CREATE NEW STRICT POLICIES (No public access, only authenticated)

-- CATEGORIES
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "categories_sales_select" ON public.categories FOR SELECT TO authenticated USING (public.get_my_role() = 'sales' AND is_active = true);

-- PRODUCTS
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "products_sales_select" ON public.products FOR SELECT TO authenticated USING (public.get_my_role() = 'sales' AND is_active = true);

-- PRODUCT_VARIANTS
CREATE POLICY "variants_admin_all" ON public.product_variants FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "variants_sales_select" ON public.product_variants FOR SELECT TO authenticated USING (
    public.get_my_role() = 'sales' AND 
    EXISTS (SELECT 1 FROM public.products WHERE products.id = product_variants.product_id AND products.is_active = true)
);

-- INVENTORY
CREATE POLICY "inventory_admin_all" ON public.inventory FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "inventory_sales_select" ON public.inventory FOR SELECT TO authenticated USING (public.get_my_role() = 'sales');

-- QUOTES
CREATE POLICY "quotes_admin_all" ON public.quotes FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
-- Add created_by column to quotes if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'created_by') THEN
        ALTER TABLE public.quotes ADD COLUMN created_by UUID REFERENCES auth.users(id) DEFAULT auth.uid();
    END IF;
END $$;
CREATE POLICY "quotes_sales_select" ON public.quotes FOR SELECT TO authenticated USING (public.get_my_role() = 'sales' AND created_by = auth.uid());
CREATE POLICY "quotes_sales_insert" ON public.quotes FOR INSERT TO authenticated WITH CHECK (public.get_my_role() = 'sales' AND created_by = auth.uid());
CREATE POLICY "quotes_sales_update" ON public.quotes FOR UPDATE TO authenticated USING (public.get_my_role() = 'sales' AND created_by = auth.uid());

-- PROFILES
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated USING (public.get_my_role() = 'admin') WITH CHECK (public.get_my_role() = 'admin');
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
-- allow insert for signup
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- 5. SMART STOCK AND RESERVATION LOGIC

-- Add reserved_stock column to inventory if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inventory' AND column_name = 'reserved_stock') THEN
        ALTER TABLE public.inventory ADD COLUMN reserved_stock NUMERIC(10,2) NOT NULL DEFAULT 0;
    END IF;
END $$;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trg_quote_status_change_inventory ON public.quotes;
DROP FUNCTION IF EXISTS public.handle_quote_status_change();

-- Function to handle quote status changes
CREATE OR REPLACE FUNCTION public.handle_quote_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    variant_option jsonb;
    inv_id uuid;
    req_amount numeric;
BEGIN
    -- Only act if status has changed
    IF (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
        RETURN NEW;
    END IF;

    -- Scenario 1: New Quote is created as 'pending' OR Status changes to 'pending'
    IF ((TG_OP = 'INSERT' AND NEW.status = 'pending') OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status != 'pending')) THEN
        -- Loop through configuration JSONB array
        FOR variant_option IN SELECT * FROM jsonb_array_elements(NEW.configuration)
        LOOP
            inv_id := (variant_option->>'inventory_id')::uuid;
            req_amount := COALESCE((variant_option->>'required_amount')::numeric, 1);
            
            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory 
                SET reserved_stock = reserved_stock + req_amount
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    -- Scenario 2: Quote becomes 'approved' from 'pending'
    IF (TG_OP = 'UPDATE' AND NEW.status = 'approved' AND OLD.status = 'pending') THEN
        FOR variant_option IN SELECT * FROM jsonb_array_elements(NEW.configuration)
        LOOP
            inv_id := (variant_option->>'inventory_id')::uuid;
            req_amount := COALESCE((variant_option->>'required_amount')::numeric, 1);
            
            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory 
                SET 
                    stock_level = stock_level - req_amount,
                    reserved_stock = reserved_stock - req_amount
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    -- Scenario 3: Quote becomes 'rejected' or 'cancelled' from 'pending'
    IF (TG_OP = 'UPDATE' AND NEW.status IN ('rejected', 'cancelled') AND OLD.status = 'pending') THEN
        FOR variant_option IN SELECT * FROM jsonb_array_elements(NEW.configuration)
        LOOP
            inv_id := (variant_option->>'inventory_id')::uuid;
            req_amount := COALESCE((variant_option->>'required_amount')::numeric, 1);
            
            IF inv_id IS NOT NULL THEN
                UPDATE public.inventory 
                SET reserved_stock = reserved_stock - req_amount
                WHERE id = inv_id;
            END IF;
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger on quotes
CREATE TRIGGER trg_quote_status_change_inventory
AFTER INSERT OR UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.handle_quote_status_change();
