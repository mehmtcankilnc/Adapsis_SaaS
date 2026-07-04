import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const errorCode = params?.error;

  const supabase = await createClient()

  // Role kontrolü için profile çekiliyor
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = profile?.role || 'sales'

  // Sadece son 30 günün verisini almak performansı artırır ancak MVP için tüm teklifleri çekiyoruz.
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('id, status, created_at, final_price, currency, products(name)')
    .order('created_at', { ascending: false })

  const rawQuotes = quotes || []

  // 1. Toplam Teklif Sayısı
  const totalCount = rawQuotes.length

  // 2. Bekleyen Ciro (Dövize Göre Gruplanmış)
  const pendingByCurrency: Record<string, number> = {}
  rawQuotes.forEach((q: any) => {
    if (q.status === 'pending') {
      const c = q.currency || 'USD'
      pendingByCurrency[c] = (pendingByCurrency[c] || 0) + Number(q.final_price)
    }
  })

  // 3. Onaylanma Oranı
  const acceptedCount = rawQuotes.filter(q => q.status === 'accepted').length
  const acceptanceRate = totalCount > 0 ? Math.round((acceptedCount / totalCount) * 100) : 0

  // 4. En Popüler Ürün
  const productCounts: Record<string, number> = {}
  rawQuotes.forEach((q: any) => {
    const pName = q.products?.name || 'Bilinmiyor'
    productCounts[pName] = (productCounts[pName] || 0) + 1
  })
  
  let popularProduct = 'Veri Yok'
  let maxCount = 0
  for (const [name, count] of Object.entries(productCounts)) {
    if (count > maxCount && name !== 'Bilinmiyor') {
      maxCount = count
      popularProduct = name
    }
  }

  return (
    <DashboardClient 
      rawQuotes={rawQuotes}
      role={role}
      error={errorCode}
    />
  )
}
