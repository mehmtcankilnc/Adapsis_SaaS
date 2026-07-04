import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)

const supabaseUrl = urlMatch ? urlMatch[1] : ''
const supabaseKey = keyMatch ? keyMatch[1] : ''

if (!supabaseUrl || !supabaseKey) {
  console.error("HATA: .env.local dosyasından Supabase erişim anahtarları okunamadı!")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdmin() {
  console.log("Adapsis Admin kullanıcısı veritabanına ekleniyor...")
  
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@adapsis.com',
    password: 'password123',
    options: {
      data: {
        full_name: 'Adapsis Yönetim',
        role: 'admin'
      }
    }
  })

  if (error) {
    console.error("Kayıt Başarısız: ", error.message)
  } else {
    console.log("BAŞARILI! Yönetici hesabı oluşturuldu.")
    console.log("------------------------------------------")
    console.log("Email : admin@adapsis.com")
    console.log("Şifre : password123")
    console.log("------------------------------------------")
    console.log("Tarayıcınızdan http://localhost:3000/login sayfasına giderek bu bilgilerle giriş yapabilirsiniz.")
  }
}

createAdmin()
