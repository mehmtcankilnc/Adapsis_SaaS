CREATE TABLE IF NOT EXISTS inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    stock_level NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit VARCHAR(20) NOT NULL DEFAULT 'adet',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Herkes envanteri görebilir" ON inventory FOR SELECT USING (true);
CREATE POLICY "Adminler envanteri yönetebilir" ON inventory FOR ALL USING (true);

-- Örnek Ham Madde / Stok Kalemleri
INSERT INTO inventory (item_name, sku, stock_level, unit) VALUES
('Çelik Kasa Tip A', 'ST-CS-A', 50, 'adet'),
('Yüksek Akım Trafosu 50MVA', 'TR-50M', 2, 'adet'),
('Endüstriyel Boya (Mavi)', 'PNT-IND-BLU', 150.5, 'kg'),
('Bakır Kablo 3x150', 'CBL-CU-3X150', 500, 'metre');
