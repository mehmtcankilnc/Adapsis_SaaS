-- RLS'yi aç ve UPDATE yetkisini ekle
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Eğer RLS önceden varsa çakışmayı önlemek için siliyoruz
DROP POLICY IF EXISTS "Yetkili satıcılar teklifleri güncelleyebilir" ON quotes;
DROP POLICY IF EXISTS "Satıcılar teklif yaratabilir" ON quotes;
DROP POLICY IF EXISTS "Satıcılar tüm teklifleri okuyabilir" ON quotes;

-- Teklif RLS (Row Level Security) Yetkilendirmeleri
CREATE POLICY "Satıcılar tüm teklifleri okuyabilir" ON quotes FOR SELECT USING (true);
CREATE POLICY "Satıcılar teklif yaratabilir" ON quotes FOR INSERT WITH CHECK (true);
CREATE POLICY "Yetkili satıcılar teklifleri güncelleyebilir" ON quotes FOR UPDATE USING (true);
