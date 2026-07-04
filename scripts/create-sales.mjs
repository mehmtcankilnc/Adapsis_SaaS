import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf-8')
const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=([^\r\n]+)/)
const keyMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=([^\r\n]+)/)

const supabaseUrl = urlMatch ? urlMatch[1] : ''
const supabaseKey = keyMatch ? keyMatch[1] : ''

if (!supabaseUrl || !supabaseKey) {
  console.error("HATA: .env.local dosyasından anahtarlar okunamadı!")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createSalesUser() {
  console.log("Satış (Sales) personeli hesabı oluşturuluyor...")
  
  const { data, error } = await supabase.auth.signUp({
    email: 'satis@adapsis.com',
    password: 'password123',
    options: {
      data: {
        full_name: 'Adapsis Satış Uzmanı',
        role: 'sales'
      }
    }
  })

  if (error) {
    console.error("Kayıt Başarısız: ", error.message)
  } else {
    console.log("BAŞARILI! Satış personeli yetkilisi oluşturuldu.")
    console.log("Email : satis@adapsis.com")
    console.log("Şifre : password123")
    console.log("Rol : sales")
  }
}

createSalesUser()
