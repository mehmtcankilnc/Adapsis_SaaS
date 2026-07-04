CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales')),
  full_name TEXT
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Güvenlik polikitaları
CREATE POLICY "Profilleri herkes görebilir" ON profiles FOR SELECT USING (true);
CREATE POLICY "Kişilerin kendi profillerini ekleme" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Kendi profilini güncelleme" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Yeni kullanıcı kaydedildiğinde otomatik profil oluşturan Trigger (App Router Supabase mantığı)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'role', 'sales') -- Eğer atanmadıysa default sales
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı auth.users tablosu dinlemesi için bağlama
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
