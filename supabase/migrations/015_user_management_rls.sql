-- ═══════════════════════════════════════════════════════════════
-- Migration 015: Kullanıcı Yönetimi RLS Güncellemeleri
-- Admin kullanıcıların diğer profilleri yönetebilmesi için
-- ═══════════════════════════════════════════════════════════════

-- ─── Admin Profil Güncelleme Politikası ───
-- Mevcut politika: "Kendi profilini güncelleme" → Sadece auth.uid() = id
-- Yeni politika: Admin rolündeki kullanıcılar tüm profilleri güncelleyebilir
DO $$
BEGIN
  -- Eski update politikasını kaldır
  DROP POLICY IF EXISTS "Kendi profilini güncelleme" ON profiles;
  
  -- Yeni: Herkes kendi profilini VEYA admin herkesinki
  CREATE POLICY "Profil güncelleme (admin + self)" ON profiles
    FOR UPDATE USING (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );
    
  -- Admin profil silme yetkisi (CASCADE ile auth.users silindiğinde zaten silinir,
  -- ancak doğrudan profiles tablosundan silme için de politika ekliyoruz)
  DROP POLICY IF EXISTS "Admin profil silme" ON profiles;
  CREATE POLICY "Admin profil silme" ON profiles
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );

  -- Admin profil ekleme yetkisi (service_role bypass eder ama güvenlik katmanı olarak)
  DROP POLICY IF EXISTS "Admin profil ekleme" ON profiles;
  CREATE POLICY "Admin profil ekleme" ON profiles
    FOR INSERT WITH CHECK (
      auth.uid() = id
      OR EXISTS (
        SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      )
    );

  -- Eski insert politikasını güncelle
  DROP POLICY IF EXISTS "Kişilerin kendi profillerini ekleme" ON profiles;
END $$;
