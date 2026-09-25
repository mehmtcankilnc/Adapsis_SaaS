import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'
import type { DashboardActivityRow, DashboardQuoteRow, DashboardTaskRow, RepQuotaRow } from './DashboardClient'
import { listRepsQuotaAction } from '@/actions/quota.actions'
import { dictionary } from '@/lib/i18n/dictionary'

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
    .select('id, status, created_at, accepted_at, final_price, currency, created_by, customer_id, customers(company_name), products(name)')
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
        (profilesData || []).map((p) => [p.id, p.full_name || dictionary.tr["sales.dashboard.unknownRep"]])
      )

      rawQuotes = rawQuotes.map((q) => ({
        ...q,
        creator_name: q.created_by ? (profileMap.get(q.created_by) || dictionary.tr["sales.dashboard.unknownRep"]) : dictionary.tr["sales.quotes.creatorFallbackSystem"],
      }))
    }
  }

  // Kişisel kota/komisyon paneli — giriş yapan temsilcinin bu ayki hedefi ve
  // komisyon oranı (RLS zaten kendi profiles/sales_targets satırıyla sınırlar).
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1)
  const periodMonth = firstOfMonth.toISOString().split('T')[0]

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('commission_rate')
    .eq('id', user?.id)
    .single()
  const { data: myTargetRow } = await supabase
    .from('sales_targets')
    .select('target_amount, target_currency')
    .eq('profile_id', user?.id)
    .eq('period_month', periodMonth)
    .maybeSingle()

  // Admin görünümü: tüm temsilcilerin bu ayki kota gerçekleşmesi
  let repsQuota: RepQuotaRow[] = []
  // İlk kullanım onboarding checklist'i için: ürün/müşteri/satış kullanıcısı
  // sayıları (sadece admin'e gösterilir, 3 adımın 2'si admin-only olduğundan).
  let onboarding: { productCount: number; customerCount: number; salesUserCount: number } | undefined
  if (role === 'admin') {
    const quotaResult = await listRepsQuotaAction()
    if (quotaResult.success) {
      repsQuota = quotaResult.reps as RepQuotaRow[]
    }

    const [{ count: productCount }, { count: customerCount }, { count: salesUserCount }] = await Promise.all([
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'sales'),
    ])
    onboarding = {
      productCount: productCount || 0,
      customerCount: customerCount || 0,
      salesUserCount: salesUserCount || 0,
    }
  }

  // Aktivite Geçmişi widget'ı — görünürlük RLS ile sınırlı (sales kendi/
  // atanmamış müşterilerini, admin hepsini görür), ekstra filtre gerekmez.
  const { data: activitiesData } = await supabase
    .from('activities')
    .select('id, type, subject, activity_date, customer_id, customers(company_name)')
    .order('activity_date', { ascending: false })
    .limit(8)
  const recentActivities = (activitiesData || []) as unknown as DashboardActivityRow[]

  // Bugünün Görevleri widget'ı — bugüne kadar (bugün dahil) vadesi gelmiş,
  // henüz tamamlanmamış görevler. Görünürlük RLS ile sınırlı: sales kendine
  // atanan/kendi müşterisine ait görevleri, admin hepsini görür.
  const endOfToday = new Date()
  endOfToday.setHours(23, 59, 59, 999)
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('id, title, due_date, status, assigned_to, customer_id, customers(company_name)')
    .eq('status', 'pending')
    .lte('due_date', endOfToday.toISOString())
    .order('due_date', { ascending: true })
    .limit(8)
  let dueTasks = (tasksData || []) as unknown as DashboardTaskRow[]

  if (dueTasks.length > 0) {
    const assigneeIds = [...new Set(dueTasks.map((t) => t.assigned_to).filter(Boolean))] as string[]
    if (assigneeIds.length > 0) {
      const { data: assigneeProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', assigneeIds)
      const assigneeMap = new Map(
        (assigneeProfiles || []).map((p) => [p.id, p.full_name || dictionary.tr["sales.dashboard.unknownRep"]])
      )
      dueTasks = dueTasks.map((t) => ({
        ...t,
        assignee_name: t.assigned_to ? (assigneeMap.get(t.assigned_to) || dictionary.tr["sales.dashboard.unknownRep"]) : undefined,
      }))
    }
  }

  return (
    <DashboardClient
      rawQuotes={rawQuotes}
      recentActivities={recentActivities}
      dueTasks={dueTasks}
      role={role}
      error={errorCode}
      commissionRate={myProfile?.commission_rate || 0}
      myTarget={myTargetRow ? { target_amount: Number(myTargetRow.target_amount), target_currency: myTargetRow.target_currency } : null}
      repsQuota={repsQuota}
      onboarding={onboarding}
      userId={user?.id || ''}
    />
  )
}
