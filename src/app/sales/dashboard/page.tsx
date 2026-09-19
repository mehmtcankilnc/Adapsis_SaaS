import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { DashboardQuoteRow } from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams;
  const rawErrorCode = params?.error;
  const errorCode = Array.isArray(rawErrorCode) ? rawErrorCode[0] : rawErrorCode;

  const supabase = await createClient()

  // Role kontrolü için profile çekiliyor
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user?.id).single()
  const role = profile?.role || 'sales'

  // Sadece son 30 günün verisini almak performansı artırır ancak MVP için tüm teklifleri çekiyoruz.
  // Metrikler (toplam/onay oranı/popüler ürün/potansiyel ciro) DashboardClient
  // içinde, seçilen zaman filtresine göre client-side hesaplanır.
  const { data: quotes } = await supabase
    .from('quotes')
    .select('id, status, created_at, final_price, currency, created_by, products(name)')
    .order('created_at', { ascending: false })

  // NOT: Supabase-js, generated Database tipleri olmadan `products(name)` gibi
  // ilişkileri (gerçek FK kardinalitesinden bağımsız olarak) her zaman dizi
  // türünde çıkarır. Ancak `quotes.product_id -> products.id` many-to-one bir
  // ilişki olduğundan PostgREST bunu çalışma zamanında TEKİL obje olarak
  // döndürür. Bu yüzden burada gerçek çalışma zamanı şekliyle eşleşen
  // DashboardQuoteRow tipine (products: {name} | null) `unknown` üzerinden
  // dönüştürüyoruz — `any` kullanmadan tip güvenliği sağlanır.
  let rawQuotes = (quotes || []) as unknown as DashboardQuoteRow[]

  // Admin görünümü: temsilci sıralaması (leaderboard) için profiles JOIN
  if (role === 'admin' && rawQuotes.length > 0) {
    const userIds = [...new Set(rawQuotes.map((q) => q.created_by).filter(Boolean))] as string[]
    if (userIds.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, p.full_name || 'Bilinmeyen'])
      )

      rawQuotes = rawQuotes.map((q) => ({
        ...q,
        creator_name: q.created_by ? (profileMap.get(q.created_by) || 'Bilinmeyen') : 'Sistem',
      }))
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
