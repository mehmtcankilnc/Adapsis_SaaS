-- ============================================================
-- LEVEL 2: system_requests, discount workflow, visibility
-- ============================================================

-- 1. system_requests tablosu
CREATE TABLE IF NOT EXISTS system_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_type VARCHAR(50) CHECK (request_type IN ('product', 'inventory')) NOT NULL,
    item_id UUID NOT NULL,
    item_name TEXT, -- Kolay referans için
    requested_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    request_note TEXT NOT NULL,
    admin_response TEXT, -- Admin cevap/açıklama
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE system_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales can insert their own requests" ON system_requests FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "Sales can view their own requests" ON system_requests FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "Admins can view all requests" ON system_requests FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
CREATE POLICY "Admins can update requests" ON system_requests FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 2. quotes tablosuna yeni kolonlar
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS discount_percentage NUMERIC(5,2) DEFAULT 0;
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 3. Quotes RLS Güncelleme
DROP POLICY IF EXISTS "Satıcılar tüm teklifleri okuyabilir" ON quotes;
DROP POLICY IF EXISTS "Herkes teklif okuyabilir" ON quotes;
DROP POLICY IF EXISTS "Yetkili satıcılar teklifleri güncelleyebilir" ON quotes;
DROP POLICY IF EXISTS "Satıcılar teklif yaratabilir" ON quotes;
DROP POLICY IF EXISTS "Herkes teklif ekleyebilir" ON quotes;

CREATE POLICY "Adminler tüm teklifleri okuyabilir" ON quotes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
CREATE POLICY "Satıcılar kendi tekliflerini okuyabilir" ON quotes FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY "Kullanıcılar kendi tekliflerini yaratabilir" ON quotes FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Kullanıcılar kendi tekliflerini güncelleyebilir" ON quotes FOR UPDATE USING (auth.uid() = created_by OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));
