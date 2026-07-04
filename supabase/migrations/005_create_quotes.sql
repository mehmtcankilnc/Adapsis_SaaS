CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    customer_company TEXT NOT NULL,
    customer_contact TEXT,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    base_price_snapshot NUMERIC(10,2) NOT NULL,
    final_price NUMERIC(10,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Satış personeli tablodu görebilmeli ve INSERT edebilmeli (Şimdilik geçici public)
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes teklif ekleyebilir" ON quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Herkes teklif okuyabilir" ON quotes FOR SELECT USING (true);
